import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prismaService: PrismaService) {}

  async listUsers() {
    return this.prismaService.profile.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      select: {
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
      },
    });
  }
}
