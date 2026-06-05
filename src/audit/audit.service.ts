import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAuditLogInput } from './audit.types';

@Injectable()
export class AuditService {
  constructor(private readonly prismaService: PrismaService) {}

  async record(input: CreateAuditLogInput) {
    return this.prismaService.auditLog.create({
      data: {
        actorProfileId: input.actorProfileId,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        organizationId: input.organizationId,
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }
}
