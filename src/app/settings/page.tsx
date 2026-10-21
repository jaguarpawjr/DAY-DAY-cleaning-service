import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import SettingsClient from './SettingsClient';
import { CompanySettings } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const { user, profile } = await getCurrentUser();
  if (!user || !profile || profile.role !== 'admin') {
    redirect('/dashboard?error=unauthorized');
  }

  const supabase = await createClient();
  const { data: settingsData } = await supabase.from('company_settings').select('*').maybeSingle();

  const settings = (settingsData as CompanySettings) || {
    id: '',
    company_name: 'DAYDAY SPARKLE AND SHINE CLEANING SERVICE',
    tagline: 'Satisfaction Guaranteed.',
    phone: '+233 24 555 8899',
    email: 'info@daydaysparkle.com',
    address: 'Spintex Road, Flowerpot, Accra, Ghana',
    default_currency: 'GH₵',
    tax_rate_percent: 0.00,
    momo_account_name: 'DAYDAY SPARKLE AND SHINE',
    momo_account_number: '0245558899',
    momo_network: 'MTN Mobile Money',
    bank_name: 'Ecobank Ghana',
    bank_account_name: 'DAYDAY SPARKLE AND SHINE CLEANING SERVICE',
    bank_account_number: '1441002233445',
    bank_branch: 'Spintex Branch',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return (
    <DashboardLayout profile={profile}>
      <SettingsClient initialSettings={settings} />
    </DashboardLayout>
  );
}
