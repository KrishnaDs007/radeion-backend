import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAuditLogInput } from './audit.types';
import { ListAuditLogsDto } from './dto/list-audit-logs.dto';

const DEFAULT_AUDIT_LOG_LIMIT = 50;

type AuditLogPage = {
  limit: number;
  offset: number;
  total: number;
  nextOffset: number | null;
  hasNextPage: boolean;
};

@Injectable()
export class AuditService {
  constructor(private readonly prismaService: PrismaService) {}

  async list(query: ListAuditLogsDto) {
    const limit = Number(query.limit ?? DEFAULT_AUDIT_LOG_LIMIT);
    const offset = Number(query.offset ?? 0);
    const where = this.buildListWhere(query);
    const [data, total] = await Promise.all([
      this.prismaService.auditLog.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip: offset,
        take: limit,
        include: {
          actor: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prismaService.auditLog.count({ where }),
    ]);

    return {
      data,
      page: this.buildPage(limit, offset, total),
    };
  }

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

  private buildListWhere(query: ListAuditLogsDto): Prisma.AuditLogWhereInput {
    return {
      actorProfileId: query.actorProfileId,
      action: query.action,
      targetType: query.targetType,
      targetId: query.targetId,
      organizationId: query.organizationId,
      createdAt:
        query.fromDate || query.toDate
          ? {
              gte: query.fromDate ? new Date(query.fromDate) : undefined,
              lte: query.toDate ? new Date(query.toDate) : undefined,
            }
          : undefined,
    };
  }

  private buildPage(
    limit: number,
    offset: number,
    total: number,
  ): AuditLogPage {
    const nextOffset = offset + limit;
    const hasNextPage = nextOffset < total;

    return {
      limit,
      offset,
      total,
      nextOffset: hasNextPage ? nextOffset : null,
      hasNextPage,
    };
  }
}
