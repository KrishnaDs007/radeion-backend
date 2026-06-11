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
}
