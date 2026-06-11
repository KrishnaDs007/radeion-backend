import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';
import { AuthController } from '../src/auth/auth.controller';
import { HealthController } from '../src/health/health.controller';
import { HealthService } from '../src/health/health.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Public routes (e2e)', () => {
  let app: INestApplication<App>;
  const prismaService = {
    $queryRaw: jest.fn().mockResolvedValue([{ result: 1 }]),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AppController, AuthController, HealthController],
      providers: [
        AppService,
        HealthService,
        {
          provide: ConfigService,
          useValue: new ConfigService({
            CACHE_DRIVER: 'memory',
            SUPABASE_URL: 'https://example.supabase.co',
            SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
          }),
        },
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  it('returns the root status message', async () => {
    await request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Radeion Backend is running');
  });

  it('returns public health status', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        status: 'ok',
        service: 'radeion-backend',
        timestamp: expect.any(String) as string,
      }),
    );
  });

  it('returns configuration presence without secret values', async () => {
    const response = await request(app.getHttpServer())
      .get('/health/config')
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        supabase: {
          url: expect.any(Boolean) as boolean,
          publishableKey: expect.any(Boolean) as boolean,
          secretKey: expect.any(Boolean) as boolean,
        },
        cache: {
          driver: 'memory',
        },
      }),
    );
    expect(JSON.stringify(response.body)).not.toContain('publishable-key');
  });

  it('checks database health through Prisma', async () => {
    await request(app.getHttpServer())
      .get('/health/database')
      .expect(200)
      .expect({
        connected: true,
      });

    expect(prismaService.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('returns supported auth methods', async () => {
    await request(app.getHttpServer())
      .get('/auth/methods')
      .expect(200)
      .expect({
        methods: ['emailPassword'],
        emailVerificationRequired: true,
        approvalRequiredForSignup: true,
        inviteRequiresPasswordSetup: true,
      });
  });
});
