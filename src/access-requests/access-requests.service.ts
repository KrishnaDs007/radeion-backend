import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationAccessRequestDto } from './dto/create-organization-access-request.dto';
import { CreateUserAccessRequestDto } from './dto/create-user-access-request.dto';

@Injectable()
export class AccessRequestsService {
  constructor(private readonly prismaService: PrismaService) {}

  async createUserRequest(input: CreateUserAccessRequestDto) {
    return this.prismaService.userApprovalRequest.create({
      data: {
        authUserId: input.authUserId,
        email: input.email.toLowerCase(),
        organizationId: input.organizationId,
        requestedRoles: input.requestedRoles,
        requestedScope: input.requestedScope as Prisma.InputJsonValue,
      },
      select: {
        id: true,
        email: true,
        organizationId: true,
        requestedRoles: true,
        requestedScope: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async createOrganizationRequest(input: CreateOrganizationAccessRequestDto) {
    return this.prismaService.organizationApprovalRequest.create({
      data: {
        organizationName: input.organizationName,
        requestedByEmail: input.requestedByEmail.toLowerCase(),
        requestedByAuthUserId: input.requestedByAuthUserId,
        requestedPayload: this.buildOrganizationPayload(input),
      },
      select: {
        id: true,
        organizationName: true,
        requestedByEmail: true,
        status: true,
        createdAt: true,
      },
    });
  }

  private buildOrganizationPayload(
    input: CreateOrganizationAccessRequestDto,
  ): Prisma.InputJsonValue {
    const payload: Record<string, Prisma.InputJsonValue | undefined> = {
      type: input.type,
      website: input.website,
      contactEmail: input.contactEmail.toLowerCase(),
      contactNumber: input.contactNumber,
      address: input.address,
      companyBio: input.companyBio,
      startedYear: input.startedYear,
      additionalDetails: input.additionalDetails as
        | Prisma.InputJsonValue
        | undefined,
    };

    return Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== undefined),
    );
  }
}
