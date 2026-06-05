import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RolesService {
  constructor(private readonly prismaService: PrismaService) {}

  async listRoles() {
    return this.prismaService.role.findMany({
      orderBy: {
        displayName: 'asc',
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        description: true,
        isGlobal: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
