import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { UserContext } from '../auth/auth.types';
import { DataQueryPresetsService } from './data-query-presets.service';

describe('DataQueryPresetsService', () => {
  const actor: UserContext = {
    profileId: 'profile-1',
    authUserId: 'auth-user-1',
    status: 'ACTIVE',
    roles: [
      {
        name: 'clientAdmin',
        scopeType: 'organization',
        organizationId: 'organization-1',
      },
    ],
  };

  it('lists only presets owned by the current user', async () => {
    const presets = [
      {
        id: 'preset-1',
        name: 'Recent claims',
      },
    ];
    const prismaService = {
      dataQueryPreset: {
        findMany: jest.fn().mockResolvedValue(presets),
        count: jest.fn().mockResolvedValue(1),
      },
    };
    const service = new DataQueryPresetsService(
      prismaService as unknown as ConstructorParameters<
        typeof DataQueryPresetsService
      >[0],
      {} as ConstructorParameters<typeof DataQueryPresetsService>[1],
    );

    await expect(
      service.list({ dataSet: 'claims', limit: 25, offset: 0 }, actor),
    ).resolves.toEqual({
      data: presets,
      page: {
        limit: 25,
        offset: 0,
        total: 1,
        nextOffset: null,
        hasNextPage: false,
      },
    });

    expect(prismaService.dataQueryPreset.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          ownerProfileId: 'profile-1',
          dataSet: 'claims',
          organizationId: undefined,
        },
      }),
    );
  });

  it('creates scoped presets and records an audit log', async () => {
    const preset = {
      id: 'preset-1',
      name: 'Recent claims',
      dataSet: 'claims',
      organizationId: 'organization-1',
    };
    const prismaService = {
      dataQueryPreset: {
        create: jest.fn().mockResolvedValue(preset),
      },
    };
    const auditService = {
      record: jest.fn().mockResolvedValue(undefined),
    };
    const service = new DataQueryPresetsService(
      prismaService as unknown as ConstructorParameters<
        typeof DataQueryPresetsService
      >[0],
      auditService as unknown as ConstructorParameters<
        typeof DataQueryPresetsService
      >[1],
    );

    await expect(
      service.create(
        {
          name: 'Recent claims',
          dataSet: 'claims',
          organizationId: 'organization-1',
          query: {
            organizationId: 'organization-1',
            sortBy: 'date',
            sortDirection: 'desc',
            limit: 50,
          },
        },
        actor,
      ),
    ).resolves.toEqual(preset);

    expect(prismaService.dataQueryPreset.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ownerProfileId: 'profile-1',
          organizationId: 'organization-1',
          dataSet: 'claims',
        }) as Record<string, unknown>,
      }),
    );
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'dataQueryPreset.created',
        targetType: 'dataQueryPreset',
        targetId: 'preset-1',
        organizationId: 'organization-1',
      }),
    );
  });

  it('rejects scoped presets outside the actor organization scope', async () => {
    const service = new DataQueryPresetsService(
      {} as ConstructorParameters<typeof DataQueryPresetsService>[0],
      {} as ConstructorParameters<typeof DataQueryPresetsService>[1],
    );

    await expect(
      service.create(
        {
          name: 'Other org claims',
          dataSet: 'claims',
          organizationId: 'organization-2',
          query: {},
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('updates only owned presets', async () => {
    const preset = {
      id: 'preset-1',
      name: 'Renamed claims',
      dataSet: 'claims',
      organizationId: 'organization-1',
    };
    const prismaService = {
      dataQueryPreset: {
        findFirst: jest.fn().mockResolvedValue({ id: 'preset-1' }),
        update: jest.fn().mockResolvedValue(preset),
      },
    };
    const auditService = {
      record: jest.fn().mockResolvedValue(undefined),
    };
    const service = new DataQueryPresetsService(
      prismaService as unknown as ConstructorParameters<
        typeof DataQueryPresetsService
      >[0],
      auditService as unknown as ConstructorParameters<
        typeof DataQueryPresetsService
      >[1],
    );

    await expect(
      service.update(
        'preset-1',
        {
          name: 'Renamed claims',
        },
        actor,
      ),
    ).resolves.toEqual(preset);

    expect(prismaService.dataQueryPreset.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'preset-1',
        ownerProfileId: 'profile-1',
      },
      select: {
        id: true,
      },
    });
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'dataQueryPreset.updated',
      }),
    );
  });

  it('converts duplicate preset names to a bad request', async () => {
    const prismaService = {
      dataQueryPreset: {
        create: jest.fn().mockRejectedValue(
          new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
            code: 'P2002',
            clientVersion: 'test',
          }),
        ),
      },
    };
    const service = new DataQueryPresetsService(
      prismaService as unknown as ConstructorParameters<
        typeof DataQueryPresetsService
      >[0],
      {} as ConstructorParameters<typeof DataQueryPresetsService>[1],
    );

    await expect(
      service.create(
        {
          name: 'Recent claims',
          dataSet: 'claims',
          query: {},
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
