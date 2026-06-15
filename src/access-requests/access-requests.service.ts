import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrganizationStatus,
  Prisma,
  RequestStatus,
  RoleName,
  ScopeType,
  UserStatus,
} from '@prisma/client';
import { UserContext } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { ApproveOrganizationRequestDto } from './dto/approve-organization-request.dto';
import { ApproveUserRequestDto } from './dto/approve-user-request.dto';
import { CreateOrganizationAccessRequestDto } from './dto/create-organization-access-request.dto';
import { CreateUserAccessRequestDto } from './dto/create-user-access-request.dto';
import { RejectAccessRequestDto } from './dto/reject-access-request.dto';

const REQUESTED_ROLE_MAP: Record<string, RoleName> = {
  provider: RoleName.PROVIDER,
  practice: RoleName.PRACTICE,
  careCoordinator: RoleName.CARE_COORDINATOR,
  acoAdmin: RoleName.ACO_ADMIN,
  clientAdmin: RoleName.CLIENT_ADMIN,
  superAdmin: RoleName.SUPER_ADMIN,
  developer: RoleName.DEVELOPER,
};

const REQUESTED_SCOPE_MAP: Record<string, ScopeType> = {
  global: ScopeType.GLOBAL,
  organization: ScopeType.ORGANIZATION,
  aco: ScopeType.ACO,
  practice: ScopeType.PRACTICE,
  provider: ScopeType.PROVIDER,
};

const RETRYABLE_REQUEST_STATUSES = new Set<RequestStatus>([
  RequestStatus.REJECTED,
  RequestStatus.DECLINED,
  RequestStatus.FAILED,
]);

