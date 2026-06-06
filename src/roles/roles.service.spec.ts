import { BadRequestException } from '@nestjs/common';
import { RolesService } from './roles.service';

describe('RolesService', () => {
  const actor = {
    profileId: 'actor-1',
    authUserId: 'auth-user-1',
    status: 'ACTIVE',
    roles: [],
  };

  it('assigns a role and records an audit log', async () => {
    const assignment = {
      id: 'assignment-1',
      organizationId: 'organization-1',
    };
    const prismaService = {
      profile: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'profile-1',
          email: 'user@example.com',
        }),
      },
      role: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'role-1',
          name: 'PROVIDER',
        }),
      },
      userRoleAssignment: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(assignment),
      },
    };
    const auditService = {
      record: jest.fn().mockResolvedValue(undefined),
    };
    const service = new RolesService(
      prismaService as unknown as ConstructorParameters<typeof RolesService>[0],
      auditService as unknown as ConstructorParameters<typeof RolesService>[1],
    );

    await expect(
      service.assignRole(
        {
          profileId: 'profile-1',
          roleName: 'provider',
          scopeType: 'organization',
          organizationId: 'organization-1',
        },
        actor,
      ),
    ).resolves.toEqual(assignment);

    expect(prismaService.userRoleAssignment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          assignedById: 'actor-1',
        }) as Record<string, unknown>,
      }),
    );
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'role.assigned',
        targetId: 'assignment-1',
      }),
    );
  });

  it('returns an existing active assignment instead of duplicating it', async () => {
    const existingAssignment = {
      id: 'assignment-1',
      organizationId: 'organization-1',
    };
    const prismaService = {
      profile: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'profile-1',
          email: 'user@example.com',
        }),
      },
      role: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'role-1',
          name: 'PROVIDER',
        }),
      },
      userRoleAssignment: {
        findFirst: jest.fn().mockResolvedValue(existingAssignment),
        create: jest.fn(),
      },
    };
    const auditService = {
      record: jest.fn(),
    };
    const service = new RolesService(
      prismaService as unknown as ConstructorParameters<typeof RolesService>[0],
      auditService as unknown as ConstructorParameters<typeof RolesService>[1],
    );

    await expect(
      service.assignRole(
        {
          profileId: 'profile-1',
          roleName: 'provider',
          scopeType: 'organization',
          organizationId: 'organization-1',
        },
        actor,
      ),
    ).resolves.toEqual(existingAssignment);

    expect(prismaService.userRoleAssignment.create).not.toHaveBeenCalled();
    expect(auditService.record).not.toHaveBeenCalled();
  });

  it('rejects non-global scope without organizationId', async () => {
    const service = new RolesService(
      {} as ConstructorParameters<typeof RolesService>[0],
      {} as ConstructorParameters<typeof RolesService>[1],
    );

    await expect(
      service.assignRole(
        {
          profileId: 'profile-1',
          roleName: 'provider',
          scopeType: 'organization',
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('revokes a role assignment and records an audit log', async () => {
    const prismaService = {
      userRoleAssignment: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'assignment-1',
          profileId: 'profile-1',
          organizationId: 'organization-1',
          revokedAt: null,
          role: {
            name: 'PROVIDER',
          },
        }),
        update: jest.fn().mockResolvedValue({
          id: 'assignment-1',
          revokedAt: new Date(),
        }),
      },
    };
    const auditService = {
      record: jest.fn().mockResolvedValue(undefined),
    };
    const service = new RolesService(
      prismaService as unknown as ConstructorParameters<typeof RolesService>[0],
      auditService as unknown as ConstructorParameters<typeof RolesService>[1],
    );

    await expect(
      service.revokeAssignment(
        'assignment-1',
        { reason: 'incorrect scope' },
        actor,
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        id: 'assignment-1',
      }),
    );

    expect(prismaService.userRoleAssignment.update).toHaveBeenCalled();
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'role.revoked',
        targetId: 'assignment-1',
      }),
    );
  });
});
