import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { CacheService } from '../src/cache/cache.service';
import { HealthController } from '../src/health/health.controller';
import { HealthService } from '../src/health/health.service';
import { InvitesController } from '../src/invites/invites.controller';
import { InvitesService } from '../src/invites/invites.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { SupabaseService } from '../src/supabase/supabase.service';

describe('Public routes (e2e)', () => {
  let app: INestApplication<App>;
  const prismaService = {
    $queryRaw: jest.fn().mockResolvedValue([{ result: 1 }]),
  };
  const cacheService = {
    get: jest.fn().mockResolvedValue({
      ok: true,
    }),
    set: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  };
  const supabaseService = {
    requestPasswordRecovery: jest.fn().mockResolvedValue(undefined),
  };
  const invitesService = {
    previewInvite: jest.fn().mockResolvedValue({
      email: 'user@example.org',
      organizationId: 'organization-1',
      status: 'PENDING',
      expiresAt: null,
      acceptedAt: null,
    }),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [
        AppController,
        AuthController,
        HealthController,
        InvitesController,
      ],
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
            PASSWORD_RECOVERY_REDIRECT_URL:
              'https://app.example.com/password/recover',
          }),
        },
        AuthService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
        {
          provide: CacheService,
          useValue: cacheService,
        },
        {
          provide: SupabaseService,
          useValue: supabaseService,
        },
        {
          provide: InvitesService,
          useValue: invitesService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    );
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
          passwordRecoveryRedirectUrl: true,
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

  it('checks cache health through the configured cache service', async () => {
    await request(app.getHttpServer()).get('/health/cache').expect(200).expect({
      connected: true,
      driver: 'memory',
    });

    expect(cacheService.set).toHaveBeenCalledWith(
      expect.stringMatching(/^health:cache:/),
      {
        ok: true,
      },
      {
        ttlSeconds: 10,
      },
    );
    expect(cacheService.delete).toHaveBeenCalledWith(
      expect.stringMatching(/^health:cache:/),
    );
  });

  it('checks email health without exposing secrets', async () => {
    await request(app.getHttpServer())
      .get('/health/email')
      .expect(200)
      .expect({
        driver: 'disabled',
        inviteDelivery: {
          configured: false,
          ready: false,
          requires: [],
        },
        passwordRecovery: {
          configured: true,
          redirectUrl: true,
        },
      });
  });

  it('checks Databricks health without exposing secrets', async () => {
    const response = await request(app.getHttpServer())
      .get('/health/databricks')
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        ready: false,
        connection: {
          host: true,
          token: true,
          httpPath: true,
          warehouseId: false,
          missing: [],
        },
        datasets: expect.objectContaining({
          claims: expect.objectContaining({
            ready: true,
          }) as Record<string, unknown>,
          providers: expect.objectContaining({
            ready: false,
          }) as Record<string, unknown>,
        }) as Record<string, unknown>,
        missing: expect.arrayContaining([
          'DATABRICKS_PROVIDERS_TABLE',
        ]) as string[],
      }),
    );
    expect(JSON.stringify(response.body)).not.toContain('databricks-token');
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
        passwordRecoveryEnabled: true,
      });
  });

  it('requests password recovery without requiring authentication', async () => {
    await request(app.getHttpServer())
      .post('/auth/password-recovery')
      .send({
        email: 'USER@example.org',
      })
      .expect(201)
      .expect({
        status: 'requested',
        message:
          'If an account exists for this email, a password recovery email will be sent.',
      });

    expect(supabaseService.requestPasswordRecovery).toHaveBeenCalledWith({
      email: 'user@example.org',
      redirectTo: 'https://app.example.com/password/recover',
    });
  });

  it('previews an invite without requiring authentication', async () => {
    await request(app.getHttpServer())
      .post('/invites/preview')
      .send({
        inviteToken: 'valid-invite-token-value-with-enough-length',
      })
      .expect(201)
      .expect({
        data: {
          email: 'user@example.org',
          organizationId: 'organization-1',
          status: 'PENDING',
          expiresAt: null,
          acceptedAt: null,
        },
      });

    expect(invitesService.previewInvite).toHaveBeenCalledWith({
      inviteToken: 'valid-invite-token-value-with-enough-length',
    });
  });
});
