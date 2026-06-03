import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UserContext } from '../auth/auth.types';

type SupabaseDatabase = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
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

  async getUserContextFromToken(accessToken: string): Promise<UserContext> {
    const {
      data: { user },
      error,
    } = await this.adminClient.auth.getUser(accessToken);

    if (error || !user) {
      throw error ?? new Error('Unable to resolve Supabase user');
    }

    return {
      authUserId: user.id,
      email: user.email,
      roles: [],
    };
  }
}
