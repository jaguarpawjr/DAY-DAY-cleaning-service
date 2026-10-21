import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdminEnv } from './env';

// Privileged admin client with service role key - ONLY use on server-side
export function createAdminClient() {
  const { supabaseUrl, serviceRoleKey } = getSupabaseAdminEnv();

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
