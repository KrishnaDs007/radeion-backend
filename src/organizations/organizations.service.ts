import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prismaService: PrismaService) {}

  async listOrganizations() {
    return this.prismaService.organization.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        type: true,
        website: true,
        contactEmail: true,
        contactNumber: true,
        status: true,
        address: true,
        companyBio: true,
        startedYear: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            practices: true,
            providers: true,
            roleAssignments: true,
          },
        },
      },
    });
  }
}
