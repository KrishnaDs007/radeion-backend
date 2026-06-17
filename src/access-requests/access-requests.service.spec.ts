import { AccessRequestsService } from './access-requests.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RequestStatus } from '@prisma/client';

describe('AccessRequestsService', () => {
  it('returns one user access request by id', async () => {
    const request = {
      id: 'request-1',
      email: 'user@example.com',
      status: RequestStatus.PENDING,
    };
    const prismaService = {
      userApprovalRequest: {
        findUnique: jest.fn().mockResolvedValue(request),
      },
    };
    const service = new AccessRequestsService(
      prismaService as unknown as ConstructorParameters<
        typeof AccessRequestsService
      >[0],
      {} as ConstructorParameters<typeof AccessRequestsService>[1],
    );

    await expect(service.getUserRequest('request-1')).resolves.toEqual(request);
    expect(prismaService.userApprovalRequest.findUnique).toHaveBeenCalledWith({
      where: { id: 'request-1' },
      select: expect.any(Object) as Record<string, unknown>,
    });
  });

  it('rejects missing user access request details', async () => {
    const prismaService = {
      userApprovalRequest: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };
    const service = new AccessRequestsService(
      prismaService as unknown as ConstructorParameters<
        typeof AccessRequestsService
      >[0],
      {} as ConstructorParameters<typeof AccessRequestsService>[1],
    );

    await expect(service.getUserRequest('request-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns one organization access request by id', async () => {
    const request = {
      id: 'request-1',
      organizationName: 'Example Health',
      status: RequestStatus.PENDING,
    };
    const prismaService = {
      organizationApprovalRequest: {
        findUnique: jest.fn().mockResolvedValue(request),
      },
    };
    const service = new AccessRequestsService(
      prismaService as unknown as ConstructorParameters<
        typeof AccessRequestsService
      >[0],
      {} as ConstructorParameters<typeof AccessRequestsService>[1],
    );

    await expect(service.getOrganizationRequest('request-1')).resolves.toEqual(
      request,
    );
    expect(
      prismaService.organizationApprovalRequest.findUnique,
    ).toHaveBeenCalledWith({
      where: { id: 'request-1' },
      select: expect.any(Object) as Record<string, unknown>,
    });
  });

  it('rejects missing organization access request details', async () => {
    const prismaService = {
      organizationApprovalRequest: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };
    const service = new AccessRequestsService(
      prismaService as unknown as ConstructorParameters<
        typeof AccessRequestsService
      >[0],
      {} as ConstructorParameters<typeof AccessRequestsService>[1],
    );

    await expect(
      service.getOrganizationRequest('request-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists user access requests with filters and pagination metadata', async () => {
    const requests = [
      {
        id: 'request-1',
        email: 'user@example.com',
        status: RequestStatus.PENDING,
      },
    ];
    const prismaService = {
      userApprovalRequest: {
        findMany: jest.fn().mockResolvedValue(requests),
        count: jest.fn().mockResolvedValue(1),
      },
    };
    const service = new AccessRequestsService(
      prismaService as unknown as ConstructorParameters<
        typeof AccessRequestsService
      >[0],
      {} as ConstructorParameters<typeof AccessRequestsService>[1],
    );

    await expect(
      service.listUserRequests({
        status: 'pending',
        email: 'USER@EXAMPLE.COM',
        organizationId: 'organization-1',
        reviewedById: 'reviewer-1',
        fromDate: '2026-06-01T00:00:00.000Z',
        toDate: '2026-06-30T23:59:59.000Z',
        limit: 25,
        offset: 10,
      }),
    ).resolves.toEqual({
      data: requests,
      page: {
        limit: 25,
        offset: 10,
        total: 1,
        nextOffset: null,
        hasNextPage: false,
      },
    });

    expect(prismaService.userApprovalRequest.findMany).toHaveBeenCalledWith({
      where: {
        status: RequestStatus.PENDING,
        email: {
          contains: 'user@example.com',
          mode: 'insensitive',
        },
        organizationId: 'organization-1',
        reviewedById: 'reviewer-1',
        createdAt: {
          gte: new Date('2026-06-01T00:00:00.000Z'),
          lte: new Date('2026-06-30T23:59:59.000Z'),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: 10,
      take: 25,
      select: expect.any(Object) as Record<string, unknown>,
    });
    expect(prismaService.userApprovalRequest.count).toHaveBeenCalledWith({
      where: {
        status: RequestStatus.PENDING,
        email: {
          contains: 'user@example.com',
          mode: 'insensitive',
        },
        organizationId: 'organization-1',
        reviewedById: 'reviewer-1',
        createdAt: {
          gte: new Date('2026-06-01T00:00:00.000Z'),
          lte: new Date('2026-06-30T23:59:59.000Z'),
        },
      },
    });
  });

  it('lists organization access requests with filters and pagination metadata', async () => {
    const requests = [
      {
        id: 'request-1',
        organizationName: 'Example Health',
        requestedByEmail: 'admin@example.com',
        status: RequestStatus.REJECTED,
      },
    ];
    const prismaService = {
      organizationApprovalRequest: {
        findMany: jest.fn().mockResolvedValue(requests),
        count: jest.fn().mockResolvedValue(3),
      },
    };
    const service = new AccessRequestsService(
      prismaService as unknown as ConstructorParameters<
        typeof AccessRequestsService
      >[0],
      {} as ConstructorParameters<typeof AccessRequestsService>[1],
    );

    await expect(
      service.listOrganizationRequests({
        status: 'rejected',
        email: 'ADMIN@EXAMPLE.COM',
        reviewedById: 'reviewer-2',
        fromDate: '2026-05-01T00:00:00.000Z',
        toDate: '2026-05-31T23:59:59.000Z',
        limit: 2,
        offset: 0,
      }),
    ).resolves.toEqual({
      data: requests,
      page: {
        limit: 2,
        offset: 0,
        total: 3,
        nextOffset: 2,
        hasNextPage: true,
      },
    });

    expect(
      prismaService.organizationApprovalRequest.findMany,
    ).toHaveBeenCalledWith({
      where: {
        status: RequestStatus.REJECTED,
        requestedByEmail: {
          contains: 'admin@example.com',
          mode: 'insensitive',
        },
        reviewedById: 'reviewer-2',
        createdAt: {
          gte: new Date('2026-05-01T00:00:00.000Z'),
          lte: new Date('2026-05-31T23:59:59.000Z'),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: 0,
      take: 2,
      select: expect.any(Object) as Record<string, unknown>,
    });
    expect(
      prismaService.organizationApprovalRequest.count,
    ).toHaveBeenCalledWith({
      where: {
        status: RequestStatus.REJECTED,
        requestedByEmail: {
          contains: 'admin@example.com',
          mode: 'insensitive',
        },
        reviewedById: 'reviewer-2',
        createdAt: {
          gte: new Date('2026-05-01T00:00:00.000Z'),
          lte: new Date('2026-05-31T23:59:59.000Z'),
        },
      },
    });
  });

  it('exports filtered user access requests as CSV', async () => {
    const requests = [
      {
        id: 'request-1',
        email: 'user@example.com',
        organizationId: 'organization-1',
        requestedRoles: ['provider'],
        requestedScope: {
          type: 'organization',
          organizationId: 'organization-1',
        },
        status: RequestStatus.PENDING,
        reviewedAt: null,
        reviewNotes: 'Needs "manual" review',
        createdAt: new Date('2026-06-17T10:00:00.000Z'),
        updatedAt: new Date('2026-06-17T10:05:00.000Z'),
        organization: {
          id: 'organization-1',
          name: 'Example Health',
        },
        reviewedBy: null,
      },
    ];
    const prismaService = {
      userApprovalRequest: {
        findMany: jest.fn().mockResolvedValue(requests),
      },
    };
    const service = new AccessRequestsService(
      prismaService as unknown as ConstructorParameters<
        typeof AccessRequestsService
      >[0],
      {} as ConstructorParameters<typeof AccessRequestsService>[1],
    );

    await expect(
      service.exportUserRequests({
        status: 'pending',
        email: 'USER@EXAMPLE.COM',
        limit: 10,
      }),
    ).resolves.toBe(
      [
        '"id","email","organizationId","organizationName","status","requestedRoles","requestedScope","reviewedByEmail","reviewedAt","reviewNotes","createdAt","updatedAt"',
        '"request-1","user@example.com","organization-1","Example Health","PENDING","[""provider""]","{""type"":""organization"",""organizationId"":""organization-1""}","","","Needs ""manual"" review","2026-06-17T10:00:00.000Z","2026-06-17T10:05:00.000Z"',
      ].join('\n'),
    );

    expect(prismaService.userApprovalRequest.findMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        status: RequestStatus.PENDING,
        email: {
          contains: 'user@example.com',
          mode: 'insensitive',
        },
      }) as Record<string, unknown>,
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
      select: expect.any(Object) as Record<string, unknown>,
    });
  });

  it('exports filtered organization access requests as CSV', async () => {
    const requests = [
      {
        id: 'request-1',
        organizationName: 'Example Health',
        requestedByEmail: 'admin@example.com',
        requestedByAuthUserId: null,
        requestedPayload: {
          type: 'aco',
          contactEmail: 'admin@example.com',
        },
        status: RequestStatus.REJECTED,
        reviewedAt: new Date('2026-06-17T11:00:00.000Z'),
        reviewNotes: 'Verification failed',
        createdAt: new Date('2026-06-16T10:00:00.000Z'),
        updatedAt: new Date('2026-06-17T11:00:00.000Z'),
        reviewedBy: {
          id: 'reviewer-1',
          email: 'reviewer@example.com',
          firstName: 'Review',
          lastName: 'Admin',
        },
      },
    ];
    const prismaService = {
      organizationApprovalRequest: {
        findMany: jest.fn().mockResolvedValue(requests),
      },
    };
    const service = new AccessRequestsService(
      prismaService as unknown as ConstructorParameters<
        typeof AccessRequestsService
      >[0],
      {} as ConstructorParameters<typeof AccessRequestsService>[1],
    );

    await expect(
      service.exportOrganizationRequests({
        status: 'rejected',
        limit: 5,
      }),
    ).resolves.toBe(
      [
        '"id","organizationName","requestedByEmail","status","requestedPayload","reviewedByEmail","reviewedAt","reviewNotes","createdAt","updatedAt"',
        '"request-1","Example Health","admin@example.com","REJECTED","{""type"":""aco"",""contactEmail"":""admin@example.com""}","reviewer@example.com","2026-06-17T11:00:00.000Z","Verification failed","2026-06-16T10:00:00.000Z","2026-06-17T11:00:00.000Z"',
      ].join('\n'),
    );

    expect(
      prismaService.organizationApprovalRequest.findMany,
    ).toHaveBeenCalledWith({
      where: expect.objectContaining({
        status: RequestStatus.REJECTED,
      }) as Record<string, unknown>,
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
      select: expect.any(Object) as Record<string, unknown>,
    });
  });

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
