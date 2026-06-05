import { ConfigService } from '@nestjs/config';
import type { UserContext } from '../auth/auth.types';
import { DataQueryService } from './data-query.service';

describe('DataQueryService', () => {
  const databricksService = {
    executeStatement: jest.fn(),
  };
  const service = new DataQueryService(
    new ConfigService(),
    databricksService as unknown as ConstructorParameters<
      typeof DataQueryService
    >[1],
  );

  it('does not scope platform users', () => {
    const user: UserContext = {
      profileId: 'profile-1',
      authUserId: 'auth-user-1',
      status: 'ACTIVE',
      roles: [{ name: 'developer', scopeType: 'global' }],
    };

    expect(
      service.buildStatement(
        'claims',
        { dateColumn: 'service_date' },
        { limit: 25, offset: 10 },
        user,
      ),
    ).toBe('SELECT * FROM claims LIMIT 25 OFFSET 10');
  });

  it('adds role scope and request filters for scoped users', () => {
    const user: UserContext = {
      profileId: 'profile-1',
      authUserId: 'auth-user-1',
      status: 'ACTIVE',
      roles: [
        {
          name: 'practice',
          scopeType: 'practice',
          scopeId: 'practice-1',
          organizationId: 'organization-1',
        },
      ],
    };

    expect(
      service.buildStatement(
        'claims',
        { dateColumn: 'service_date' },
        {
          patientId: "patient-'1",
          fromDate: '2026-01-01',
          toDate: '2026-01-31',
        },
        user,
      ),
    ).toBe(
      "SELECT * FROM claims WHERE (organization_id IN ('organization-1') OR practice_id IN ('practice-1')) AND patient_id = 'patient-''1' AND service_date >= DATE '2026-01-01' AND service_date <= DATE '2026-01-31' LIMIT 100 OFFSET 0",
    );
  });

  it('blocks users with no useful data scope', () => {
    const user: UserContext = {
      profileId: 'profile-1',
      authUserId: 'auth-user-1',
      status: 'ACTIVE',
      roles: [{ name: 'provider' }],
    };

    expect(service.buildStatement('providers', {}, {}, user)).toBe(
      'SELECT * FROM providers WHERE 1 = 0 LIMIT 100 OFFSET 0',
    );
  });
});
