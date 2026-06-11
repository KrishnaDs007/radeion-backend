export type EmailDeliveryStatus = 'sent' | 'skipped' | 'failed';

export type EmailDeliveryResult = {
  status: EmailDeliveryStatus;
  reason?: string;
  providerMessageId?: string;
};

export type InviteEmailInput = {
  to: string;
  inviteToken: string;
  organizationName?: string;
  expiresAt?: Date | null;
};
