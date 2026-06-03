import { Injectable } from '@nestjs/common';
import { AclCheck } from './acl.types';

const PLATFORM_ADMIN_ROLES = new Set(['developer', 'superAdmin']);

@Injectable()
export class AclService {
  can(check: AclCheck): boolean {
    if (this.hasPlatformAccess(check)) {
      return true;
    }

    return this.hasScopedAccess(check);
  }

  private hasPlatformAccess(check: AclCheck): boolean {
    return check.user.roles.some((role) => PLATFORM_ADMIN_ROLES.has(role.name));
  }

  private hasScopedAccess(check: AclCheck): boolean {
    if (!check.scope) {
      return false;
    }

    return check.user.roles.some((role) => {
      if (role.organizationId !== check.scope?.organizationId) {
        return false;
      }

      if (!role.scopeType || role.scopeType === 'organization') {
        return check.scope?.type === 'organization';
      }

      return (
        role.scopeType === check.scope?.type && role.scopeId === check.scope.id
      );
    });
  }
}
