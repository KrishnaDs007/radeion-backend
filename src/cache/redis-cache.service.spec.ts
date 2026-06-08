import { RedisCacheService } from './redis-cache.service';

const client = {
  isOpen: false,
  on: jest.fn(),
  connect: jest.fn(() => {
    client.isOpen = true;
    return Promise.resolve();
  }),
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  flushDb: jest.fn(),
  quit: jest.fn(() => {
    client.isOpen = false;
    return Promise.resolve();
  }),
};

jest.mock('redis', () => ({
  createClient: jest.fn(() => client),
}));

describe('RedisCacheService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    client.isOpen = false;
  });

  it('serializes values with ttl when setting cache entries', async () => {
    const service = new RedisCacheService('redis://localhost:6379');

    await service.set('key', { value: 'cached' }, { ttlSeconds: 60 });

    expect(client.connect).toHaveBeenCalledTimes(1);
    expect(client.set).toHaveBeenCalledWith('key', '{"value":"cached"}', {
      EX: 60,
    });
  });

  it('deserializes cached values', async () => {
    client.get.mockResolvedValueOnce('{"value":"cached"}');
    const service = new RedisCacheService('redis://localhost:6379');

    await expect(service.get<{ value: string }>('key')).resolves.toEqual({
      value: 'cached',
    });
  });
});
