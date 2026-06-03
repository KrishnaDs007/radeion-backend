export type UserRoleContext = {
  name: string;
  scopeType?: string;
  scopeId?: string;
  organizationId?: string;
};

export type UserContext = {
  profileId: string;
  authUserId: string;
  email?: string;
  status: string;
  roles: UserRoleContext[];
};
