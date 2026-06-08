import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RoleName, ScopeType } from '@prisma/client';
import {
  getAccessibleOrganizationIds,
  hasPlatformAccess,
} from '../auth/auth-scope.util';
import type { UserContext } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { AssignRoleDto } from './dto/assign-role.dto';
import { RevokeRoleAssignmentDto } from './dto/revoke-role-assignment.dto';

const ROLE_NAME_MAP: Record<AssignRoleDto['roleName'], RoleName> = {
  provider: RoleName.PROVIDER,
  practice: RoleName.PRACTICE,
  careCoordinator: RoleName.CARE_COORDINATOR,
  acoAdmin: RoleName.ACO_ADMIN,
  clientAdmin: RoleName.CLIENT_ADMIN,
  superAdmin: RoleName.SUPER_ADMIN,
  developer: RoleName.DEVELOPER,
};

const SCOPE_TYPE_MAP: Record<AssignRoleDto['scopeType'], ScopeType> = {
  global: ScopeType.GLOBAL,
  organization: ScopeType.ORGANIZATION,
  aco: ScopeType.ACO,
  practice: ScopeType.PRACTICE,
  provider: ScopeType.PROVIDER,
};

@Injectable()
export class RolesService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async listRoles() {
    return this.prismaService.role.findMany({
      orderBy: {
        displayName: 'asc',
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        description: true,
        isGlobal: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async listAssignments(actor: UserContext) {
    return this.prismaService.userRoleAssignment.findMany({
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

  async assignRole(input: AssignRoleDto, actor: UserContext) {
    this.validateScope(input);

    const profile = await this.prismaService.profile.findUnique({
      where: {
        id: input.profileId,
      },
      select: {
        id: true,
        email: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const roleName = ROLE_NAME_MAP[input.roleName];
    const role = await this.prismaService.role.findUnique({
      where: {
        name: roleName,
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const scopeType = SCOPE_TYPE_MAP[input.scopeType];
    const existingAssignment =
      await this.prismaService.userRoleAssignment.findFirst({
        where: {
          profileId: profile.id,
          roleId: role.id,
          scopeType,
          scopeId: input.scopeId,
          organizationId: input.organizationId,
          revokedAt: null,
        },
        select: this.assignmentSelect(),
      });

    if (existingAssignment) {
      return existingAssignment;
    }

    const assignment = await this.prismaService.userRoleAssignment.create({
      data: {
        profileId: profile.id,
        roleId: role.id,
        scopeType,
        scopeId: input.scopeId,
        organizationId: input.organizationId,
        assignedById: actor.profileId,
      },
      select: this.assignmentSelect(),
    });

    await this.auditService.record({
      actorProfileId: actor.profileId,
      action: 'role.assigned',
      targetType: 'roleAssignment',
      targetId: assignment.id,
      organizationId: assignment.organizationId ?? undefined,
      metadata: {
        profileId: profile.id,
        email: profile.email,
        roleName: input.roleName,
        scopeType: input.scopeType,
        scopeId: input.scopeId,
        reason: input.reason,
      },
    });

    return assignment;
  }

  async revokeAssignment(
    id: string,
    input: RevokeRoleAssignmentDto,
    actor: UserContext,
  ) {
    const assignment = await this.prismaService.userRoleAssignment.findUnique({
      where: { id },
      select: {
        id: true,
        profileId: true,
        organizationId: true,
        revokedAt: true,
        role: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Role assignment not found');
    }

    if (assignment.revokedAt) {
      throw new BadRequestException('Role assignment is already revoked');
    }

    const revokedAssignment =
      await this.prismaService.userRoleAssignment.update({
        where: { id },
        data: {
          revokedAt: new Date(),
        },
        select: this.assignmentSelect(),
      });

    await this.auditService.record({
      actorProfileId: actor.profileId,
      action: 'role.revoked',
      targetType: 'roleAssignment',
      targetId: assignment.id,
      organizationId: assignment.organizationId ?? undefined,
      metadata: {
        profileId: assignment.profileId,
        roleName: assignment.role.name,
        reason: input.reason,
      },
    });

    return revokedAssignment;
  }

  private validateScope(input: AssignRoleDto) {
    if (input.scopeType === 'global' && input.scopeId) {
      throw new BadRequestException('Global role scope cannot include scopeId');
    }

    if (input.scopeType !== 'global' && !input.organizationId) {
      throw new BadRequestException(
        'Non-global role scope requires organizationId',
      );
    }

    if (
      ['aco', 'practice', 'provider'].includes(input.scopeType) &&
      !input.scopeId
    ) {
      throw new BadRequestException(
        'ACO, practice, and provider scopes require scopeId',
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

  private assignmentSelect() {
    return {
      id: true,
      scopeType: true,
      scopeId: true,
      organizationId: true,
      createdAt: true,
      revokedAt: true,
      profile: {
        select: {
          id: true,
          email: true,
        },
      },
      role: {
        select: {
          id: true,
          name: true,
          displayName: true,
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
}
