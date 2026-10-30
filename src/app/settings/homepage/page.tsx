import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import HomepageSettingsClient from './HomepageSettingsClient';

export const dynamic = 'force-dynamic';

export default async function HomepageSettingsPage() {
  const { user, profile } = await getCurrentUser();
  if (!user || !profile || profile.role !== 'admin') redirect('/dashboard?error=unauthorized');
  const supabase = await createClient();

  const [
    { data: settings },
    { data: services },
    { data: areas },
    { data: draftRevision },
    { data: publishedRevision },
  ] = await Promise.all([
    supabase.from('company_settings').select('*').maybeSingle(),
    supabase.from('services').select('*').order('sort_order').order('name'),
    supabase.from('service_areas').select('*').order('sort_order').order('name'),
    supabase.from('homepage_revisions').select('*').eq('status', 'draft').maybeSingle(),
    supabase.from('homepage_revisions').select('*').eq('status', 'published').maybeSingle(),
  ]);

  return (
    <DashboardLayout profile={profile}>
      <HomepageSettingsClient
        initialSettings={settings}
        initialServices={services || []}
        initialAreas={areas || []}
        draftSnapshot={draftRevision?.draft_snapshot || null}
        lastPublishedAt={publishedRevision?.published_at || null}
      />
    </DashboardLayout>
  );
}
