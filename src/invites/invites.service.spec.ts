import { InvitesService } from './invites.service';

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
    const service = new InvitesService(
      prismaService as unknown as ConstructorParameters<
        typeof InvitesService
      >[0],
      auditService as unknown as ConstructorParameters<
        typeof InvitesService
      >[1],
    );

    await expect(
      service.createInvite(
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
      ),
    ).resolves.toEqual(invite);

    expect(prismaService.invite.create).toHaveBeenCalled();
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'invite.created',
        targetId: 'invite-1',
      }),
    );
  });
});
