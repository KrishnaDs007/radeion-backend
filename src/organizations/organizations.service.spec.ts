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
