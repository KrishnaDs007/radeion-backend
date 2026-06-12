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
            EMAIL_DRIVER: 'disabled',
            SUPABASE_URL: 'https://example.supabase.co',
            SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
            SUPABASE_SECRET_KEY: 'secret-key',
            DATABASE_URL: 'postgresql://user:password@localhost:5432/app',
            DIRECT_URL: 'postgresql://user:password@localhost:5432/app',
            DATABRICKS_HOST: 'https://example.cloud.databricks.com',
            DATABRICKS_TOKEN: 'databricks-token',
            DATABRICKS_HTTP_PATH: '/sql/1.0/warehouses/warehouse-id',
            DATABRICKS_CLAIMS_TABLE: 'claims',
            DATABRICKS_CLAIMS_ORGANIZATION_ID_COLUMN: 'organization_id',
            DATABRICKS_CLAIMS_PRACTICE_ID_COLUMN: 'practice_id',
            DATABRICKS_CLAIMS_PROVIDER_ID_COLUMN: 'provider_id',
            DATABRICKS_CLAIMS_PATIENT_ID_COLUMN: 'patient_id',
            DATABRICKS_CLAIMS_DATE_COLUMN: 'service_date',
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
          url: true,
          publishableKey: true,
          secretKey: true,
        },
        database: {
          databaseUrl: true,
          directUrl: true,
        },
        databricks: {
          host: true,
          token: true,
          httpPath: true,
          warehouseId: false,
          tables: {
            claims: true,
            providers: false,
            patientMetrics: false,
          },
          columnMappings: {
            claims: true,
            providers: false,
            patientMetrics: false,
          },
        },
        cache: {
          driver: 'memory',
        },
        email: {
          driver: 'disabled',
          from: false,
          resendApiKey: false,
          inviteAcceptUrl: false,
        },
      }),
    );
    expect(JSON.stringify(response.body)).not.toContain('publishable-key');
    expect(JSON.stringify(response.body)).not.toContain('secret-key');
    expect(JSON.stringify(response.body)).not.toContain('databricks-token');
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
