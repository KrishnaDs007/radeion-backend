import { ReferenceDataService } from './reference-data.service';

describe('ReferenceDataService', () => {
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
          profileId: 'profile-1',
          authUserId: 'auth-user-1',
          status: 'ACTIVE',
          roles: [],
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
