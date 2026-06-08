import { ReferenceDataService } from './reference-data.service';

describe('ReferenceDataService', () => {
  const actor = {
    profileId: 'profile-1',
    authUserId: 'auth-user-1',
    status: 'ACTIVE',
    roles: [],
  };

  it('scopes practice lists for non-platform admins', async () => {
    const prismaService = {
      practice: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const service = new ReferenceDataService(
      prismaService as unknown as ConstructorParameters<
        typeof ReferenceDataService
      >[0],
      {} as ConstructorParameters<typeof ReferenceDataService>[1],
    );

    await service.listPractices({
      ...actor,
      roles: [
        {
          name: 'clientAdmin',
          scopeType: 'organization',
          organizationId: 'organization-1',
        },
      ],
    });

    expect(prismaService.practice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: {
            in: ['organization-1'],
          },
        },
      }),
    );
  });

  it('does not scope provider lists for platform admins', async () => {
    const prismaService = {
      provider: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const service = new ReferenceDataService(
      prismaService as unknown as ConstructorParameters<
        typeof ReferenceDataService
      >[0],
      {} as ConstructorParameters<typeof ReferenceDataService>[1],
    );

    await service.listProviders({
      ...actor,
      roles: [{ name: 'developer', scopeType: 'global' }],
    });

    expect(prismaService.provider.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
      }),
    );
  });

  it('creates a practice and records an audit log', async () => {
    const practice = {
      id: 'practice-1',
      organizationId: 'organization-1',
      name: 'Practice One',
    };
    const prismaService = {
      practice: {
        create: jest.fn().mockResolvedValue(practice),
      },
    };
    const auditService = {
      record: jest.fn().mockResolvedValue(undefined),
    };
    const service = new ReferenceDataService(
      prismaService as unknown as ConstructorParameters<
        typeof ReferenceDataService
      >[0],
      auditService as unknown as ConstructorParameters<
        typeof ReferenceDataService
      >[1],
    );

    await expect(
      service.createPractice(
        {
          organizationId: 'organization-1',
          name: 'Practice One',
        },
        {
          ...actor,
        },
      ),
    ).resolves.toEqual(practice);

    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'practice.changed',
        targetId: 'practice-1',
      }),
    );
  });
});
