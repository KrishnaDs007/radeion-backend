import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  it('requests password recovery through Supabase with the configured redirect URL', async () => {
    const supabaseService = {
      requestPasswordRecovery: jest.fn().mockResolvedValue(undefined),
    };
    const service = new AuthService(
      new ConfigService({
        PASSWORD_RECOVERY_REDIRECT_URL:
          'https://app.example.com/password/recover',
      }),
      supabaseService as unknown as SupabaseService,
    );

    await expect(
      service.requestPasswordRecovery({ email: 'USER@Example.org' }),
    ).resolves.toEqual({
      status: 'requested',
      message:
        'If an account exists for this email, a password recovery email will be sent.',
    });

    expect(supabaseService.requestPasswordRecovery).toHaveBeenCalledWith({
      email: 'user@example.org',
      redirectTo: 'https://app.example.com/password/recover',
    });
  });

  it('returns a generic response when Supabase rejects the recovery request', async () => {
    const supabaseService = {
      requestPasswordRecovery: jest.fn().mockRejectedValue(new Error('failed')),
    };
    const service = new AuthService(
      new ConfigService({}),
      supabaseService as unknown as SupabaseService,
    );

    await expect(
      service.requestPasswordRecovery({ email: 'user@example.org' }),
    ).resolves.toEqual({
      status: 'requested',
      message:
        'If an account exists for this email, a password recovery email will be sent.',
    });
  });
});
