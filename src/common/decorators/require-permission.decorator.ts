import { SetMetadata } from '@nestjs/common';
import { AclAction, ResourceScope } from '../../acl/acl.types';

export const REQUIRED_PERMISSION_KEY = 'requiredPermission';

export type RequiredPermission = {
  action: AclAction;
  scope?: ResourceScope;
};

export const RequirePermission = (action: AclAction, scope?: ResourceScope) =>
  SetMetadata(REQUIRED_PERMISSION_KEY, { action, scope });
