import { AuditService } from './audit.service';

describe('AuditService', () => {
  it('lists audit logs with filters and page metadata', async () => {
    const auditLogs = [
      {
        id: 'audit-log-1',
        action: 'organization.created',
      },
    ];
    const prismaService = {
      auditLog: {
        findMany: jest.fn().mockResolvedValue(auditLogs),
        count: jest.fn().mockResolvedValue(12),
      },
    };
    const service = new AuditService(prismaService as never);

    await expect(
      service.list({
        actorProfileId: '00000000-0000-0000-0000-000000000001',
        action: 'organization.created',
        targetType: 'organization',
        organizationId: '00000000-0000-0000-0000-000000000002',
        fromDate: '2026-06-01T00:00:00.000Z',
        toDate: '2026-06-12T00:00:00.000Z',
        limit: 5,
        offset: 5,
      }),
    ).resolves.toEqual({
      data: auditLogs,
      page: {
        limit: 5,
        offset: 5,
        total: 12,
        nextOffset: 10,
        hasNextPage: true,
      },
    });

    expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          actorProfileId: '00000000-0000-0000-0000-000000000001',
          action: 'organization.created',
          targetType: 'organization',
          organizationId: '00000000-0000-0000-0000-000000000002',
          createdAt: {
            gte: new Date('2026-06-01T00:00:00.000Z'),
            lte: new Date('2026-06-12T00:00:00.000Z'),
          },
        }) as Record<string, unknown>,
        orderBy: {
          createdAt: 'desc',
        },
        skip: 5,
        take: 5,
      }),
    );
    expect(prismaService.auditLog.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        action: 'organization.created',
      }) as Record<string, unknown>,
    });
  });

  it('records audit log input through Prisma', async () => {
    const auditLog = {
      id: 'audit-log-1',
      action: 'organization.created',
    };
    const prismaService = {
      auditLog: {
        create: jest.fn().mockResolvedValue(auditLog),
      },
    };
    const service = new AuditService(prismaService as never);

    await expect(
      service.record({
        actorProfileId: 'profile-1',
        action: 'organization.created',
        targetType: 'organization',
        targetId: 'organization-1',
        organizationId: 'organization-1',
        metadata: {
          source: 'test',
        },
      }),
    ).resolves.toEqual(auditLog);

    expect(prismaService.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorProfileId: 'profile-1',
        action: 'organization.created',
        targetType: 'organization',
        targetId: 'organization-1',
        organizationId: 'organization-1',
        metadata: {
          source: 'test',
        },
      },
    });
  });
});
