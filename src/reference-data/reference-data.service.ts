import { Injectable, NotFoundException } from '@nestjs/common';
import { OrganizationStatus, ReferenceSource } from '@prisma/client';
import {
  getAccessibleOrganizationIds,
  hasPlatformAccess,
} from '../auth/auth-scope.util';
import { UserContext } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePracticeDto } from './dto/create-practice.dto';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdatePracticeDto } from './dto/update-practice.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';

@Injectable()
export class ReferenceDataService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async listPractices(actor: UserContext) {
    return this.prismaService.practice.findMany({
      where: this.organizationScopedWhere(actor),
      orderBy: {
        createdAt: 'desc',
      },
      include: this.practiceInclude(),
    });
  }

  async exportPractices(actor: UserContext) {
    const practices = await this.prismaService.practice.findMany({
      where: this.organizationScopedWhere(actor),
      orderBy: {
        createdAt: 'desc',
      },
      include: this.practiceInclude(),
    });

    return this.toCsv(practices, [
      {
        header: 'id',
        value: (practice) => practice.id,
      },
      {
        header: 'organizationId',
        value: (practice) => practice.organizationId,
      },
      {
        header: 'organizationName',
        value: (practice) => practice.organization.name,
      },
      {
        header: 'name',
        value: (practice) => practice.name,
      },
      {
        header: 'externalReferenceId',
        value: (practice) => practice.externalReferenceId,
      },
      {
        header: 'source',
        value: (practice) => practice.source,
      },
      {
        header: 'status',
        value: (practice) => practice.status,
      },
      {
        header: 'providerCount',
        value: (practice) => practice._count.providers,
      },
      {
        header: 'createdAt',
        value: (practice) => practice.createdAt,
      },
      {
        header: 'updatedAt',
        value: (practice) => practice.updatedAt,
      },
    ]);
  }

  async getPractice(id: string, actor: UserContext) {
    const practice = await this.prismaService.practice.findFirst({
      where: this.scopedRecordWhere(id, actor),
      include: this.practiceInclude(),
    });

    if (!practice) {
      throw new NotFoundException('Practice not found');
    }

    return practice;
  }

  async listPracticeProviders(practiceId: string, actor: UserContext) {
    await this.getPractice(practiceId, actor);

    return this.prismaService.provider.findMany({
      where: {
        AND: [
          {
            practiceId,
          },
          this.organizationScopedWhere(actor),
        ],
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: this.providerInclude(),
    });
  }

  async createPractice(input: CreatePracticeDto, actor: UserContext) {
    const practice = await this.prismaService.practice.create({
      data: {
        organizationId: input.organizationId,
        name: input.name,
        externalReferenceId: input.externalReferenceId,
        source: this.toReferenceSource(input.source),
      },
    });

    await this.auditService.record({
      actorProfileId: actor.profileId,
      action: 'practice.changed',
      targetType: 'practice',
      targetId: practice.id,
      organizationId: practice.organizationId,
      metadata: {
        operation: 'create',
      },
    });

    return practice;
  }

  async updatePractice(
    id: string,
    input: UpdatePracticeDto,
    actor: UserContext,
  ) {
    const practice = await this.prismaService.practice.update({
      where: { id },
      data: this.removeUndefined({
        name: input.name,
        externalReferenceId: input.externalReferenceId,
        source: input.source ? this.toReferenceSource(input.source) : undefined,
        status: input.status
          ? this.toOrganizationStatus(input.status)
          : undefined,
      }),
    });

    await this.auditService.record({
      actorProfileId: actor.profileId,
      action: 'practice.changed',
      targetType: 'practice',
      targetId: practice.id,
      organizationId: practice.organizationId,
      metadata: {
        operation: 'update',
      },
    });

    return practice;
  }

  async listProviders(actor: UserContext) {
    return this.prismaService.provider.findMany({
      where: this.organizationScopedWhere(actor),
      orderBy: {
        createdAt: 'desc',
      },
      include: this.providerInclude(),
    });
  }

  async exportProviders(actor: UserContext) {
    const providers = await this.prismaService.provider.findMany({
      where: this.organizationScopedWhere(actor),
      orderBy: {
        createdAt: 'desc',
      },
      include: this.providerInclude(),
    });

    return this.toCsv(providers, [
      {
        header: 'id',
        value: (provider) => provider.id,
      },
      {
        header: 'organizationId',
        value: (provider) => provider.organizationId,
      },
      {
        header: 'organizationName',
        value: (provider) => provider.organization.name,
      },
      {
        header: 'practiceId',
        value: (provider) => provider.practiceId,
      },
      {
        header: 'practiceName',
        value: (provider) => provider.practice?.name,
      },
      {
        header: 'name',
        value: (provider) => provider.name,
      },
      {
        header: 'npi',
        value: (provider) => provider.npi,
      },
      {
        header: 'externalReferenceId',
        value: (provider) => provider.externalReferenceId,
      },
      {
        header: 'source',
        value: (provider) => provider.source,
      },
      {
        header: 'status',
        value: (provider) => provider.status,
      },
      {
        header: 'createdAt',
        value: (provider) => provider.createdAt,
      },
      {
        header: 'updatedAt',
        value: (provider) => provider.updatedAt,
      },
    ]);
  }

  async getProvider(id: string, actor: UserContext) {
    const provider = await this.prismaService.provider.findFirst({
      where: this.scopedRecordWhere(id, actor),
      include: this.providerInclude(),
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    return provider;
  }

  async createProvider(input: CreateProviderDto, actor: UserContext) {
    const provider = await this.prismaService.provider.create({
      data: {
        organizationId: input.organizationId,
        practiceId: input.practiceId,
        name: input.name,
        npi: input.npi,
        externalReferenceId: input.externalReferenceId,
        source: this.toReferenceSource(input.source),
      },
    });

    await this.auditService.record({
      actorProfileId: actor.profileId,
      action: 'provider.changed',
      targetType: 'provider',
      targetId: provider.id,
      organizationId: provider.organizationId,
      metadata: {
        operation: 'create',
      },
    });

    return provider;
  }

  async updateProvider(
    id: string,
    input: UpdateProviderDto,
    actor: UserContext,
  ) {
    const provider = await this.prismaService.provider.update({
      where: { id },
      data: this.removeUndefined({
        practiceId: input.practiceId,
        name: input.name,
        npi: input.npi,
        externalReferenceId: input.externalReferenceId,
        source: input.source ? this.toReferenceSource(input.source) : undefined,
        status: input.status
          ? this.toOrganizationStatus(input.status)
          : undefined,
      }),
    });

    await this.auditService.record({
      actorProfileId: actor.profileId,
      action: 'provider.changed',
      targetType: 'provider',
      targetId: provider.id,
      organizationId: provider.organizationId,
      metadata: {
        operation: 'update',
      },
    });

    return provider;
  }

  private toReferenceSource(source?: 'manual' | 'databricks'): ReferenceSource {
    return source === 'databricks'
      ? ReferenceSource.DATABRICKS
      : ReferenceSource.MANUAL;
  }

  private toOrganizationStatus(status: 'active' | 'disabled') {
    return status === 'active'
      ? OrganizationStatus.ACTIVE
      : OrganizationStatus.DISABLED;
  }

  private organizationScopedWhere(actor: UserContext) {
    if (hasPlatformAccess(actor)) {
      return {};
    }

    return {
      organizationId: {
        in: getAccessibleOrganizationIds(actor),
      },
    };
  }

  private scopedRecordWhere(id: string, actor: UserContext) {
    return {
      AND: [
        {
          id,
        },
        this.organizationScopedWhere(actor),
      ],
    };
  }

  private practiceInclude() {
    return {
      organization: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          providers: true,
        },
      },
    };
  }

  private providerInclude() {
    return {
      organization: {
        select: {
          id: true,
          name: true,
        },
      },
      practice: {
        select: {
          id: true,
          name: true,
        },
      },
    };
  }

  private removeUndefined<T extends Record<string, unknown>>(
    input: T,
  ): Partial<T> {
    return Object.fromEntries(
      Object.entries(input).filter(([, value]) => value !== undefined),
    ) as Partial<T>;
  }

  private toCsv<T>(records: T[], columns: CsvColumn<T>[]): string {
    const headerRow = columns.map((column) => this.escapeCsv(column.header));
    const dataRows = records.map((record) =>
      columns
        .map((column) =>
          this.escapeCsv(this.serializeCsvValue(column.value(record))),
        )
        .join(','),
    );

    return [headerRow.join(','), ...dataRows].join('\n');
  }

  private serializeCsvValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      typeof value === 'bigint'
    ) {
      return value.toString();
    }

    return '';
  }

  private escapeCsv(value: string): string {
    return `"${value.replace(/"/g, '""')}"`;
  }
}

type CsvColumn<T> = {
  header: string;
  value: (record: T) => unknown;
};
