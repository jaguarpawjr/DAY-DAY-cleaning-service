import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Link from 'next/link';
import { User, Phone, Mail, Shield, Lock } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const { user, profile } = await getCurrentUser();
  if (!user || !profile) {
    redirect('/login');
  }

  return (
    <DashboardLayout profile={profile}>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            My Staff Profile
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Personal identity, system permissions, and account security.
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white font-extrabold text-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              {profile.full_name?.charAt(0) || 'U'}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{profile.full_name}</h2>
              <span className="capitalize px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold inline-block mt-1">
                {profile.role}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 font-semibold">Email Address</span>
              <p className="text-slate-900 font-bold mt-0.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-blue-600" /> {profile.email}
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-semibold">Phone Number</span>
              <p className="text-slate-900 font-bold mt-0.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-blue-600" /> {profile.phone || '—'}
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-semibold">Account Status</span>
              <p className="text-emerald-600 font-bold mt-0.5">Active</p>
            </div>
            <div>
              <span className="text-slate-400 font-semibold">Account Created</span>
              <p className="text-slate-700 font-medium mt-0.5">{formatDate(profile.created_at)}</p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <Link
              href="/update-password"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors"
            >
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>Change Password</span>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
