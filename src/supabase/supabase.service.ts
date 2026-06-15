import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from '@supabase/supabase-js';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

type SupabaseDatabase = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

type PasswordRecoveryRequest = {
  email: string;
  redirectTo?: string;
};

@Injectable()
export class SupabaseService {
  readonly adminClient: SupabaseClient<SupabaseDatabase>;
  readonly publicClient: SupabaseClient<SupabaseDatabase>;

  constructor(configService: ConfigService) {
    const supabaseUrl = configService.getOrThrow<string>('SUPABASE_URL');
    const publishableKey = configService.getOrThrow<string>(
      'SUPABASE_PUBLISHABLE_KEY',
    );
    const secretKey = configService.getOrThrow<string>('SUPABASE_SECRET_KEY');

    this.publicClient = createClient<SupabaseDatabase>(
      supabaseUrl,
      publishableKey,
    );
    this.adminClient = createClient<SupabaseDatabase>(supabaseUrl, secretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  async getUserFromToken(accessToken: string): Promise<User> {
    const {
      data: { user },
      error,
    } = await this.adminClient.auth.getUser(accessToken);

    if (error || !user) {
      throw error ?? new Error('Unable to resolve Supabase user');
    }

    return user;
  }

  async requestPasswordRecovery({
    email,
    redirectTo,
  }: PasswordRecoveryRequest): Promise<void> {
    const { error } = await this.publicClient.auth.resetPasswordForEmail(
      email,
      redirectTo ? { redirectTo } : undefined,
    );

    if (error) {
      throw error;
    }
  }
}
