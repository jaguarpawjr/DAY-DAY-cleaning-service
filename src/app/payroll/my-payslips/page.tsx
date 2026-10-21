import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Banknote, FileText, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PayrollItem } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function MyPayslipsPage() {
  const { user, profile } = await getCurrentUser();
  if (!user || !profile) {
    redirect('/login');
  }

  const supabase = await createClient();

  // Find employee record
  const { data: empRecord } = await supabase
    .from('employees')
    .select('*')
    .eq('profile_id', user.id)
    .maybeSingle();

  let myPayslips: any[] = [];

  if (empRecord) {
    const { data } = await supabase
      .from('payroll_items')
      .select('*, payroll:payroll!inner(*)')
      .eq('employee_id', empRecord.id)
      .in('payroll.status', ['approved', 'paid'])
      .order('created_at', { ascending: false });

    myPayslips = data || [];
  }

  return (
    <DashboardLayout profile={profile}>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            My Salary Payslips & Earnings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Personal historical record of basic earnings, allowances, overtime, and net payments.
          </p>
        </div>

        {myPayslips.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-slate-400">
            <Banknote className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No payslips available yet</h3>
            <p className="text-slate-500 mt-1">
              Your official monthly payslips will appear here once finalized by administration.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {myPayslips.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6"
              >
                {/* Payslip Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-base font-extrabold text-slate-900">
                        DAYDAY SPARKLE AND SHINE
                      </h2>
                      <p className="text-xs text-blue-600 font-semibold italic">
                        “Satisfaction Guaranteed.”
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      {item.payroll?.payroll_ref}
                    </span>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Period: {item.payroll?.period_month}/{item.payroll?.period_year}
                    </p>
                  </div>
                </div>

                {/* Employee Info */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs bg-slate-50 p-4 rounded-2xl">
                  <div>
                    <span className="text-slate-400 font-medium">Employee Name</span>
                    <p className="font-bold text-slate-800 mt-0.5">{profile.full_name}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Employee ID</span>
                    <p className="font-bold text-slate-800 mt-0.5">{empRecord?.employee_id}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Job Title</span>
                    <p className="font-bold text-slate-800 mt-0.5">{empRecord?.job_title}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Disbursement</span>
                    <p className="font-bold text-emerald-600 uppercase mt-0.5">
                      {item.payment_status}
                    </p>
                  </div>
                </div>

                {/* Salary Breakdown Table */}
                <div className="text-xs space-y-2">
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-600">Basic Monthly Earnings:</span>
                    <span className="font-bold text-slate-800">{formatCurrency(item.basic_salary)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-600">Transport & Feeding Allowances:</span>
                    <span className="font-bold text-blue-600">+{formatCurrency(item.allowances)}</span>
                  </div>
                  {(Number(item.overtime_pay) > 0 || Number(item.bonus) > 0) && (
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-600">Overtime & Performance Bonus:</span>
                      <span className="font-bold text-emerald-600">
                        +{formatCurrency(Number(item.overtime_pay) + Number(item.bonus))}
                      </span>
                    </div>
                  )}
                  {Number(item.deductions) > 0 && (
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-600">Authorized Deductions:</span>
                      <span className="font-bold text-red-600">-{formatCurrency(item.deductions)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-3 text-base font-extrabold text-slate-900">
                    <span>NET TAKE-HOME SALARY:</span>
                    <span className="text-emerald-600">{formatCurrency(item.net_salary)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
