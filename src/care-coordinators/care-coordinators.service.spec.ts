import { BadRequestException } from '@nestjs/common';
import { CareCoordinatorsService } from './care-coordinators.service';

describe('CareCoordinatorsService', () => {
  const actor = {
    profileId: 'actor-1',
    authUserId: 'auth-user-1',
    status: 'ACTIVE',
    roles: [],
  };

  const basePrismaService = () => ({
    profile: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'profile-1',
        roleAssignments: [{ id: 'role-assignment-1' }],
      }),
    },
    organization: {
      findUnique: jest.fn().mockResolvedValue({ id: 'organization-1' }),
    },
    practice: {
      findFirst: jest.fn().mockResolvedValue({ id: 'practice-1' }),
    },
    provider: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'provider-1',
        practiceId: 'practice-1',
      }),
    },
    careCoordinatorAssignment: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({
        id: 'assignment-1',
        organizationId: 'organization-1',
        practiceId: 'practice-1',
        providerId: 'provider-1',
      }),
    },
  });

  it('creates an assignment and records an audit log', async () => {
    const prismaService = basePrismaService();
    const auditService = {
      record: jest.fn().mockResolvedValue(undefined),
    };
    const service = new CareCoordinatorsService(
      prismaService as unknown as ConstructorParameters<
        typeof CareCoordinatorsService
      >[0],
      auditService as unknown as ConstructorParameters<
        typeof CareCoordinatorsService
      >[1],
    );

    await expect(
      service.createAssignment(
        {
          profileId: 'profile-1',
          organizationId: 'organization-1',
          practiceId: 'practice-1',
          providerId: 'provider-1',
        },
        actor,
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        id: 'assignment-1',
      }),
    );

    expect(prismaService.careCoordinatorAssignment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          assignedById: 'actor-1',
        }) as Record<string, unknown>,
      }),
    );
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'careCoordinator.assigned',
        targetId: 'assignment-1',
      }),
    );
  });

  it('returns an existing active assignment instead of duplicating it', async () => {
    const prismaService = basePrismaService();
    const existingAssignment = {
      id: 'assignment-1',
      organizationId: 'organization-1',
    };
    prismaService.careCoordinatorAssignment.findFirst.mockResolvedValue(
      existingAssignment,
    );
    const auditService = {
      record: jest.fn(),
    };
    const service = new CareCoordinatorsService(
      prismaService as unknown as ConstructorParameters<
        typeof CareCoordinatorsService
      >[0],
      auditService as unknown as ConstructorParameters<
        typeof CareCoordinatorsService
      >[1],
    );

    await expect(
      service.createAssignment(
        {
          profileId: 'profile-1',
          organizationId: 'organization-1',
        },
        actor,
      ),
    ).resolves.toEqual(existingAssignment);

    expect(
      prismaService.careCoordinatorAssignment.create,
    ).not.toHaveBeenCalled();
    expect(auditService.record).not.toHaveBeenCalled();
  });

  it('requires an active care coordinator role', async () => {
    const prismaService = basePrismaService();
    prismaService.profile.findUnique.mockResolvedValue({
      id: 'profile-1',
      roleAssignments: [],
    });
    const service = new CareCoordinatorsService(
      prismaService as unknown as ConstructorParameters<
        typeof CareCoordinatorsService
      >[0],
      {} as ConstructorParameters<typeof CareCoordinatorsService>[1],
    );

    await expect(
      service.createAssignment(
        {
          profileId: 'profile-1',
          organizationId: 'organization-1',
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('revokes an assignment and records an audit log', async () => {
    const prismaService = {
      careCoordinatorAssignment: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'assignment-1',
          profileId: 'profile-1',
          organizationId: 'organization-1',
          practiceId: null,
          providerId: null,
          revokedAt: null,
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
    const service = new CareCoordinatorsService(
      prismaService as unknown as ConstructorParameters<
        typeof CareCoordinatorsService
      >[0],
      auditService as unknown as ConstructorParameters<
        typeof CareCoordinatorsService
      >[1],
    );

    await expect(
      service.revokeAssignment(
        'assignment-1',
        { reason: 'changed coverage' },
        actor,
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        id: 'assignment-1',
      }),
    );

    expect(prismaService.careCoordinatorAssignment.update).toHaveBeenCalled();
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'careCoordinator.revoked',
        targetId: 'assignment-1',
      }),
    );
  });
});
