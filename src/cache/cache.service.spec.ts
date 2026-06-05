import { CacheService } from './cache.service';
import { InMemoryCacheService } from './in-memory-cache.service';

describe('CacheService', () => {
  let service: CacheService;

  beforeEach(() => {
    service = new CacheService(new InMemoryCacheService());
  });

  it('stores and returns cached values', () => {
    service.set('key', { value: 'cached' });

    expect(service.get<{ value: string }>('key')).toEqual({ value: 'cached' });
  });

  it('uses the factory only when a value is missing', async () => {
    const factory = jest.fn<Promise<string>, []>().mockResolvedValue('fresh');

    await expect(
      service.remember('key', factory, { ttlSeconds: 60 }),
    ).resolves.toBe('fresh');
    await expect(
      service.remember('key', factory, { ttlSeconds: 60 }),
    ).resolves.toBe('fresh');

    expect(factory).toHaveBeenCalledTimes(1);
  });
});
