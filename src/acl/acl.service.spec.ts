import { AclService } from './acl.service';
import { AclCheck } from './acl.types';

describe('AclService', () => {
  let service: AclService;

  beforeEach(() => {
    service = new AclService();
  });

  it('allows developer access across scopes', () => {
    const check: AclCheck = {
      action: 'claims.read',
      scope: {
        type: 'organization',
        organizationId: 'organization-1',
      },
      user: {
        profileId: 'profile-1',
        authUserId: 'auth-user-1',
        status: 'ACTIVE',
        roles: [
          {
            name: 'developer',
            scopeType: 'global',
          },
        ],
      },
    };

    expect(service.can(check)).toBe(true);
  });

  it('allows matching organization-scoped access', () => {
    const check: AclCheck = {
      action: 'providers.read',
      scope: {
        type: 'organization',
        organizationId: 'organization-1',
      },
      user: {
        profileId: 'profile-1',
        authUserId: 'auth-user-1',
        status: 'ACTIVE',
        roles: [
          {
            name: 'clientAdmin',
            scopeType: 'organization',
            organizationId: 'organization-1',
          },
        ],
      },
    };

    expect(service.can(check)).toBe(true);
  });

  it('denies mismatched organization-scoped access', () => {
    const check: AclCheck = {
      action: 'providers.read',
      scope: {
        type: 'organization',
        organizationId: 'organization-2',
      },
      user: {
        profileId: 'profile-1',
        authUserId: 'auth-user-1',
        status: 'ACTIVE',
        roles: [
          {
            name: 'clientAdmin',
            scopeType: 'organization',
            organizationId: 'organization-1',
          },
        ],
      },
    };

    expect(service.can(check)).toBe(false);
  });
});
