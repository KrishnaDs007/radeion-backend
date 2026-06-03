import { UserContext } from '../auth/auth.types';

export type AclAction =
  | 'user.read'
  | 'user.approve'
  | 'user.disable'
  | 'role.assign'
  | 'organization.read'
  | 'organization.create'
  | 'organization.approve'
  | 'organization.update'
  | 'claims.read'
  | 'providers.read'
  | 'patientMetrics.read';

export type ResourceScope = {
  type: 'global' | 'organization' | 'aco' | 'practice' | 'provider';
  id?: string;
  organizationId?: string;
};

export type AclCheck = {
  user: UserContext;
  action: AclAction;
  scope?: ResourceScope;
};
