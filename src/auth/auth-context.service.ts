import { Injectable, UnauthorizedException } from '@nestjs/common';
import { RoleName, ScopeType, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import { UserContext } from './auth.types';

const ROLE_CONTEXT_NAMES: Record<RoleName, string> = {
  PROVIDER: 'provider',
  PRACTICE: 'practice',
  CARE_COORDINATOR: 'careCoordinator',
  ACO_ADMIN: 'acoAdmin',
  CLIENT_ADMIN: 'clientAdmin',
  SUPER_ADMIN: 'superAdmin',
  DEVELOPER: 'developer',
};

const SCOPE_CONTEXT_NAMES: Record<ScopeType, string> = {
  GLOBAL: 'global',
  ORGANIZATION: 'organization',
  ACO: 'aco',
  PRACTICE: 'practice',
  PROVIDER: 'provider',
};

@Injectable()
export class AuthContextService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly supabaseService: SupabaseService,
  ) {}

  async getUserContextFromToken(accessToken: string): Promise<UserContext> {
    const authUser = await this.supabaseService.getUserFromToken(accessToken);

    const profile = await this.prismaService.profile.findUnique({
      where: {
        authUserId: authUser.id,
      },
      include: {
        roleAssignments: {
          where: {
            revokedAt: null,
          },
          include: {
            role: true,
          },
        },
      },
    });

    if (!profile) {
      throw new UnauthorizedException('Application profile not found');
    }

    if (profile.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Application profile is not active');
    }

    return {
      profileId: profile.id,
      authUserId: profile.authUserId,
      email: profile.email,
      status: profile.status,
      roles: profile.roleAssignments.map((assignment) => ({
        name: ROLE_CONTEXT_NAMES[assignment.role.name],
        scopeType: SCOPE_CONTEXT_NAMES[assignment.scopeType],
        scopeId: assignment.scopeId ?? undefined,
        organizationId: assignment.organizationId ?? undefined,
      })),
    };
  }
}
