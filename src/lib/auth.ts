import { createClient } from '@/lib/supabase/server';
import { Profile } from '@/types/database';
import { redirect } from 'next/navigation';

export async function getCurrentUser(): Promise<{
  user: any | null;
  profile: Profile | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { user: null, profile: null };
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      // Return basic user profile fallback if profile record is being initialized
      return {
        user,
        profile: {
          id: user.id,
          email: user.email || '',
          full_name: user.user_metadata?.full_name || 'Staff User',
          phone: user.user_metadata?.phone || null,
          role: user.user_metadata?.role === 'admin' ? 'admin' : 'employee',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      };
    }

    return { user, profile: profile as Profile };
  } catch (error) {
    console.error('Error fetching current user:', error);
    return { user: null, profile: null };
  }
}

export async function requireAdmin(): Promise<{ user: any; profile: Profile }> {
  const { user, profile } = await getCurrentUser();

  if (!user || !profile) {
    redirect('/login');
  }

  if (profile.role !== 'admin') {
    redirect('/dashboard?error=unauthorized');
  }

  return { user, profile };
}

export async function requireAuth(): Promise<{ user: any; profile: Profile }> {
  const { user, profile } = await getCurrentUser();

  if (!user || !profile) {
    redirect('/login');
  }

  return { user, profile };
}
