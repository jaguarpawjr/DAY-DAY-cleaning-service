type SupabasePublicEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

function requireValue(name: string, value: string | undefined): string {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    throw new Error(`Missing required Supabase environment variable: ${name}`);
  }

  return trimmedValue;
}

export function getSupabasePublicEnv(): SupabasePublicEnv {
  const supabaseUrl = requireValue(
    'NEXT_PUBLIC_SUPABASE_URL',
    process.env.NEXT_PUBLIC_SUPABASE_URL
  );
  const supabaseAnonKey = requireValue(
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  try {
    new URL(supabaseUrl);
  } catch {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL must be a valid URL');
  }

  return { supabaseUrl, supabaseAnonKey };
}

export function getSupabaseAdminEnv(): SupabasePublicEnv & {
  serviceRoleKey: string;
} {
  return {
    ...getSupabasePublicEnv(),
    serviceRoleKey: requireValue(
      'SUPABASE_SERVICE_ROLE_KEY',
      process.env.SUPABASE_SERVICE_ROLE_KEY
    ),
  };
}