@Injectable()
export class AccessRequestsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async createUserRequest(input: CreateUserAccessRequestDto) {
    return this.prismaService.userApprovalRequest.create({
      data: {
        authUserId: input.authUserId,
        email: input.email.toLowerCase(),
        organizationId: input.organizationId,
        requestedRoles: input.requestedRoles,
        requestedScope: input.requestedScope as Prisma.InputJsonValue,
      },
      select: {
        id: true,
        email: true,
        organizationId: true,
        requestedRoles: true,
        requestedScope: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async createOrganizationRequest(input: CreateOrganizationAccessRequestDto) {
    return this.prismaService.organizationApprovalRequest.create({
      data: {
        organizationName: input.organizationName,
        requestedByEmail: input.requestedByEmail.toLowerCase(),
        requestedByAuthUserId: input.requestedByAuthUserId,
        requestedPayload: this.buildOrganizationPayload(input),
      },
      select: {
        id: true,
        organizationName: true,
        requestedByEmail: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async retryUserRequest(id: string, input: CreateUserAccessRequestDto) {
    const request = await this.prismaService.userApprovalRequest.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        status: true,
      },
    });

    if (!request) {
      throw new NotFoundException('User approval request not found');
    }

    this.ensureRetryableRequest(request.status, 'User request');

    if (request.email !== input.email.toLowerCase()) {
      throw new BadRequestException('Retry email must match original request');
    }

    return this.prismaService.userApprovalRequest.update({
      where: { id },
      data: {
        authUserId: input.authUserId,
        organizationId: input.organizationId,
        requestedRoles: input.requestedRoles,
        requestedScope: input.requestedScope as Prisma.InputJsonValue,
        status: RequestStatus.PENDING,
        reviewedById: null,
        reviewedAt: null,
        reviewNotes: null,
      },
      select: {
        id: true,
        email: true,
        organizationId: true,
        requestedRoles: true,
        requestedScope: true,
        status: true,
        updatedAt: true,
      },
    });
  }

  async retryOrganizationRequest(
    id: string,
    input: CreateOrganizationAccessRequestDto,
  ) {
    const request =
      await this.prismaService.organizationApprovalRequest.findUnique({
        where: { id },
        select: {
          id: true,
          requestedByEmail: true,
          status: true,
        },
      });

    if (!request) {
      throw new NotFoundException('Organization approval request not found');
    }

    this.ensureRetryableRequest(request.status, 'Organization request');

    if (request.requestedByEmail !== input.requestedByEmail.toLowerCase()) {
      throw new BadRequestException('Retry email must match original request');
    }

    return this.prismaService.organizationApprovalRequest.update({
      where: { id },
      data: {
        organizationName: input.organizationName,
        requestedByAuthUserId: input.requestedByAuthUserId,
        requestedPayload: this.buildOrganizationPayload(input),
        status: RequestStatus.PENDING,
        reviewedById: null,
        reviewedAt: null,
        reviewNotes: null,
      },
      select: {
        id: true,
        organizationName: true,
        requestedByEmail: true,
        status: true,
        updatedAt: true,
      },
    });
  }

  async approveOrganizationRequest(
    id: string,
    input: ApproveOrganizationRequestDto,
    actor: UserContext,
  ) {
    const request =
      await this.prismaService.organizationApprovalRequest.findUnique({
        where: { id },
      });

    if (!request) {
      throw new NotFoundException('Organization approval request not found');
    }

    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException('Organization request is not pending');
    }

    const payload = request.requestedPayload as Record<string, unknown>;
    const organizationType =
      input.type ?? this.getPayloadString(payload, 'type') ?? 'client';
    const contactEmail =
      input.contactEmail?.toLowerCase() ??
      this.getPayloadString(payload, 'contactEmail') ??
      request.requestedByEmail;

    const organization = await this.prismaService.organization.create({
      data: {
        name: input.name ?? request.organizationName,
        type: organizationType,
        website: input.website ?? this.getPayloadString(payload, 'website'),
        contactEmail,
        contactNumber:
          input.contactNumber ??
          this.getPayloadString(payload, 'contactNumber'),
        status: OrganizationStatus.ACTIVE,
        address: input.address ?? this.getPayloadString(payload, 'address'),
        companyBio:
          input.companyBio ?? this.getPayloadString(payload, 'companyBio'),
        startedYear:
          input.startedYear ?? this.getPayloadNumber(payload, 'startedYear'),
        createdById: actor.profileId,
      },
    });

    await this.prismaService.organizationApprovalRequest.update({
      where: { id },
      data: {
        status: RequestStatus.APPROVED,
        reviewedById: actor.profileId,
        reviewedAt: new Date(),
      },
    });

    await this.auditService.record({
      actorProfileId: actor.profileId,
      action: 'organization.approved',
      targetType: 'organization',
      targetId: organization.id,
      organizationId: organization.id,
      metadata: {
        requestId: request.id,
      },
    });

    return organization;
  }

  async approveUserRequest(
    id: string,
    input: ApproveUserRequestDto,
    actor: UserContext,
  ) {
    const request = await this.prismaService.userApprovalRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('User approval request not found');
    }

    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException('User request is not pending');
    }

    const authUserId = input.authUserId ?? request.authUserId;

    if (!authUserId) {
      throw new BadRequestException(
        'A verified Supabase auth user id is required',
      );
    }

    const profile = await this.prismaService.profile.upsert({
      where: {
        authUserId,
      },
      update: {
        email: request.email,
        status: UserStatus.ACTIVE,
      },
      create: {
        authUserId,
        email: request.email,
        status: UserStatus.ACTIVE,
      },
    });

    const requestedRoles = this.getRequestedRoles(request.requestedRoles);
    const requestedScope = request.requestedScope as Record<string, unknown>;

    for (const roleName of requestedRoles) {
      const role = await this.prismaService.role.findUnique({
        where: {
          name: roleName,
        },
      });

      if (!role) {
        continue;
      }

      const scopeType = this.getScopeType(requestedScope);
      const scopeId = this.getPayloadString(requestedScope, 'id');
      const organizationId =
        request.organizationId ??
        this.getPayloadString(requestedScope, 'organizationId');

      const existingAssignment =
        await this.prismaService.userRoleAssignment.findFirst({
          where: {
            profileId: profile.id,
            roleId: role.id,
            scopeType,
            scopeId,
            organizationId,
            revokedAt: null,
          },
        });

      if (!existingAssignment) {
        await this.prismaService.userRoleAssignment.create({
          data: {
            profileId: profile.id,
            roleId: role.id,
            scopeType,
            scopeId,
            organizationId,
            assignedById: actor.profileId,
          },
        });
      }
    }

    await this.prismaService.userApprovalRequest.update({
      where: { id },
      data: {
        status: RequestStatus.APPROVED,
        reviewedById: actor.profileId,
        reviewedAt: new Date(),
      },
    });

    await this.auditService.record({
      actorProfileId: actor.profileId,
      action: 'user.approved',
      targetType: 'user',
      targetId: profile.id,
      organizationId: request.organizationId ?? undefined,
      metadata: {
        requestId: request.id,
        requestedRoles,
      },
    });

    return profile;
  }

  async rejectOrganizationRequest(
    id: string,
    input: RejectAccessRequestDto,
    actor: UserContext,
  ) {
    const request =
      await this.prismaService.organizationApprovalRequest.findUnique({
        where: { id },
      });

    if (!request) {
      throw new NotFoundException('Organization approval request not found');
    }

    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException('Organization request is not pending');
    }

    const updatedRequest =
      await this.prismaService.organizationApprovalRequest.update({
        where: { id },
        data: {
          status: RequestStatus.REJECTED,
          reviewedById: actor.profileId,
          reviewedAt: new Date(),
          reviewNotes: input.reviewNotes,
        },
        select: {
          id: true,
          organizationName: true,
          requestedByEmail: true,
          status: true,
          reviewedAt: true,
          reviewNotes: true,
        },
      });

    await this.auditService.record({
      actorProfileId: actor.profileId,
      action: 'organization.rejected',
      targetType: 'organization',
      metadata: {
        requestId: request.id,
        organizationName: request.organizationName,
        reviewNotes: input.reviewNotes,
      },
    });

    return updatedRequest;
  }

