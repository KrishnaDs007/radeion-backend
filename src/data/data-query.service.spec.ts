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

  afterEach(() => {
    jest.clearAllMocks();
  });

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

  it('returns page metadata for Databricks reads', async () => {
    const user: UserContext = {
      profileId: 'profile-1',
      authUserId: 'auth-user-1',
      status: 'ACTIVE',
      roles: [{ name: 'developer', scopeType: 'global' }],
    };
    databricksService.executeStatement.mockResolvedValueOnce({
      status: { state: 'SUCCEEDED' },
      result: {
        data_array: [['claim-1'], ['claim-2']],
      },
    });

    await expect(
      service.listClaims({ limit: 2, offset: 4 }, user),
    ).resolves.toEqual({
      data: {
        status: { state: 'SUCCEEDED' },
        result: {
          data_array: [['claim-1'], ['claim-2']],
        },
      },
      page: {
        limit: 2,
        offset: 4,
        returnedRowCount: 2,
        nextOffset: 6,
        hasNextPage: true,
        includedResultChunks: false,
        resultChunkCount: 0,
        hasMoreResultChunks: false,
      },
    });

    expect(databricksService.executeStatement).toHaveBeenCalledWith({
      statement: 'SELECT * FROM claims LIMIT 2 OFFSET 4',
      waitTimeout: '10s',
      onWaitTimeout: 'CONTINUE',
      fetchAllResultChunks: false,
    });
  });

  it('requests and counts Databricks result chunks when included', async () => {
    const user: UserContext = {
      profileId: 'profile-1',
      authUserId: 'auth-user-1',
      status: 'ACTIVE',
      roles: [{ name: 'developer', scopeType: 'global' }],
    };
    databricksService.executeStatement.mockResolvedValueOnce({
      status: { state: 'SUCCEEDED' },
      result: {
        data_array: [['provider-1']],
      },
      result_chunks: [
        {
          data_array: [['provider-2']],
          next_chunk_internal_link: '/next',
        },
      ],
    });

    await expect(
      service.listProviders({ limit: 5, includeResultChunks: true }, user),
    ).resolves.toEqual(
      expect.objectContaining({
        page: {
          limit: 5,
          offset: 0,
          returnedRowCount: 2,
          nextOffset: null,
          hasNextPage: false,
          includedResultChunks: true,
          resultChunkCount: 1,
          hasMoreResultChunks: true,
        },
      }),
    );

    expect(databricksService.executeStatement).toHaveBeenCalledWith(
      expect.objectContaining({
        fetchAllResultChunks: true,
      }),
    );
  });
});
