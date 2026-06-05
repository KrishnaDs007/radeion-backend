import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AclModule } from './acl/acl.module';
import { AccessRequestsModule } from './access-requests/access-requests.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { CacheModule } from './cache/cache.module';
import { RequestContextMiddleware } from './common/middleware/request-context.middleware';
import { DataModule } from './data/data.module';
import { HealthModule } from './health/health.module';
import { InvitesModule } from './invites/invites.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { PrismaModule } from './prisma/prisma.module';
import { ReferenceDataModule } from './reference-data/reference-data.module';
import { RolesModule } from './roles/roles.module';
import { SupabaseModule } from './supabase/supabase.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    SupabaseModule,
    AccessRequestsModule,
    AuditModule,
    AuthModule,
    AclModule,
    CacheModule,
    HealthModule,
    InvitesModule,
    ReferenceDataModule,
    RolesModule,
    UsersModule,
    OrganizationsModule,
    DataModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
