import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import {
  getAccessibleOrganizationIds,
  hasPlatformAccess,
} from '../auth/auth-scope.util';
import type { UserContext } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async listUsers(actor: UserContext) {
    return this.prismaService.profile.findMany({
      where: this.userReadWhere(actor),
      orderBy: {
        createdAt: 'desc',
      },
      select: this.userSelect(),
    });
  }

  async exportUsers(actor: UserContext) {
    const users = await this.prismaService.profile.findMany({
      where: this.userReadWhere(actor),
      orderBy: {
        createdAt: 'desc',
      },
      select: this.userSelect(),
    });

    return this.toCsv(users, [
      {
        header: 'id',
        value: (user) => user.id,
      },
      {
        header: 'authUserId',
        value: (user) => user.authUserId,
      },
      {
        header: 'email',
        value: (user) => user.email,
      },
      {
        header: 'firstName',
        value: (user) => user.firstName,
      },
      {
        header: 'lastName',
        value: (user) => user.lastName,
      },
      {
        header: 'status',
        value: (user) => user.status,
      },
      {
        header: 'roles',
        value: (user) =>
          user.roleAssignments
            .map((assignment) => assignment.role.name)
            .join(';'),
      },
      {
        header: 'organizationIds',
        value: (user) =>
          user.roleAssignments
            .map((assignment) => assignment.organizationId)
            .filter((organizationId): organizationId is string =>
              Boolean(organizationId),
            )
            .join(';'),
      },
      {
        header: 'createdAt',
        value: (user) => user.createdAt,
      },
      {
        header: 'updatedAt',
        value: (user) => user.updatedAt,
      },
    ]);
  }

  async getUser(id: string, actor: UserContext) {
    const user = await this.prismaService.profile.findFirst({
      where: {
        id,
        ...this.userReadWhere(actor),
      },
      select: this.userSelect(),
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private userReadWhere(actor: UserContext) {
    if (hasPlatformAccess(actor)) {
      return {};
    }

    const organizationIds = getAccessibleOrganizationIds(actor);

    return {
      OR: [
        {
          id: actor.profileId,
        },
        {
          roleAssignments: {
            some: {
              organizationId: {
                in: organizationIds,
              },
              revokedAt: null,
            },
          },
        },
      ],
    };
  }

  async disableUser(
    id: string,
    input: UpdateUserStatusDto,
    actor: UserContext,
  ) {
    const user = await this.getUserForStatusChange(id);

    if (user.status === UserStatus.DISABLED) {
      throw new BadRequestException('User is already disabled');
    }

    if (user.id === actor.profileId) {
      throw new BadRequestException('You cannot disable your own account');
    }

    const updatedUser = await this.prismaService.profile.update({
      where: { id },
      data: {
        status: UserStatus.DISABLED,
      },
      select: this.userSelect(),
    });

    await this.auditService.record({
      actorProfileId: actor.profileId,
      action: 'user.disabled',
      targetType: 'user',
      targetId: user.id,
      metadata: {
        email: user.email,
        previousStatus: user.status,
        reason: input.reason,
      },
    });

    return updatedUser;
  }

  async reactivateUser(
    id: string,
    input: UpdateUserStatusDto,
    actor: UserContext,
  ) {
    const user = await this.getUserForStatusChange(id);

    if (user.status === UserStatus.ACTIVE) {
      throw new BadRequestException('User is already active');
    }

    if (user.status === UserStatus.REJECTED) {
      throw new BadRequestException('Rejected users must request access again');
    }

    const updatedUser = await this.prismaService.profile.update({
      where: { id },
      data: {
        status: UserStatus.ACTIVE,
      },
      select: this.userSelect(),
    });

    await this.auditService.record({
      actorProfileId: actor.profileId,
      action: 'user.reactivated',
      targetType: 'user',
      targetId: user.id,
      metadata: {
        email: user.email,
        previousStatus: user.status,
        reason: input.reason,
      },
    });

    return updatedUser;
  }

  private async getUserForStatusChange(id: string) {
    const user = await this.prismaService.profile.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        status: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private userSelect() {
    return {
      id: true,
      authUserId: true,
      email: true,
      firstName: true,
      lastName: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      roleAssignments: {
        where: {
          revokedAt: null,
        },
        select: {
          id: true,
          scopeType: true,
          scopeId: true,
          organizationId: true,
          createdAt: true,
          role: {
            select: {
              name: true,
              displayName: true,
            },
          },
        },
      },
    };
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
