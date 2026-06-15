import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { RequestPasswordRecoveryDto } from './dto/request-password-recovery.dto';

const PASSWORD_RECOVERY_RESPONSE = {
  status: 'requested',
  message:
    'If an account exists for this email, a password recovery email will be sent.',
} as const;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly supabaseService: SupabaseService,
  ) {}

  async requestPasswordRecovery(input: RequestPasswordRecoveryDto) {
    const redirectTo = this.configService.get<string>(
      'PASSWORD_RECOVERY_REDIRECT_URL',
    );

    try {
      await this.supabaseService.requestPasswordRecovery({
        email: input.email.toLowerCase(),
        redirectTo: redirectTo?.trim() || undefined,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown Supabase error';
      this.logger.warn(`Password recovery request failed: ${message}`);
    }

    return PASSWORD_RECOVERY_RESPONSE;
  }
}
