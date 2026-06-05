import { AuditService } from './audit.service';

describe('AuditService', () => {
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
