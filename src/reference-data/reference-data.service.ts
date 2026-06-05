import { Injectable } from '@nestjs/common';
import { OrganizationStatus, ReferenceSource } from '@prisma/client';
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

  async listPractices() {
    return this.prismaService.practice.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
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
      },
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

  async listProviders() {
    return this.prismaService.provider.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
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
      },
    });
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

  private removeUndefined<T extends Record<string, unknown>>(
    input: T,
  ): Partial<T> {
    return Object.fromEntries(
      Object.entries(input).filter(([, value]) => value !== undefined),
    ) as Partial<T>;
  }
}
