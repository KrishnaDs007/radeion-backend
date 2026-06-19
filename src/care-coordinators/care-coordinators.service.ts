import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import {
  getAccessibleOrganizationIds,
  hasPlatformAccess,
} from '../auth/auth-scope.util';
import type { UserContext } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCareCoordinatorAssignmentDto } from './dto/create-care-coordinator-assignment.dto';
import { RevokeCareCoordinatorAssignmentDto } from './dto/revoke-care-coordinator-assignment.dto';

type CsvColumn<T> = {
  header: string;
  value: (record: T) => unknown;
};

@Injectable()
export class CareCoordinatorsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async listAssignments(actor: UserContext) {
    return this.prismaService.careCoordinatorAssignment.findMany({
      where: {
        revokedAt: null,
        ...this.organizationScopedWhere(actor),
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: this.assignmentSelect(),
    });
  }

  async exportAssignments(actor: UserContext) {
    const assignments =
      await this.prismaService.careCoordinatorAssignment.findMany({
        where: {
          revokedAt: null,
          ...this.organizationScopedWhere(actor),
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: this.assignmentSelect(),
      });

    return this.toCsv(assignments, [
      { header: 'id', value: (assignment) => assignment.id },
      {
        header: 'organizationId',
        value: (assignment) => assignment.organizationId,
      },
      {
        header: 'organizationName',
        value: (assignment) => assignment.organization.name,
      },
      { header: 'practiceId', value: (assignment) => assignment.practiceId },
      {
        header: 'practiceName',
        value: (assignment) => assignment.practice?.name,
      },
      { header: 'providerId', value: (assignment) => assignment.providerId },
      {
        header: 'providerName',
        value: (assignment) => assignment.provider?.name,
      },
      {
        header: 'providerNpi',
        value: (assignment) => assignment.provider?.npi,
      },
      { header: 'profileId', value: (assignment) => assignment.profile.id },
      {
        header: 'profileEmail',
        value: (assignment) => assignment.profile.email,
      },
      {
        header: 'profileName',
        value: (assignment) =>
          [assignment.profile.firstName, assignment.profile.lastName]
            .filter(Boolean)
            .join(' '),
      },
      {
        header: 'assignedByEmail',
        value: (assignment) => assignment.assignedBy?.email,
      },
      { header: 'createdAt', value: (assignment) => assignment.createdAt },
      { header: 'revokedAt', value: (assignment) => assignment.revokedAt },
    ]);
  }

  async listOrganizationAssignments(
    organizationId: string,
    actor: UserContext,
  ) {
    await this.ensureOrganizationReadable(organizationId, actor);

    return this.prismaService.careCoordinatorAssignment.findMany({
      where: {
        revokedAt: null,
        organizationId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: this.assignmentSelect(),
    });
  }

  async listPracticeAssignments(practiceId: string, actor: UserContext) {
    await this.ensurePracticeReadable(practiceId, actor);

    return this.prismaService.careCoordinatorAssignment.findMany({
      where: {
        revokedAt: null,
        practiceId,
        ...this.organizationScopedWhere(actor),
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: this.assignmentSelect(),
    });
  }

  async listProviderAssignments(providerId: string, actor: UserContext) {
    await this.ensureProviderReadable(providerId, actor);

    return this.prismaService.careCoordinatorAssignment.findMany({
      where: {
        revokedAt: null,
        providerId,
        ...this.organizationScopedWhere(actor),
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: this.assignmentSelect(),
    });
  }

  async createAssignment(
    input: CreateCareCoordinatorAssignmentDto,
    actor: UserContext,
  ) {
    await this.validateAssignmentInput(input);

    const existingAssignment =
      await this.prismaService.careCoordinatorAssignment.findFirst({
        where: {
          profileId: input.profileId,
          organizationId: input.organizationId,
          practiceId: input.practiceId,
          providerId: input.providerId,
          revokedAt: null,
        },
        select: this.assignmentSelect(),
      });

    if (existingAssignment) {
      return existingAssignment;
    }

    const assignment =
      await this.prismaService.careCoordinatorAssignment.create({
        data: {
          profileId: input.profileId,
          organizationId: input.organizationId,
          practiceId: input.practiceId,
          providerId: input.providerId,
          assignedById: actor.profileId,
        },
        select: this.assignmentSelect(),
      });

    await this.auditService.record({
      actorProfileId: actor.profileId,
      action: 'careCoordinator.assigned',
      targetType: 'careCoordinatorAssignment',
      targetId: assignment.id,
      organizationId: assignment.organizationId,
      metadata: {
        profileId: input.profileId,
        practiceId: input.practiceId,
        providerId: input.providerId,
      },
    });

    return assignment;
  }

  async revokeAssignment(
    id: string,
    input: RevokeCareCoordinatorAssignmentDto,
    actor: UserContext,
  ) {
    const assignment =
      await this.prismaService.careCoordinatorAssignment.findUnique({
        where: { id },
        select: {
          id: true,
          profileId: true,
          organizationId: true,
          practiceId: true,
          providerId: true,
          revokedAt: true,
        },
      });

    if (!assignment) {
      throw new NotFoundException('Care coordinator assignment not found');
    }

    if (assignment.revokedAt) {
      throw new BadRequestException(
        'Care coordinator assignment is already revoked',
      );
    }

    const revokedAssignment =
      await this.prismaService.careCoordinatorAssignment.update({
        where: { id },
        data: {
          revokedAt: new Date(),
        },
        select: this.assignmentSelect(),
      });

    await this.auditService.record({
      actorProfileId: actor.profileId,
      action: 'careCoordinator.revoked',
      targetType: 'careCoordinatorAssignment',
      targetId: assignment.id,
      organizationId: assignment.organizationId,
      metadata: {
        profileId: assignment.profileId,
        practiceId: assignment.practiceId,
        providerId: assignment.providerId,
        reason: input.reason,
      },
    });

    return revokedAssignment;
  }

  private async validateAssignmentInput(
    input: CreateCareCoordinatorAssignmentDto,
  ) {
    const profile = await this.prismaService.profile.findUnique({
      where: { id: input.profileId },
      select: {
        id: true,
        roleAssignments: {
          where: {
            revokedAt: null,
            role: {
              name: RoleName.CARE_COORDINATOR,
            },
          },
          select: {
            id: true,
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Care coordinator profile not found');
    }

    if (profile.roleAssignments.length === 0) {
      throw new BadRequestException(
        'Profile must have an active care coordinator role',
      );
    }

    const organization = await this.prismaService.organization.findUnique({
      where: { id: input.organizationId },
      select: {
        id: true,
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    if (input.practiceId) {
      await this.validatePractice(input.practiceId, input.organizationId);
    }

    if (input.providerId) {
      await this.validateProvider(
        input.providerId,
        input.organizationId,
        input.practiceId,
      );
    }
  }

  private organizationScopedWhere(actor: UserContext) {
    if (hasPlatformAccess(actor)) {
      return {};
    }

    return {
      organizationId: {
        in: getAccessibleOrganizationIds(actor),
      },
    };
  }

  private async validatePractice(practiceId: string, organizationId: string) {
    const practice = await this.prismaService.practice.findFirst({
      where: {
        id: practiceId,
        organizationId,
      },
      select: {
        id: true,
      },
    });

    if (!practice) {
      throw new BadRequestException(
        'Practice does not belong to the organization',
      );
    }
  }

  private async ensureOrganizationReadable(
    organizationId: string,
    actor: UserContext,
  ) {
    const organization = await this.prismaService.organization.findFirst({
      where: {
        AND: [{ id: organizationId }, this.organizationReadWhere(actor)],
      },
      select: {
        id: true,
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }
  }

  private async ensurePracticeReadable(practiceId: string, actor: UserContext) {
    const practice = await this.prismaService.practice.findFirst({
      where: {
        AND: [{ id: practiceId }, this.organizationScopedWhere(actor)],
      },
      select: {
        id: true,
      },
    });

    if (!practice) {
      throw new NotFoundException('Practice not found');
    }
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

  private async ensureProviderReadable(providerId: string, actor: UserContext) {
    const provider = await this.prismaService.provider.findFirst({
      where: {
        AND: [{ id: providerId }, this.organizationScopedWhere(actor)],
      },
      select: {
        id: true,
      },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }
  }

  private async validateProvider(
    providerId: string,
    organizationId: string,
    practiceId?: string,
  ) {
    const provider = await this.prismaService.provider.findFirst({
      where: {
        id: providerId,
        organizationId,
      },
      select: {
        id: true,
        practiceId: true,
      },
    });

    if (!provider) {
      throw new BadRequestException(
        'Provider does not belong to the organization',
      );
    }

    if (practiceId && provider.practiceId !== practiceId) {
      throw new BadRequestException(
        'Provider does not belong to the selected practice',
      );
    }
  }

  private assignmentSelect() {
    return {
      id: true,
      organizationId: true,
      practiceId: true,
      providerId: true,
      createdAt: true,
      revokedAt: true,
      profile: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
      organization: {
        select: {
          id: true,
          name: true,
        },
      },
      practice: {
        select: {
          id: true,
          name: true,
        },
      },
      provider: {
        select: {
          id: true,
          name: true,
          npi: true,
        },
      },
      assignedBy: {
        select: {
          id: true,
          email: true,
        },
      },
    };
  }

  private toCsv<T>(records: T[], columns: CsvColumn<T>[]): string {
    const header = columns.map((column) => this.escapeCsv(column.header));
    const rows = records.map((record) =>
      columns.map((column) => this.serializeCsvValue(column.value(record))),
    );

    return [header, ...rows].map((row) => row.join(',')).join('\n');
  }

  private serializeCsvValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (value instanceof Date) {
      return this.escapeCsv(value.toISOString());
    }

    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      typeof value === 'bigint'
    ) {
      return this.escapeCsv(String(value));
    }

    return this.escapeCsv(JSON.stringify(value));
  }

  private escapeCsv(value: string): string {
    if (!/[",\n\r]/.test(value)) {
      return value;
    }

    return `"${value.replace(/"/g, '""')}"`;
  }
}
