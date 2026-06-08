import { ConfigService } from '@nestjs/config';
import { CacheService } from '../cache/cache.service';
import { InMemoryCacheService } from '../cache/in-memory-cache.service';
import { DatabricksService } from './databricks.service';

describe('DatabricksService', () => {
  const createConfigService = () =>
    new ConfigService({
      DATABRICKS_HOST: 'example.cloud.databricks.com',
      DATABRICKS_TOKEN: 'token',
      DATABRICKS_HTTP_PATH: '/sql/1.0/warehouses/warehouse-id',
      DATABRICKS_POLL_INTERVAL_MS: '0',
      DATABRICKS_POLL_MAX_ATTEMPTS: '3',
      DATABRICKS_MAX_RESULT_CHUNKS: '3',
    });

  const createService = () =>
    new DatabricksService(
      createConfigService(),
      new CacheService(new InMemoryCacheService()),
    );

  const jsonResponse = (body: Record<string, unknown>) =>
    new Response(JSON.stringify(body), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('parses a warehouse id from a Databricks HTTP path', () => {
    const service = createService();

    expect(service.parseWarehouseId('/sql/1.0/warehouses/abc123')).toBe(
      'abc123',
    );
  });

  it('polls pending statements until they succeed', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        jsonResponse({
          statement_id: 'statement-1',
          status: { state: 'PENDING' },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          statement_id: 'statement-1',
          status: { state: 'RUNNING' },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          statement_id: 'statement-1',
          status: { state: 'SUCCEEDED' },
          result: { data_array: [['ok']] },
        }),
      );

    await expect(
      createService().executeStatement({ statement: 'SELECT 1' }),
    ).resolves.toEqual(
      expect.objectContaining({
        status: { state: 'SUCCEEDED' },
      }),
    );

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://example.cloud.databricks.com/api/2.0/sql/statements/statement-1',
      expect.objectContaining({
        method: 'GET',
      }),
    );
  });

  it('throws when a statement reaches a failed terminal state', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      jsonResponse({
        statement_id: 'statement-1',
        status: {
          state: 'FAILED',
          error: {
            message: 'bad query',
          },
        },
      }),
    );

    await expect(
      createService().executeStatement({ statement: 'SELECT * FROM nope' }),
    ).rejects.toThrow('Databricks statement FAILED: bad query');
  });

  it('can fetch remaining result chunks when requested', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        jsonResponse({
          statement_id: 'statement-1',
          status: { state: 'SUCCEEDED' },
          result: {
            data_array: [['first']],
            next_chunk_internal_link:
              '/api/2.0/sql/statements/statement-1/result/chunks/1',
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data_array: [['second']],
        }),
      );

    await expect(
      createService().executeStatement({
        statement: 'SELECT 1',
        fetchAllResultChunks: true,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        result_chunks: [
          expect.objectContaining({
            data_array: [['second']],
          }),
        ],
      }),
    );

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://example.cloud.databricks.com/api/2.0/sql/statements/statement-1/result/chunks/1',
      expect.objectContaining({
        method: 'GET',
      }),
    );
  });
});
