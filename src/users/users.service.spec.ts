import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { UsersService } from './users.service';

describe('UsersService', () => {
  const actor = {
    profileId: 'actor-1',
    authUserId: 'auth-user-1',
    status: 'ACTIVE',
    roles: [],
  };

  it('throws when user detail is missing', async () => {
    const prismaService = {
      profile: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const service = new UsersService(
      prismaService as unknown as ConstructorParameters<typeof UsersService>[0],
      {} as ConstructorParameters<typeof UsersService>[1],
    );

    await expect(service.getUser('profile-1', actor)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('scopes user list for non-platform admins', async () => {
    const prismaService = {
      profile: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const service = new UsersService(
      prismaService as unknown as ConstructorParameters<typeof UsersService>[0],
      {} as ConstructorParameters<typeof UsersService>[1],
    );

    await service.listUsers({
      ...actor,
      roles: [
        {
          name: 'clientAdmin',
          scopeType: 'organization',
          organizationId: 'organization-1',
        },
      ],
    });

    expect(prismaService.profile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.any(Array) as unknown[],
        }) as Record<string, unknown>,
      }),
    );
  });

  it('does not scope user list for platform admins', async () => {
    const prismaService = {
      profile: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const service = new UsersService(
      prismaService as unknown as ConstructorParameters<typeof UsersService>[0],
      {} as ConstructorParameters<typeof UsersService>[1],
    );

    await service.listUsers({
      ...actor,
      roles: [{ name: 'developer', scopeType: 'global' }],
    });

    expect(prismaService.profile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
      }),
    );
  });

  it('exports scoped users as CSV', async () => {
    const prismaService = {
      profile: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'profile-1',
            authUserId: 'auth-user-1',
            email: 'user@example.com',
            firstName: 'Ada',
            lastName: 'Lovelace',
            status: UserStatus.ACTIVE,
            createdAt: new Date('2026-06-18T10:00:00.000Z'),
            updatedAt: new Date('2026-06-18T10:05:00.000Z'),
            roleAssignments: [
              {
                id: 'assignment-1',
                scopeType: 'organization',
                scopeId: null,
                organizationId: 'organization-1',
                createdAt: new Date('2026-06-18T10:00:00.000Z'),
                role: {
                  name: 'clientAdmin',
                  displayName: 'Client Admin',
                },
              },
            ],
          },
        ]),
      },
    };
    const service = new UsersService(
      prismaService as unknown as ConstructorParameters<typeof UsersService>[0],
      {} as ConstructorParameters<typeof UsersService>[1],
    );

    await expect(
      service.exportUsers({
        ...actor,
        roles: [
          {
            name: 'clientAdmin',
            scopeType: 'organization',
            organizationId: 'organization-1',
          },
        ],
      }),
    ).resolves.toBe(
      [
        '"id","authUserId","email","firstName","lastName","status","roles","organizationIds","createdAt","updatedAt"',
        '"profile-1","auth-user-1","user@example.com","Ada","Lovelace","ACTIVE","clientAdmin","organization-1","2026-06-18T10:00:00.000Z","2026-06-18T10:05:00.000Z"',
      ].join('\n'),
    );

    expect(prismaService.profile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.any(Array) as unknown[],
        }) as Record<string, unknown>,
        orderBy: {
          createdAt: 'desc',
        },
        select: expect.any(Object) as Record<string, unknown>,
      }),
    );
  });

  it('disables a user and records an audit log', async () => {
    const updatedUser = {
      id: 'profile-1',
      email: 'user@example.com',
      status: UserStatus.DISABLED,
    };
    const prismaService = {
      profile: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'profile-1',
          email: 'user@example.com',
          status: UserStatus.ACTIVE,
        }),
        update: jest.fn().mockResolvedValue(updatedUser),
      },
    };
    const auditService = {
      record: jest.fn().mockResolvedValue(undefined),
    };
    const service = new UsersService(
      prismaService as unknown as ConstructorParameters<typeof UsersService>[0],
      auditService as unknown as ConstructorParameters<typeof UsersService>[1],
    );

    await expect(
      service.disableUser('profile-1', { reason: 'left company' }, actor),
    ).resolves.toEqual(updatedUser);

    expect(prismaService.profile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          status: UserStatus.DISABLED,
        },
      }),
    );
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'user.disabled',
        targetId: 'profile-1',
      }),
    );
  });

  it('prevents users from disabling themselves', async () => {
    const prismaService = {
      profile: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'actor-1',
          email: 'actor@example.com',
          status: UserStatus.ACTIVE,
        }),
      },
    };
    const service = new UsersService(
      prismaService as unknown as ConstructorParameters<typeof UsersService>[0],
      {} as ConstructorParameters<typeof UsersService>[1],
    );

    await expect(
      service.disableUser('actor-1', {}, actor),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('reactivates an invited or disabled user and records an audit log', async () => {
    const updatedUser = {
      id: 'profile-1',
      email: 'user@example.com',
      status: UserStatus.ACTIVE,
    };
    const prismaService = {
      profile: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'profile-1',
          email: 'user@example.com',
          status: UserStatus.DISABLED,
        }),
        update: jest.fn().mockResolvedValue(updatedUser),
      },
    };
    const auditService = {
      record: jest.fn().mockResolvedValue(undefined),
    };
    const service = new UsersService(
      prismaService as unknown as ConstructorParameters<typeof UsersService>[0],
      auditService as unknown as ConstructorParameters<typeof UsersService>[1],
    );

    await expect(
      service.reactivateUser('profile-1', { reason: 'returned' }, actor),
    ).resolves.toEqual(updatedUser);

    expect(prismaService.profile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          status: UserStatus.ACTIVE,
        },
      }),
    );
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'user.reactivated',
        targetId: 'profile-1',
      }),
    );
  });

  it('does not reactivate rejected users', async () => {
    const prismaService = {
      profile: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'profile-1',
          email: 'user@example.com',
          status: UserStatus.REJECTED,
        }),
      },
    };
    const service = new UsersService(
      prismaService as unknown as ConstructorParameters<typeof UsersService>[0],
      {} as ConstructorParameters<typeof UsersService>[1],
    );

    await expect(
      service.reactivateUser('profile-1', {}, actor),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
