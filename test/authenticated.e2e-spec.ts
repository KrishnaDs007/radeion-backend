import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthContextService } from '../src/auth/auth-context.service';
import { PrismaService } from '../src/prisma/prisma.service';

type UsersResponseBody = {
  data: Array<{
    email: string;
  }>;
};

describe('Authenticated routes (e2e)', () => {
  let app: INestApplication<App> | undefined;
  const originalEnv = { ...process.env };
  const authContextService = {
    getUserContextFromToken: jest.fn(),
  };
  const prismaService = {
    profile: {
      findMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  beforeAll(async () => {
    Object.assign(process.env, {
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_PUBLISHABLE_KEY: 'publishable',
      SUPABASE_SECRET_KEY: 'secret',
      DATABASE_URL: 'postgresql://user:password@localhost:5432/app',
      DIRECT_URL: 'postgresql://user:password@localhost:5432/app',
      DATABRICKS_HOST: 'https://example.cloud.databricks.com',
      DATABRICKS_TOKEN: 'token',
      DATABRICKS_HTTP_PATH: '/sql/1.0/warehouses/warehouse-id',
      CACHE_DRIVER: 'memory',
      EMAIL_DRIVER: 'disabled',
    });

    const { AppModule } =
      jest.requireActual<typeof import('../src/app.module')>(
        '../src/app.module',
      );
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AuthContextService)
      .useValue(authContextService)
      .overrideProvider(PrismaService)
      .useValue(prismaService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    process.env = originalEnv;
    await app?.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    prismaService.profile.findMany.mockResolvedValue([
      {
        id: 'profile-1',
        authUserId: 'auth-user-1',
        email: 'developer@example.com',
        firstName: null,
        lastName: null,
        status: 'ACTIVE',
        createdAt: new Date('2026-06-11T00:00:00.000Z'),
        updatedAt: new Date('2026-06-11T00:00:00.000Z'),
        roleAssignments: [],
      },
    ]);
  });

  function getHttpServer() {
    if (!app) {
      throw new Error('Test app was not initialized');
    }

    return app.getHttpServer();
  }

  it('rejects protected routes without a bearer token', async () => {
    await request(getHttpServer()).get('/users').expect(401);
  });

  it('allows a developer user to read protected users', async () => {
    authContextService.getUserContextFromToken.mockResolvedValue({
      profileId: 'profile-1',
      authUserId: 'auth-user-1',
      email: 'developer@example.com',
      status: 'ACTIVE',
      roles: [
        {
          name: 'developer',
          scopeType: 'global',
        },
      ],
    });

    const response = await request(getHttpServer())
      .get('/users')
      .set('Authorization', 'Bearer developer-token')
      .expect(200);

    expect(authContextService.getUserContextFromToken).toHaveBeenCalledWith(
      'developer-token',
    );
    expect(prismaService.profile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
      }),
    );
    const body = response.body as UsersResponseBody;
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toEqual(
      expect.objectContaining({
        email: 'developer@example.com',
      }),
    );
  });

  it('rejects authenticated users without the required permission', async () => {
    authContextService.getUserContextFromToken.mockResolvedValue({
      profileId: 'profile-2',
      authUserId: 'auth-user-2',
      email: 'provider@example.com',
      status: 'ACTIVE',
      roles: [
        {
          name: 'provider',
          scopeType: 'organization',
          organizationId: 'organization-1',
        },
      ],
    });

    await request(getHttpServer())
      .get('/roles')
      .set('Authorization', 'Bearer provider-token')
      .expect(403);
  });
});
