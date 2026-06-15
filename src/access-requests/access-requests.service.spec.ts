import { AccessRequestsService } from './access-requests.service';
import { BadRequestException } from '@nestjs/common';
import { RequestStatus } from '@prisma/client';

describe('AccessRequestsService', () => {
  it('creates a pending user access request', async () => {
    const userRequest = {
      id: 'request-1',
      email: 'user@example.com',
      status: 'PENDING',
    };
    const create = jest.fn<
      Promise<typeof userRequest>,
      [Record<string, unknown>]
    >();
    create.mockResolvedValue(userRequest);
    const prismaService = {
      userApprovalRequest: {
        create,
      },
    };
    const auditService = {
      record: jest.fn(),
    };
    const service = new AccessRequestsService(
      prismaService as unknown as ConstructorParameters<
        typeof AccessRequestsService
      >[0],
      auditService as unknown as ConstructorParameters<
        typeof AccessRequestsService
      >[1],
    );

    await expect(
      service.createUserRequest({
        email: 'USER@EXAMPLE.COM',
        requestedRoles: ['provider'],
        requestedScope: {
          type: 'organization',
        },
      }),
    ).resolves.toEqual(userRequest);

    const createInput = create.mock.calls[0]?.[0] as {
      data: {
        email: string;
        requestedRoles: string[];
      };
    };

    expect(createInput.data.email).toBe('user@example.com');
    expect(createInput.data.requestedRoles).toEqual(['provider']);
  });

  it('creates a pending organization access request', async () => {
    const organizationRequest = {
      id: 'request-1',
      organizationName: 'Example Health',
      status: 'PENDING',
    };
    const create = jest.fn<
      Promise<typeof organizationRequest>,
      [Record<string, unknown>]
    >();
    create.mockResolvedValue(organizationRequest);
    const prismaService = {
      organizationApprovalRequest: {
        create,
      },
    };
    const auditService = {
      record: jest.fn(),
    };
    const service = new AccessRequestsService(
      prismaService as unknown as ConstructorParameters<
        typeof AccessRequestsService
      >[0],
      auditService as unknown as ConstructorParameters<
        typeof AccessRequestsService
      >[1],
    );

    await expect(
      service.createOrganizationRequest({
        organizationName: 'Example Health',
        requestedByEmail: 'ADMIN@EXAMPLE.COM',
        type: 'client',
        contactEmail: 'CONTACT@EXAMPLE.COM',
      }),
    ).resolves.toEqual(organizationRequest);

    const createInput = create.mock.calls[0]?.[0] as {
      data: {
        organizationName: string;
        requestedByEmail: string;
      };
    };

    expect(createInput.data.organizationName).toBe('Example Health');
    expect(createInput.data.requestedByEmail).toBe('admin@example.com');
  });

  it('retries a rejected user request with matching email', async () => {
    const userRequest = {
      id: 'request-1',
      email: 'user@example.com',
      status: RequestStatus.PENDING,
    };
    const prismaService = {
      userApprovalRequest: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'request-1',
          email: 'user@example.com',
          status: RequestStatus.REJECTED,
        }),
        update: jest.fn().mockResolvedValue(userRequest),
      },
    };
    const service = new AccessRequestsService(
      prismaService as unknown as ConstructorParameters<
        typeof AccessRequestsService
      >[0],
      {} as ConstructorParameters<typeof AccessRequestsService>[1],
    );

    await expect(
      service.retryUserRequest('request-1', {
        email: 'USER@EXAMPLE.COM',
        requestedRoles: ['provider'],
        requestedScope: {
          type: 'organization',
        },
      }),
    ).resolves.toEqual(userRequest);

    expect(prismaService.userApprovalRequest.update).toHaveBeenCalledWith({
      where: { id: 'request-1' },
      data: expect.objectContaining({
        status: RequestStatus.PENDING,
        reviewedById: null,
        reviewedAt: null,
        reviewNotes: null,
      }) as Record<string, unknown>,
      select: expect.any(Object) as Record<string, unknown>,
    });
  });

  it('rejects user request retries when the email does not match', async () => {
    const prismaService = {
      userApprovalRequest: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'request-1',
          email: 'user@example.com',
          status: RequestStatus.REJECTED,
        }),
      },
    };
    const service = new AccessRequestsService(
      prismaService as unknown as ConstructorParameters<
        typeof AccessRequestsService
      >[0],
      {} as ConstructorParameters<typeof AccessRequestsService>[1],
    );

    await expect(
      service.retryUserRequest('request-1', {
        email: 'other@example.com',
        requestedRoles: ['provider'],
        requestedScope: {
          type: 'organization',
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('retries a failed organization request with matching requester email', async () => {
    const organizationRequest = {
      id: 'request-1',
      organizationName: 'Example Health Updated',
      status: RequestStatus.PENDING,
    };
    const prismaService = {
      organizationApprovalRequest: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'request-1',
          requestedByEmail: 'admin@example.com',
          status: RequestStatus.FAILED,
        }),
        update: jest.fn().mockResolvedValue(organizationRequest),
      },
    };
    const service = new AccessRequestsService(
      prismaService as unknown as ConstructorParameters<
        typeof AccessRequestsService
      >[0],
      {} as ConstructorParameters<typeof AccessRequestsService>[1],
    );

    await expect(
      service.retryOrganizationRequest('request-1', {
        organizationName: 'Example Health Updated',
        requestedByEmail: 'ADMIN@EXAMPLE.COM',
        type: 'client',
        contactEmail: 'CONTACT@EXAMPLE.COM',
      }),
    ).resolves.toEqual(organizationRequest);

    expect(
      prismaService.organizationApprovalRequest.update,
    ).toHaveBeenCalledWith({
      where: { id: 'request-1' },
      data: expect.objectContaining({
        organizationName: 'Example Health Updated',
        status: RequestStatus.PENDING,
        reviewedById: null,
        reviewedAt: null,
        reviewNotes: null,
      }) as Record<string, unknown>,
      select: expect.any(Object) as Record<string, unknown>,
    });
  });

  it('does not retry pending organization requests', async () => {
    const prismaService = {
      organizationApprovalRequest: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'request-1',
          requestedByEmail: 'admin@example.com',
          status: RequestStatus.PENDING,
        }),
      },
    };
    const service = new AccessRequestsService(
      prismaService as unknown as ConstructorParameters<
        typeof AccessRequestsService
      >[0],
      {} as ConstructorParameters<typeof AccessRequestsService>[1],
    );

    await expect(
      service.retryOrganizationRequest('request-1', {
        organizationName: 'Example Health',
        requestedByEmail: 'admin@example.com',
        type: 'client',
        contactEmail: 'contact@example.com',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
