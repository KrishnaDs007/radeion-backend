export type UserRoleContext = {
  name: string;
  scopeType?: string;
  scopeId?: string;
  organizationId?: string;
};

export type UserContext = {
  authUserId: string;
  email?: string;
  roles: UserRoleContext[];
};
