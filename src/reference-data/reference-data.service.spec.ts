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

  it('exports scoped practices as CSV', async () => {
    const prismaService = {
      practice: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'practice-1',
            organizationId: 'organization-1',
            name: 'Primary Care',
            externalReferenceId: 'practice-ext-1',
            source: 'MANUAL',
            status: 'ACTIVE',
            createdAt: new Date('2026-06-18T10:00:00.000Z'),
            updatedAt: new Date('2026-06-18T10:05:00.000Z'),
            organization: {
              id: 'organization-1',
              name: 'Example Health',
            },
            _count: {
              providers: 3,
            },
          },
        ]),
      },
    };
    const service = new ReferenceDataService(
      prismaService as unknown as ConstructorParameters<
        typeof ReferenceDataService
      >[0],
      {} as ConstructorParameters<typeof ReferenceDataService>[1],
    );

    await expect(
      service.exportPractices({
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
        '"id","organizationId","organizationName","name","externalReferenceId","source","status","providerCount","createdAt","updatedAt"',
        '"practice-1","organization-1","Example Health","Primary Care","practice-ext-1","MANUAL","ACTIVE","3","2026-06-18T10:00:00.000Z","2026-06-18T10:05:00.000Z"',
      ].join('\n'),
    );

    expect(prismaService.practice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: {
            in: ['organization-1'],
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        include: expect.any(Object) as Record<string, unknown>,
      }),
    );
  });

  it('exports scoped providers as CSV', async () => {
    const prismaService = {
      provider: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'provider-1',
            organizationId: 'organization-1',
            practiceId: 'practice-1',
            name: 'Dr. Example',
            npi: '1234567890',
            externalReferenceId: 'provider-ext-1',
            source: 'DATABRICKS',
            status: 'ACTIVE',
            createdAt: new Date('2026-06-18T11:00:00.000Z'),
            updatedAt: new Date('2026-06-18T11:05:00.000Z'),
            organization: {
              id: 'organization-1',
              name: 'Example Health',
            },
            practice: {
              id: 'practice-1',
              name: 'Primary Care',
            },
          },
        ]),
      },
    };
    const service = new ReferenceDataService(
      prismaService as unknown as ConstructorParameters<
        typeof ReferenceDataService
      >[0],
      {} as ConstructorParameters<typeof ReferenceDataService>[1],
    );

    await expect(
      service.exportProviders({
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
        '"id","organizationId","organizationName","practiceId","practiceName","name","npi","externalReferenceId","source","status","createdAt","updatedAt"',
        '"provider-1","organization-1","Example Health","practice-1","Primary Care","Dr. Example","1234567890","provider-ext-1","DATABRICKS","ACTIVE","2026-06-18T11:00:00.000Z","2026-06-18T11:05:00.000Z"',
      ].join('\n'),
    );

    expect(prismaService.provider.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: {
            in: ['organization-1'],
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        include: expect.any(Object) as Record<string, unknown>,
      }),
    );
  });

  it('gets a scoped practice detail', async () => {
    const prismaService = {
      practice: {
        findFirst: jest.fn().mockResolvedValue({ id: 'practice-1' }),
      },
    };
    const service = new ReferenceDataService(
      prismaService as unknown as ConstructorParameters<
        typeof ReferenceDataService
      >[0],
      {} as ConstructorParameters<typeof ReferenceDataService>[1],
    );

    await expect(
      service.getPractice('practice-1', {
        ...actor,
        roles: [
          {
            name: 'clientAdmin',
            scopeType: 'organization',
            organizationId: 'organization-1',
          },
        ],
      }),
    ).resolves.toEqual({ id: 'practice-1' });

    expect(prismaService.practice.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            { id: 'practice-1' },
            {
              organizationId: {
                in: ['organization-1'],
              },
            },
          ],
        },
      }),
    );
  });

  it('lists providers inside a scoped practice', async () => {
    const prismaService = {
      practice: {
        findFirst: jest.fn().mockResolvedValue({ id: 'practice-1' }),
      },
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

    await service.listPracticeProviders('practice-1', {
      ...actor,
      roles: [
        {
          name: 'clientAdmin',
          scopeType: 'organization',
          organizationId: 'organization-1',
        },
      ],
    });

    expect(prismaService.provider.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            { practiceId: 'practice-1' },
            {
              organizationId: {
                in: ['organization-1'],
              },
            },
          ],
        },
      }),
    );
  });

  it('gets a scoped provider detail', async () => {
    const prismaService = {
      provider: {
        findFirst: jest.fn().mockResolvedValue({ id: 'provider-1' }),
      },
    };
    const service = new ReferenceDataService(
      prismaService as unknown as ConstructorParameters<
        typeof ReferenceDataService
      >[0],
      {} as ConstructorParameters<typeof ReferenceDataService>[1],
    );

    await expect(
      service.getProvider('provider-1', {
        ...actor,
        roles: [
          {
            name: 'clientAdmin',
            scopeType: 'organization',
            organizationId: 'organization-1',
          },
        ],
      }),
    ).resolves.toEqual({ id: 'provider-1' });

    expect(prismaService.provider.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            { id: 'provider-1' },
            {
              organizationId: {
                in: ['organization-1'],
              },
            },
          ],
        },
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