  async rejectUserRequest(
    id: string,
    input: RejectAccessRequestDto,
    actor: UserContext,
  ) {
    const request = await this.prismaService.userApprovalRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('User approval request not found');
    }

    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException('User request is not pending');
    }

    const updatedRequest = await this.prismaService.userApprovalRequest.update({
      where: { id },
      data: {
        status: RequestStatus.REJECTED,
        reviewedById: actor.profileId,
        reviewedAt: new Date(),
        reviewNotes: input.reviewNotes,
      },
      select: {
        id: true,
        email: true,
        organizationId: true,
        status: true,
        reviewedAt: true,
        reviewNotes: true,
      },
    });

    await this.auditService.record({
      actorProfileId: actor.profileId,
      action: 'user.rejected',
      targetType: 'user',
      organizationId: request.organizationId ?? undefined,
      metadata: {
        requestId: request.id,
        email: request.email,
        reviewNotes: input.reviewNotes,
      },
    });

    return updatedRequest;
  }

  private buildOrganizationPayload(
    input: CreateOrganizationAccessRequestDto,
  ): Prisma.InputJsonValue {
    const payload: Record<string, Prisma.InputJsonValue | undefined> = {
      type: input.type,
      website: input.website,
      contactEmail: input.contactEmail.toLowerCase(),
      contactNumber: input.contactNumber,
      address: input.address,
      companyBio: input.companyBio,
      startedYear: input.startedYear,
      additionalDetails: input.additionalDetails as
        | Prisma.InputJsonValue
        | undefined,
    };

    return Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== undefined),
    );
  }

  private ensureRetryableRequest(status: RequestStatus, label: string) {
    if (!RETRYABLE_REQUEST_STATUSES.has(status)) {
      throw new BadRequestException(`${label} cannot be retried`);
    }
  }

  private getPayloadString(
    payload: Record<string, unknown>,
    key: string,
    fallback?: string,
  ): string | undefined {
    const value = payload[key];
    return typeof value === 'string' ? value : fallback;
  }

  private getPayloadNumber(
    payload: Record<string, unknown>,
    key: string,
  ): number | undefined {
    const value = payload[key];
    return typeof value === 'number' ? value : undefined;
  }

  private getRequestedRoles(value: Prisma.JsonValue): RoleName[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter((role): role is string => typeof role === 'string')
      .map((role) => REQUESTED_ROLE_MAP[role])
      .filter((role): role is RoleName => Boolean(role));
  }

  private getScopeType(scope: Record<string, unknown>): ScopeType {
    const type = this.getPayloadString(scope, 'type', 'organization');
    return type
      ? (REQUESTED_SCOPE_MAP[type] ?? ScopeType.ORGANIZATION)
      : ScopeType.ORGANIZATION;
  }
}
