import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrganizationStatus } from '@prisma/client';
import {
  getAccessibleOrganizationIds,
  hasPlatformAccess,
} from '../auth/auth-scope.util';
import type { UserContext } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationStatusDto } from './dto/update-organization-status.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

const ORGANIZATION_STATUS_MAP: Record<
  UpdateOrganizationStatusDto['status'],
  OrganizationStatus
> = {
  pending: OrganizationStatus.PENDING,
  active: OrganizationStatus.ACTIVE,
  rejected: OrganizationStatus.REJECTED,
  disabled: OrganizationStatus.DISABLED,
};

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async listOrganizations(actor: UserContext) {
    return this.prismaService.organization.findMany({
      where: this.organizationReadWhere(actor),
      orderBy: {
        createdAt: 'desc',
      },
      select: this.organizationSelect(),
    });
  }

  async getOrganization(id: string, actor: UserContext) {
    const organization = await this.prismaService.organization.findFirst({
      where: this.organizationDetailWhere(id, actor),
      select: this.organizationSelect(),
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  async listOrganizationPractices(id: string, actor: UserContext) {
    await this.ensureOrganizationReadable(id, actor);

    return this.prismaService.practice.findMany({
      where: {
        organizationId: id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        _count: {
          select: {
            providers: true,
          },
        },
      },
    });
  }

  async listOrganizationUsers(id: string, actor: UserContext) {
    await this.ensureOrganizationReadable(id, actor);

    return this.prismaService.profile.findMany({
      where: {
        roleAssignments: {
          some: {
            organizationId: id,
            revokedAt: null,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: this.organizationUserSelect(),
    });
  }

  private organizationReadWhere(actor: UserContext) {
    if (hasPlatformAccess(actor)) {
      return {};
    }

    return {
      id: {
        in: getAccessibleOrganizationIds(actor),
      },
    };
  }

  private organizationDetailWhere(id: string, actor: UserContext) {
    return {
      AND: [
        {
          id,
        },
        this.organizationReadWhere(actor),
      ],
    };
  }

  async createOrganization(input: CreateOrganizationDto, actor: UserContext) {
    const organization = await this.prismaService.organization.create({
      data: {
        name: input.name,
        type: input.type,
        website: input.website,
        contactEmail: input.contactEmail.toLowerCase(),
        contactNumber: input.contactNumber,
        status: OrganizationStatus.ACTIVE,
        address: input.address,
        companyBio: input.companyBio,
        startedYear: input.startedYear,
        createdById: actor.profileId,
      },
      select: this.organizationSelect(),
    });

    await this.auditService.record({
      actorProfileId: actor.profileId,
      action: 'organization.created',
      targetType: 'organization',
      targetId: organization.id,
      organizationId: organization.id,
      metadata: {
        name: organization.name,
        type: organization.type,
      },
    });

    return organization;
  }

  async updateOrganization(
    id: string,
    input: UpdateOrganizationDto,
    actor: UserContext,
  ) {
    await this.ensureOrganizationExists(id);

    const organization = await this.prismaService.organization.update({
      where: { id },
      data: this.removeUndefined({
        name: input.name,
        type: input.type,
        website: input.website,
        contactEmail: input.contactEmail?.toLowerCase(),
        contactNumber: input.contactNumber,
        address: input.address,
        companyBio: input.companyBio,
        startedYear: input.startedYear,
      }),
      select: this.organizationSelect(),
    });

    await this.auditService.record({
      actorProfileId: actor.profileId,
      action: 'organization.updated',
      targetType: 'organization',
      targetId: organization.id,
      organizationId: organization.id,
      metadata: {
        updatedFields: Object.keys({
          ...this.removeUndefined({
            name: input.name,
            type: input.type,
            website: input.website,
            contactEmail: input.contactEmail,
            contactNumber: input.contactNumber,
            address: input.address,
            companyBio: input.companyBio,
            startedYear: input.startedYear,
          }),
        }),
      },
    });

    return organization;
  }

  async updateOrganizationStatus(
    id: string,
    input: UpdateOrganizationStatusDto,
    actor: UserContext,
  ) {
    const existingOrganization = await this.ensureOrganizationExists(id);
    const nextStatus = ORGANIZATION_STATUS_MAP[input.status];

    if (existingOrganization.status === nextStatus) {
      throw new BadRequestException('Organization already has this status');
    }

    const organization = await this.prismaService.organization.update({
      where: { id },
      data: {
        status: nextStatus,
      },
      select: this.organizationSelect(),
    });

    await this.auditService.record({
      actorProfileId: actor.profileId,
      action: 'organization.statusChanged',
      targetType: 'organization',
      targetId: organization.id,
      organizationId: organization.id,
      metadata: {
        previousStatus: existingOrganization.status,
        nextStatus,
        reason: input.reason,
      },
    });

    return organization;
  }

  private async ensureOrganizationExists(id: string) {
    const organization = await this.prismaService.organization.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  private async ensureOrganizationReadable(id: string, actor: UserContext) {
    const organization = await this.prismaService.organization.findFirst({
      where: this.organizationDetailWhere(id, actor),
      select: {
        id: true,
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }
  }

  private removeUndefined<T extends Record<string, unknown>>(
    input: T,
  ): Partial<T> {
    return Object.fromEntries(
      Object.entries(input).filter(([, value]) => value !== undefined),
    ) as Partial<T>;
  }

  private organizationSelect() {
    return {
      id: true,
      name: true,
      type: true,
      website: true,
      contactEmail: true,
      contactNumber: true,
      status: true,
      address: true,
      companyBio: true,
      startedYear: true,
      createdAt: true,
      updatedAt: true,
      createdBy: {
        select: {
          id: true,
          email: true,
        },
      },
      _count: {
        select: {
          practices: true,
          providers: true,
          roleAssignments: true,
        },
      },
    };
  }

  private organizationUserSelect() {
    return {
      id: true,
      authUserId: true,
      email: true,
      firstName: true,
      lastName: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      roleAssignments: {
        where: {
          revokedAt: null,
        },
        select: {
          id: true,
          scopeType: true,
          scopeId: true,
          organizationId: true,
          createdAt: true,
          role: {
            select: {
              name: true,
              displayName: true,
            },
          },
        },
      },
    };
  }
}
