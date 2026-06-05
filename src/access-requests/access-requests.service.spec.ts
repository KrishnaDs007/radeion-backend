import { AccessRequestsService } from './access-requests.service';

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
    const service = new AccessRequestsService(
      prismaService as unknown as ConstructorParameters<
        typeof AccessRequestsService
      >[0],
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
    const service = new AccessRequestsService(
      prismaService as unknown as ConstructorParameters<
        typeof AccessRequestsService
      >[0],
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
});
