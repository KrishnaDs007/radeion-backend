import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  it('does not fail application startup when the database is unavailable', async () => {
    const service = new PrismaService();
    jest.spyOn(service, '$connect').mockRejectedValue(new Error('unavailable'));

    await expect(service.onModuleInit()).resolves.toBeUndefined();
  });
});
