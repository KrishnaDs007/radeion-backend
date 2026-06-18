import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrganizationStatus } from '@prisma/client';
import { OrganizationsService } from './organizations.service';

describe('OrganizationsService', () => {
  const actor = {
    profileId: 'actor-1',
    authUserId: 'auth-user-1',
    status: 'ACTIVE',
    roles: [],
  };

  it('throws when organization detail is missing', async () => {
    const prismaService = {
      organization: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const service = new OrganizationsService(
      prismaService as unknown as ConstructorParameters<
        typeof OrganizationsService
      >[0],
      {} as ConstructorParameters<typeof OrganizationsService>[1],
    );

    await expect(
      service.getOrganization('org-1', actor),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('scopes organization list for non-platform admins', async () => {
    const prismaService = {
      organization: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const service = new OrganizationsService(
      prismaService as unknown as ConstructorParameters<
        typeof OrganizationsService
      >[0],
      {} as ConstructorParameters<typeof OrganizationsService>[1],
    );

    await service.listOrganizations({
      ...actor,
      roles: [
        {
          name: 'clientAdmin',
          scopeType: 'organization',
          organizationId: 'organization-1',
        },
      ],
    });

    expect(prismaService.organization.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: {
            in: ['organization-1'],
          },
        },
      }),
    );
  });

  it('does not scope organization list for platform admins', async () => {
    const prismaService = {
      organization: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const service = new OrganizationsService(
      prismaService as unknown as ConstructorParameters<
        typeof OrganizationsService
      >[0],
      {} as ConstructorParameters<typeof OrganizationsService>[1],
    );

    await service.listOrganizations({
      ...actor,
      roles: [{ name: 'superAdmin', scopeType: 'global' }],
    });

    expect(prismaService.organization.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
      }),
    );
  });

  it('exports scoped organizations as CSV', async () => {
    const prismaService = {
      organization: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'organization-1',
            name: 'Example Health',
            type: 'client',
            website: 'https://example.org',
            contactEmail: 'admin@example.org',
            contactNumber: '+15555550100',
            status: OrganizationStatus.ACTIVE,
            address: '100 Example Street',
            companyBio: 'Example org',
            startedYear: 2015,
            createdAt: new Date('2026-06-18T10:00:00.000Z'),
            updatedAt: new Date('2026-06-18T10:05:00.000Z'),
            createdBy: {
              id: 'profile-1',
              email: 'creator@example.org',
            },
            _count: {
              practices: 2,
              providers: 4,
              roleAssignments: 6,
            },
          },
        ]),
      },
    };
    const service = new OrganizationsService(
      prismaService as unknown as ConstructorParameters<
        typeof OrganizationsService
      >[0],
      {} as ConstructorParameters<typeof OrganizationsService>[1],
    );

    await expect(
      service.exportOrganizations({
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
        '"id","name","type","status","contactEmail","contactNumber","website","startedYear","createdByEmail","practiceCount","providerCount","roleAssignmentCount","createdAt","updatedAt"',
        '"organization-1","Example Health","client","ACTIVE","admin@example.org","+15555550100","https://example.org","2015","creator@example.org","2","4","6","2026-06-18T10:00:00.000Z","2026-06-18T10:05:00.000Z"',
      ].join('\n'),
    );

    expect(prismaService.organization.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: {
            in: ['organization-1'],
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: expect.any(Object) as Record<string, unknown>,
      }),
    );
  });

  it('lists practices for a readable organization', async () => {
    const prismaService = {
      organization: {
        findFirst: jest.fn().mockResolvedValue({ id: 'organization-1' }),
      },
      practice: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const service = new OrganizationsService(
      prismaService as unknown as ConstructorParameters<
        typeof OrganizationsService
      >[0],
      {} as ConstructorParameters<typeof OrganizationsService>[1],
    );

    await service.listOrganizationPractices('organization-1', {
      ...actor,
      roles: [
        {
          name: 'clientAdmin',
          scopeType: 'organization',
          organizationId: 'organization-1',
        },
      ],
    });

    expect(prismaService.organization.findFirst).toHaveBeenCalledWith({
      where: {
        AND: [
          {
            id: 'organization-1',
          },
          {
            id: {
              in: ['organization-1'],
            },
          },
        ],
      },
      select: {
        id: true,
      },
    });
    expect(prismaService.practice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: 'organization-1',
        },
      }),
    );
  });

  it('lists users assigned to a readable organization', async () => {
    const prismaService = {
      organization: {
        findFirst: jest.fn().mockResolvedValue({ id: 'organization-1' }),
      },
      profile: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const service = new OrganizationsService(
      prismaService as unknown as ConstructorParameters<
        typeof OrganizationsService
      >[0],
      {} as ConstructorParameters<typeof OrganizationsService>[1],
    );

    await service.listOrganizationUsers('organization-1', {
      ...actor,
      roles: [{ name: 'superAdmin', scopeType: 'global' }],
    });

    expect(prismaService.organization.findFirst).toHaveBeenCalledWith({
      where: {
        AND: [
          {
            id: 'organization-1',
          },
          {},
        ],
      },
      select: {
        id: true,
      },
    });
    expect(prismaService.profile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          roleAssignments: {
            some: {
              organizationId: 'organization-1',
              revokedAt: null,
            },
          },
        },
      }),
    );
  });

  it('lists providers for a readable organization', async () => {
    const prismaService = {
      organization: {
        findFirst: jest.fn().mockResolvedValue({ id: 'organization-1' }),
      },
      provider: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const service = new OrganizationsService(
      prismaService as unknown as ConstructorParameters<
        typeof OrganizationsService
      >[0],
      {} as ConstructorParameters<typeof OrganizationsService>[1],
    );

    await service.listOrganizationProviders('organization-1', {
      ...actor,
      roles: [
        {
          name: 'clientAdmin',
          scopeType: 'organization',
          organizationId: 'organization-1',
        },
      ],
    });

    expect(prismaService.organization.findFirst).toHaveBeenCalledWith({
      where: {
        AND: [
          {
            id: 'organization-1',
          },
          {
            id: {
              in: ['organization-1'],
            },
          },
        ],
      },
      select: {
        id: true,
      },
    });
    expect(prismaService.provider.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: 'organization-1',
        },
        include: {
          practice: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    );
  });

  it('creates an organization and records an audit log', async () => {
    const organization = {
      id: 'org-1',
      name: 'Radeion Test Org',
      type: 'client',
      contactEmail: 'admin@example.com',
    };
    const prismaService = {
      organization: {
        create: jest.fn().mockResolvedValue(organization),
      },
    };
    const auditService = {
      record: jest.fn().mockResolvedValue(undefined),
    };
    const service = new OrganizationsService(
      prismaService as unknown as ConstructorParameters<
        typeof OrganizationsService
      >[0],
      auditService as unknown as ConstructorParameters<
        typeof OrganizationsService
      >[1],
    );

    await expect(
      service.createOrganization(
        {
          name: 'Radeion Test Org',
          type: 'client',
          contactEmail: 'ADMIN@EXAMPLE.COM',
        },
        actor,
      ),
    ).resolves.toEqual(organization);

    expect(prismaService.organization.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          contactEmail: 'admin@example.com',
          createdById: 'actor-1',
          status: OrganizationStatus.ACTIVE,
        }) as Record<string, unknown>,
      }),
    );
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'organization.created',
        targetId: 'org-1',
      }),
    );
  });

  it('updates an organization and records changed fields', async () => {
    const organization = {
      id: 'org-1',
      name: 'Updated Org',
      type: 'client',
    };
    const prismaService = {
      organization: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'org-1',
          status: OrganizationStatus.ACTIVE,
        }),
        update: jest.fn().mockResolvedValue(organization),
      },
    };
    const auditService = {
      record: jest.fn().mockResolvedValue(undefined),
    };
    const service = new OrganizationsService(
      prismaService as unknown as ConstructorParameters<
        typeof OrganizationsService
      >[0],
      auditService as unknown as ConstructorParameters<
        typeof OrganizationsService
      >[1],
    );

    await expect(
      service.updateOrganization(
        'org-1',
        {
          name: 'Updated Org',
          contactEmail: 'UPDATED@EXAMPLE.COM',
        },
        actor,
      ),
    ).resolves.toEqual(organization);

    expect(prismaService.organization.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          contactEmail: 'updated@example.com',
          name: 'Updated Org',
        }) as Record<string, unknown>,
      }),
    );
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'organization.updated',
      }),
    );
  });

  it('changes organization status and records an audit log', async () => {
    const organization = {
      id: 'org-1',
      status: OrganizationStatus.DISABLED,
    };
    const prismaService = {
      organization: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'org-1',
          status: OrganizationStatus.ACTIVE,
        }),
        update: jest.fn().mockResolvedValue(organization),
      },
    };
    const auditService = {
      record: jest.fn().mockResolvedValue(undefined),
    };
    const service = new OrganizationsService(
      prismaService as unknown as ConstructorParameters<
        typeof OrganizationsService
      >[0],
      auditService as unknown as ConstructorParameters<
        typeof OrganizationsService
      >[1],
    );

    await expect(
      service.updateOrganizationStatus(
        'org-1',
        { status: 'disabled', reason: 'contract ended' },
        actor,
      ),
    ).resolves.toEqual(organization);

    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'organization.statusChanged',
        targetId: 'org-1',
      }),
    );
  });

  it('rejects no-op status changes', async () => {
    const prismaService = {
      organization: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'org-1',
          status: OrganizationStatus.ACTIVE,
        }),
      },
    };
    const service = new OrganizationsService(
      prismaService as unknown as ConstructorParameters<
        typeof OrganizationsService
      >[0],
      {} as ConstructorParameters<typeof OrganizationsService>[1],
    );

    await expect(
      service.updateOrganizationStatus('org-1', { status: 'active' }, actor),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
