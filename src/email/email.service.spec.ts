import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

describe('EmailService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('skips invite delivery when email is disabled', async () => {
    const service = new EmailService(
      new ConfigService({
        EMAIL_DRIVER: 'disabled',
      }),
    );

    await expect(
      service.sendInviteEmail({
        to: 'user@example.com',
        inviteToken: 'invite-token',
      }),
    ).resolves.toEqual({
      status: 'skipped',
      reason: 'EMAIL_DRIVER is disabled',
    });
  });

  it('sends invite email through Resend', async () => {
    const fetchMock = jest.fn<
      ReturnType<typeof fetch>,
      Parameters<typeof fetch>
    >();
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: 'message-1' }), {
        status: 200,
      }),
    );
    global.fetch = fetchMock;
    const service = new EmailService(
      new ConfigService({
        EMAIL_DRIVER: 'resend',
        RESEND_API_KEY: 'resend-key',
        EMAIL_FROM: 'Radeion <no-reply@example.com>',
        INVITE_ACCEPT_URL: 'https://app.example.com/invites/accept',
      }),
    );

    await expect(
      service.sendInviteEmail({
        to: 'user@example.com',
        inviteToken: 'invite-token',
        organizationName: 'Example Health',
      }),
    ).resolves.toEqual({
      status: 'sent',
      providerMessageId: 'message-1',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toEqual(
      expect.objectContaining({
        Authorization: 'Bearer resend-key',
      }),
    );
    expect(init?.body).toEqual(
      expect.stringContaining(
        'https://app.example.com/invites/accept?inviteToken=invite-token',
      ),
    );
  });
});
