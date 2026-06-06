export type AuditAction =
  | 'user.approved'
  | 'user.rejected'
  | 'user.disabled'
  | 'role.assigned'
  | 'role.revoked'
  | 'organization.created'
  | 'organization.approved'
  | 'organization.rejected'
  | 'invite.created'
  | 'invite.accepted'
  | 'invite.revoked'
  | 'practice.changed'
  | 'provider.changed';

export type AuditTargetType =
  | 'user'
  | 'roleAssignment'
  | 'organization'
  | 'invite'
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
