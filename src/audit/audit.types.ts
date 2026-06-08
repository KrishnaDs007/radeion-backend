export type AuditAction =
  | 'user.approved'
  | 'user.rejected'
  | 'user.disabled'
  | 'user.reactivated'
  | 'role.assigned'
  | 'role.revoked'
  | 'organization.created'
  | 'organization.updated'
  | 'organization.statusChanged'
  | 'organization.approved'
  | 'organization.rejected'
  | 'invite.created'
  | 'invite.accepted'
  | 'invite.revoked'
  | 'careCoordinator.assigned'
  | 'careCoordinator.revoked'
  | 'practice.changed'
  | 'provider.changed';

export type AuditTargetType =
  | 'user'
  | 'roleAssignment'
  | 'organization'
  | 'invite'
  | 'careCoordinatorAssignment'
  | 'practice'
  | 'provider';

export type CreateAuditLogInput = {
  actorProfileId?: string;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId?: string;
  organizationId?: string;
  metadata?: Record<string, unknown>;
};
