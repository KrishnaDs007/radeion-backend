import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AclGuard } from './acl.guard';
import { AclService } from './acl.service';

@Module({
  providers: [
    AclService,
    {
      provide: APP_GUARD,
      useClass: AclGuard,
    },
  ],
  exports: [AclService],
})
export class AclModule {}
