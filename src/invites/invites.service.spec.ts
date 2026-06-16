import { InvitesService } from './invites.service';
import { InviteStatus } from '@prisma/client';

describe('InvitesService', () => {
  it('creates an invite and records an audit log', async () => {
    const invite = {
      id: 'invite-1',
      email: 'user@example.com',
      organizationId: null,
      assignedRoles: ['provider'],
    };
    const prismaService = {
      invite: {
        create: jest.fn().mockResolvedValue(invite),
      },
    };
    const auditService = {
      record: jest.fn().mockResolvedValue(undefined),
    };
    const emailService = {
      sendInviteEmail: jest.fn().mockResolvedValue({
        status: 'skipped',
        reason: 'EMAIL_DRIVER is disabled',
      }),
    };
    const supabaseService = {
      getUserFromToken: jest.fn(),
    };
    const service = new InvitesService(
      prismaService as unknown as ConstructorParameters<
        typeof InvitesService
      >[0],
      auditService as unknown as ConstructorParameters<
        typeof InvitesService
      >[1],
      emailService as unknown as ConstructorParameters<
        typeof InvitesService
      >[2],
      supabaseService as unknown as ConstructorParameters<
        typeof InvitesService
      >[3],
    );

    const result = await service.createInvite(
      {
        email: 'USER@EXAMPLE.COM',
        assignedRoles: ['provider'],
        assignedScope: {
          type: 'organization',
        },
      },
      {
        profileId: 'profile-1',
        authUserId: 'auth-user-1',
        status: 'ACTIVE',
        roles: [],
      },
    );

    expect(result).toEqual({
      ...invite,
      inviteToken: expect.any(String) as string,
      emailDelivery: {
        status: 'skipped',
        reason: 'EMAIL_DRIVER is disabled',
      },
    });
    expect(prismaService.invite.create).toHaveBeenCalled();
    expect(emailService.sendInviteEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        inviteToken: expect.any(String) as string,
      }),
    );
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'invite.created',
        targetId: 'invite-1',
      }),
    );
  });

  it('previews a pending invite with limited public fields', async () => {
    const expiresAt = new Date(Date.now() + 60_000);
    const invite = {
      id: 'invite-1',
      email: 'user@example.com',
      organizationId: 'organization-1',
      status: InviteStatus.PENDING,
      expiresAt,
      acceptedAt: null,
    };
    const prismaService = {
      invite: {
        findUnique: jest.fn().mockResolvedValue(invite),
      },
    };
    const service = new InvitesService(
      prismaService as unknown as ConstructorParameters<
        typeof InvitesService
      >[0],
      {} as ConstructorParameters<typeof InvitesService>[1],
      {} as ConstructorParameters<typeof InvitesService>[2],
      {} as ConstructorParameters<typeof InvitesService>[3],
    );

    await expect(
      service.previewInvite({
        inviteToken: 'valid-invite-token-value-with-enough-length',
      }),
    ).resolves.toEqual({
      email: 'user@example.com',
      organizationId: 'organization-1',
      status: InviteStatus.PENDING,
      expiresAt,
      acceptedAt: null,
    });

    const preview = await service.previewInvite({
      inviteToken: 'valid-invite-token-value-with-enough-length',
    });
    expect(preview).not.toHaveProperty('tokenHash');
    expect(preview).not.toHaveProperty('assignedRoles');
    expect(preview).not.toHaveProperty('assignedScope');
  });

  it('marks expired pending invites as expired during preview', async () => {
    const expiresAt = new Date(Date.now() - 60_000);
    const expiredInvite = {
      id: 'invite-1',
      email: 'user@example.com',
      organizationId: null,
      status: InviteStatus.EXPIRED,
      expiresAt,
      acceptedAt: null,
    };
    const prismaService = {
      invite: {
        findUnique: jest.fn().mockResolvedValue({
          ...expiredInvite,
          status: InviteStatus.PENDING,
        }),
        update: jest.fn().mockResolvedValue(expiredInvite),
      },
    };
    const service = new InvitesService(
      prismaService as unknown as ConstructorParameters<
        typeof InvitesService
      >[0],
      {} as ConstructorParameters<typeof InvitesService>[1],
      {} as ConstructorParameters<typeof InvitesService>[2],
      {} as ConstructorParameters<typeof InvitesService>[3],
    );

    await expect(
      service.previewInvite({
        inviteToken: 'valid-invite-token-value-with-enough-length',
      }),
    ).resolves.toEqual({
      email: 'user@example.com',
      organizationId: null,
      status: InviteStatus.EXPIRED,
      expiresAt,
      acceptedAt: null,
    });

    expect(prismaService.invite.update).toHaveBeenCalledWith({
      where: { id: 'invite-1' },
      data: { status: InviteStatus.EXPIRED },
      select: expect.any(Object) as Record<string, unknown>,
    });
  });

  it('accepts an invite and activates a profile', async () => {
    const now = new Date();
    const invite = {
      id: 'invite-1',
      email: 'user@example.com',
      tokenHash: 'hashed-token',
      organizationId: 'organization-1',
      invitedById: 'profile-admin',
      assignedRoles: ['provider'],
      assignedScope: {
        type: 'organization',
        organizationId: 'organization-1',
      },
      status: 'PENDING',
      expiresAt: new Date(now.getTime() + 60_000),
      acceptedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    const acceptedInvite = {
      id: 'invite-1',
      email: 'user@example.com',
      status: 'ACCEPTED',
    };
    const profile = {
      id: 'profile-1',
      authUserId: 'auth-user-1',
      email: 'user@example.com',
      status: 'ACTIVE',
    };
    const prismaService = {
      invite: {
        findUnique: jest.fn().mockResolvedValue(invite),
        update: jest.fn().mockResolvedValue(acceptedInvite),
      },
      profile: {
        upsert: jest.fn().mockResolvedValue(profile),
      },
      role: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'role-1',
          name: 'PROVIDER',
        }),
      },
      userRoleAssignment: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'assignment-1' }),
      },
    };
    const auditService = {
      record: jest.fn().mockResolvedValue(undefined),
    };
    const emailService = {
      sendInviteEmail: jest.fn(),
    };
    const supabaseService = {
      getUserFromToken: jest.fn().mockResolvedValue({
        id: 'auth-user-1',
        email: 'user@example.com',
      }),
    };
    const service = new InvitesService(
      prismaService as unknown as ConstructorParameters<
        typeof InvitesService
      >[0],
      auditService as unknown as ConstructorParameters<
        typeof InvitesService
      >[1],
      emailService as unknown as ConstructorParameters<
        typeof InvitesService
      >[2],
      supabaseService as unknown as ConstructorParameters<
        typeof InvitesService
      >[3],
    );

    await expect(
      service.acceptInvite({
        inviteToken: 'valid-invite-token-value-with-enough-length',
        accessToken: 'valid-access-token-value-with-enough-length',
      }),
    ).resolves.toEqual({
      invite: acceptedInvite,
      profile,
    });

    expect(prismaService.profile.upsert).toHaveBeenCalled();
    expect(prismaService.userRoleAssignment.create).toHaveBeenCalled();
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'invite.accepted',
        actorProfileId: 'profile-1',
      }),
    );
  });
});
