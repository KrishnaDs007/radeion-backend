import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InviteStatus, Prisma } from '@prisma/client';
import { UserContext } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInviteDto } from './dto/create-invite.dto';

@Injectable()
export class InvitesService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async createInvite(input: CreateInviteDto, actor: UserContext) {
    const invite = await this.prismaService.invite.create({
      data: {
        email: input.email.toLowerCase(),
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

    return invite;
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
