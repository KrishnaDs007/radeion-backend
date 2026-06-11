import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailDeliveryResult, InviteEmailInput } from './email.types';

type ResendEmailResponse = {
  id?: string;
  message?: string;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendInviteEmail(input: InviteEmailInput): Promise<EmailDeliveryResult> {
    const driver = this.configService.get<string>('EMAIL_DRIVER') ?? 'disabled';

    if (driver === 'disabled') {
      return {
        status: 'skipped',
        reason: 'EMAIL_DRIVER is disabled',
      };
    }

    if (driver !== 'resend') {
      return {
        status: 'failed',
        reason: `Unsupported EMAIL_DRIVER: ${driver}`,
      };
    }

    return this.sendResendInviteEmail(input);
  }

  private async sendResendInviteEmail(
    input: InviteEmailInput,
  ): Promise<EmailDeliveryResult> {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    const from = this.configService.get<string>('EMAIL_FROM');
    const apiUrl =
      this.configService.get<string>('RESEND_API_URL') ??
      'https://api.resend.com/emails';

    if (!apiKey || !from) {
      return {
        status: 'failed',
        reason: 'RESEND_API_KEY and EMAIL_FROM are required',
      };
    }

    const acceptUrl = this.buildInviteAcceptUrl(input.inviteToken);
    const organizationName = input.organizationName ?? 'Radeion';
    const subject = `You're invited to ${organizationName}`;
    const text = this.buildInviteText(input, acceptUrl, organizationName);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: input.to,
          subject,
          text,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as
        | ResendEmailResponse
        | undefined;

      if (!response.ok) {
        const reason =
          payload?.message ??
          `Resend returned ${response.status} ${response.statusText}`;
        this.logger.error(`Invite email delivery failed: ${reason}`);

        return {
          status: 'failed',
          reason,
        };
      }

      return {
        status: 'sent',
        providerMessageId: payload?.id,
      };
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : 'Invite email delivery failed';
      this.logger.error(`Invite email delivery failed: ${reason}`);

      return {
        status: 'failed',
        reason,
      };
    }
  }

  private buildInviteAcceptUrl(inviteToken: string) {
    const baseUrl =
      this.configService.get<string>('INVITE_ACCEPT_URL') ??
      'http://localhost:3000/invites/accept';
    const url = new URL(baseUrl);
    url.searchParams.set('inviteToken', inviteToken);

    return url.toString();
  }

  private buildInviteText(
    input: InviteEmailInput,
    acceptUrl: string,
    organizationName: string,
  ) {
    const expiryLine = input.expiresAt
      ? `\nThis invite expires on ${input.expiresAt.toISOString()}.`
      : '';

    return [
      `You have been invited to ${organizationName}.`,
      '',
      `Open this link to continue: ${acceptUrl}`,
      expiryLine,
      '',
      'If you were not expecting this invite, you can ignore this email.',
    ].join('\n');
  }
}
