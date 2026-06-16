import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Invite,
  InviteStatus,
  Prisma,
  RoleName,
  ScopeType,
  UserStatus,
} from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { UserContext } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { CreateInviteDto } from './dto/create-invite.dto';
import { PreviewInviteDto } from './dto/preview-invite.dto';

const INVITE_TOKEN_BYTES = 32;

const INVITE_ROLE_MAP: Record<string, RoleName> = {
  provider: RoleName.PROVIDER,
  practice: RoleName.PRACTICE,
  careCoordinator: RoleName.CARE_COORDINATOR,
  acoAdmin: RoleName.ACO_ADMIN,
  clientAdmin: RoleName.CLIENT_ADMIN,
  superAdmin: RoleName.SUPER_ADMIN,
  developer: RoleName.DEVELOPER,
};

const INVITE_SCOPE_MAP: Record<string, ScopeType> = {
  global: ScopeType.GLOBAL,
  organization: ScopeType.ORGANIZATION,
  aco: ScopeType.ACO,
  practice: ScopeType.PRACTICE,
  provider: ScopeType.PROVIDER,
};

@Injectable()
export class InvitesService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditService: AuditService,
    private readonly emailService: EmailService,
    private readonly supabaseService: SupabaseService,
  ) {}

  async createInvite(input: CreateInviteDto, actor: UserContext) {
    const inviteToken = this.createInviteToken();
    const invite = await this.prismaService.invite.create({
      data: {
        email: input.email.toLowerCase(),
        tokenHash: this.hashInviteToken(inviteToken),
        organizationId: input.organizationId,
        invitedById: actor.profileId,
        assignedRoles: input.assignedRoles,
        assignedScope: input.assignedScope as Prisma.InputJsonValue,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
      },
      select: this.inviteSelect(),
    });

    await this.auditService.record({
      actorProfileId: actor.profileId,
      action: 'invite.created',
      targetType: 'invite',
      targetId: invite.id,
      organizationId: invite.organizationId ?? undefined,
      metadata: {
        email: invite.email,
        assignedRoles: invite.assignedRoles,
      },
    });

    const emailDelivery = await this.emailService.sendInviteEmail({
      to: invite.email,
      inviteToken,
      expiresAt: invite.expiresAt,
    });

    return {
      ...invite,
      inviteToken,
      emailDelivery,
    };
  }

  async listInvites() {
    return this.prismaService.invite.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      select: this.inviteSelect(),
    });
  }

  async revokeInvite(id: string, actor: UserContext) {
    const invite = await this.prismaService.invite.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        status: true,
        organizationId: true,
      },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.status !== InviteStatus.PENDING) {
      throw new BadRequestException('Only pending invites can be revoked');
    }

    const revokedInvite = await this.prismaService.invite.update({
      where: { id },
      data: {
        status: InviteStatus.REVOKED,
      },
      select: this.inviteSelect(),
    });

    await this.auditService.record({
      actorProfileId: actor.profileId,
      action: 'invite.revoked',
      targetType: 'invite',
      targetId: invite.id,
      organizationId: invite.organizationId ?? undefined,
      metadata: {
        email: invite.email,
      },
    });

    return revokedInvite;
  }

  async previewInvite(input: PreviewInviteDto) {
    const invite = await this.prismaService.invite.findUnique({
      where: {
        tokenHash: this.hashInviteToken(input.inviteToken),
      },
      select: {
        id: true,
        email: true,
        organizationId: true,
        status: true,
        expiresAt: true,
        acceptedAt: true,
      },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.status === InviteStatus.PENDING && this.isExpired(invite)) {
      const expiredInvite = await this.prismaService.invite.update({
        where: { id: invite.id },
        data: { status: InviteStatus.EXPIRED },
        select: {
          id: true,
          email: true,
          organizationId: true,
          status: true,
          expiresAt: true,
          acceptedAt: true,
        },
      });

      return this.toInvitePreview(expiredInvite);
    }

    return this.toInvitePreview(invite);
  }

  async acceptInvite(input: AcceptInviteDto) {
    const authUser = await this.supabaseService.getUserFromToken(
      input.accessToken,
    );
    const email = authUser.email?.toLowerCase();

    if (!email) {
      throw new BadRequestException('Supabase user email is required');
    }

    const invite = await this.prismaService.invite.findUnique({
      where: {
        tokenHash: this.hashInviteToken(input.inviteToken),
      },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.status !== InviteStatus.PENDING) {
      throw new BadRequestException('Invite is not pending');
    }

    if (this.isExpired(invite)) {
      await this.prismaService.invite.update({
        where: { id: invite.id },
        data: { status: InviteStatus.EXPIRED },
      });
      throw new BadRequestException('Invite has expired');
    }

    if (invite.email !== email) {
      throw new BadRequestException(
        'Invite email does not match Supabase user email',
      );
    }

    const profile = await this.prismaService.profile.upsert({
      where: {
        authUserId: authUser.id,
      },
      update: {
        email,
        status: UserStatus.ACTIVE,
      },
      create: {
        authUserId: authUser.id,
        email,
        status: UserStatus.ACTIVE,
      },
    });

    await this.assignInviteRoles(invite, profile.id);

    const acceptedInvite = await this.prismaService.invite.update({
      where: { id: invite.id },
      data: {
        status: InviteStatus.ACCEPTED,
        acceptedAt: new Date(),
      },
      select: this.inviteSelect(),
    });

    await this.auditService.record({
      actorProfileId: profile.id,
      action: 'invite.accepted',
      targetType: 'invite',
      targetId: invite.id,
      organizationId: invite.organizationId ?? undefined,
      metadata: {
        email,
        assignedRoles: invite.assignedRoles,
      },
    });

    return {
      invite: acceptedInvite,
      profile,
    };
  }

  private async assignInviteRoles(invite: Invite, profileId: string) {
    const roleNames = this.getInviteRoles(invite.assignedRoles);
    const assignedScope = invite.assignedScope as Record<string, unknown>;
    const scopeType = this.getScopeType(assignedScope);
    const scopeId = this.getPayloadString(assignedScope, 'id');
    const organizationId =
      invite.organizationId ??
      this.getPayloadString(assignedScope, 'organizationId');

    for (const roleName of roleNames) {
      const role = await this.prismaService.role.findUnique({
        where: { name: roleName },
      });

      if (!role) {
        continue;
      }

      const existingAssignment =
        await this.prismaService.userRoleAssignment.findFirst({
          where: {
            profileId,
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
            profileId,
            roleId: role.id,
            scopeType,
            scopeId,
            organizationId,
            assignedById: invite.invitedById,
          },
        });
      }
    }
  }

  private createInviteToken(): string {
    return randomBytes(INVITE_TOKEN_BYTES).toString('base64url');
  }

  private isExpired(invite: { expiresAt: Date | null }) {
    return Boolean(invite.expiresAt && invite.expiresAt < new Date());
  }

  private toInvitePreview(invite: {
    email: string;
    organizationId: string | null;
    status: InviteStatus;
    expiresAt: Date | null;
    acceptedAt: Date | null;
  }) {
    return {
      email: invite.email,
      organizationId: invite.organizationId,
      status: invite.status,
      expiresAt: invite.expiresAt,
      acceptedAt: invite.acceptedAt,
    };
  }

  private hashInviteToken(inviteToken: string): string {
    return createHash('sha256').update(inviteToken).digest('hex');
  }

  private getInviteRoles(value: Prisma.JsonValue): RoleName[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter((role): role is string => typeof role === 'string')
      .map((role) => INVITE_ROLE_MAP[role])
      .filter((role): role is RoleName => Boolean(role));
  }

  private getPayloadString(
    payload: Record<string, unknown>,
    key: string,
  ): string | undefined {
    const value = payload[key];
    return typeof value === 'string' ? value : undefined;
  }

  private getScopeType(scope: Record<string, unknown>): ScopeType {
    const type = this.getPayloadString(scope, 'type') ?? 'organization';
    return INVITE_SCOPE_MAP[type] ?? ScopeType.ORGANIZATION;
  }

  private inviteSelect() {
    return {
      id: true,
      email: true,
      organizationId: true,
      assignedRoles: true,
      assignedScope: true,
      status: true,
      expiresAt: true,
      acceptedAt: true,
      createdAt: true,
      updatedAt: true,
      invitedBy: {
        select: {
          id: true,
          email: true,
        },
      },
    } satisfies Prisma.InviteSelect;
  }
}
