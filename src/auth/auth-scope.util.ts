import type { UserContext } from './auth.types';

const PLATFORM_ROLES = new Set(['developer', 'superAdmin']);

export function hasPlatformAccess(user: UserContext): boolean {
  return user.roles.some((role) => PLATFORM_ROLES.has(role.name));
}

export function getAccessibleOrganizationIds(user: UserContext): string[] {
  return Array.from(
    new Set(
      user.roles
        .map((role) => role.organizationId)
        .filter((organizationId): organizationId is string =>
          Boolean(organizationId),
        ),
    ),
  );
}
