import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  getAccessibleOrganizationIds,
  hasPlatformAccess,
} from '../auth/auth-scope.util';
import type { UserContext } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDataQueryPresetDto } from './dto/create-data-query-preset.dto';
import { ListDataQueryPresetsDto } from './dto/list-data-query-presets.dto';
import { UpdateDataQueryPresetDto } from './dto/update-data-query-preset.dto';

const DEFAULT_PRESET_LIMIT = 50;

@Injectable()
export class DataQueryPresetsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async list(query: ListDataQueryPresetsDto, actor: UserContext) {
    const limit = Number(query.limit ?? DEFAULT_PRESET_LIMIT);
    const offset = Number(query.offset ?? 0);
    const where = {
      ownerProfileId: actor.profileId,
      dataSet: query.dataSet,
      organizationId: query.organizationId,
    };

    const [data, total] = await Promise.all([
      this.prismaService.dataQueryPreset.findMany({
        where,
        orderBy: {
          updatedAt: 'desc',
        },
        skip: offset,
        take: limit,
        include: this.includeRelations(),
      }),
      this.prismaService.dataQueryPreset.count({ where }),
    ]);

    return {
      data,
      page: this.buildPage(limit, offset, total),
    };
  }

  async create(input: CreateDataQueryPresetDto, actor: UserContext) {
    this.ensureOrganizationAccess(input.organizationId, actor);

    try {
      const preset = await this.prismaService.dataQueryPreset.create({
        data: {
          ownerProfileId: actor.profileId,
          organizationId: input.organizationId,
          name: input.name,
          dataSet: input.dataSet,
          query: this.toJson(input.query),
        },
        include: this.includeRelations(),
      });

      await this.auditService.record({
        actorProfileId: actor.profileId,
        action: 'dataQueryPreset.created',
        targetType: 'dataQueryPreset',
        targetId: preset.id,
        organizationId: preset.organizationId ?? undefined,
        metadata: {
          dataSet: preset.dataSet,
          name: preset.name,
        },
      });

      return preset;
    } catch (error) {
      this.handleUniqueNameError(error);
      throw error;
    }
  }

  async update(
    id: string,
    input: UpdateDataQueryPresetDto,
    actor: UserContext,
  ) {
    const existing = await this.getOwnedPreset(id, actor);
    this.ensureOrganizationAccess(input.organizationId, actor);

    try {
      const preset = await this.prismaService.dataQueryPreset.update({
        where: {
          id: existing.id,
        },
        data: this.removeUndefined({
          organizationId: input.organizationId,
          name: input.name,
          dataSet: input.dataSet,
          query: input.query ? this.toJson(input.query) : undefined,
        }),
        include: this.includeRelations(),
      });

      await this.auditService.record({
        actorProfileId: actor.profileId,
        action: 'dataQueryPreset.updated',
        targetType: 'dataQueryPreset',
        targetId: preset.id,
        organizationId: preset.organizationId ?? undefined,
        metadata: {
          updatedFields: Object.keys(this.removeUndefined({ ...input })),
        },
      });

      return preset;
    } catch (error) {
      this.handleUniqueNameError(error);
      throw error;
    }
  }

  async delete(id: string, actor: UserContext) {
    const existing = await this.getOwnedPreset(id, actor);
    const preset = await this.prismaService.dataQueryPreset.delete({
      where: {
        id: existing.id,
      },
      include: this.includeRelations(),
    });

    await this.auditService.record({
      actorProfileId: actor.profileId,
      action: 'dataQueryPreset.deleted',
      targetType: 'dataQueryPreset',
      targetId: preset.id,
      organizationId: preset.organizationId ?? undefined,
      metadata: {
        dataSet: preset.dataSet,
        name: preset.name,
      },
    });

    return preset;
  }

  private async getOwnedPreset(id: string, actor: UserContext) {
    const preset = await this.prismaService.dataQueryPreset.findFirst({
      where: {
        id,
        ownerProfileId: actor.profileId,
      },
      select: {
        id: true,
      },
    });

    if (!preset) {
      throw new NotFoundException('Data query preset not found');
    }

    return preset;
  }

  private ensureOrganizationAccess(
    organizationId: string | undefined,
    actor: UserContext,
  ) {
    if (!organizationId || hasPlatformAccess(actor)) {
      return;
    }

    if (!getAccessibleOrganizationIds(actor).includes(organizationId)) {
      throw new ForbiddenException('Organization is outside your scope');
    }
  }

  private includeRelations() {
    return {
      organization: {
        select: {
          id: true,
          name: true,
        },
      },
    };
  }

  private buildPage(limit: number, offset: number, total: number) {
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

  private toJson(value: unknown): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
  }

  private removeUndefined<T extends Record<string, unknown>>(
    input: T,
  ): Partial<T> {
    return Object.fromEntries(
      Object.entries(input).filter(([, value]) => value !== undefined),
    ) as Partial<T>;
  }

  private handleUniqueNameError(error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new BadRequestException('A preset with this name already exists');
    }
  }
}
