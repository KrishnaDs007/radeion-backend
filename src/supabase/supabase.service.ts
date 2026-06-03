import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  readonly adminClient: SupabaseClient;
  readonly publicClient: SupabaseClient;

  constructor(configService: ConfigService) {
    const supabaseUrl = configService.getOrThrow<string>('SUPABASE_URL');
    const publishableKey = configService.getOrThrow<string>(
      'SUPABASE_PUBLISHABLE_KEY',
    );
    const secretKey = configService.getOrThrow<string>('SUPABASE_SECRET_KEY');

    this.publicClient = createClient(supabaseUrl, publishableKey);
    this.adminClient = createClient(supabaseUrl, secretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
}
