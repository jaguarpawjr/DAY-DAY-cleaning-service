import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Link from 'next/link';
import { Users, Plus, Phone, Mail, Shield, CheckCircle2, XCircle } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Employee } from '@/types/database';
import EmployeeStatusToggle from './EmployeeStatusToggle';

export const dynamic = 'force-dynamic';

export default async function EmployeesPage() {
  const { user, profile } = await getCurrentUser();
  if (!user || !profile || profile.role !== 'admin') {
    redirect('/dashboard?error=unauthorized');
  }

  const supabase = await createClient();
  const { data: employeesData } = await supabase
    .from('employees')
    .select('*, profile:profiles(*)')
    .order('hire_date', { ascending: false });

  const employees = (employeesData as Employee[]) || [];

  return (
    <DashboardLayout profile={profile}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Employee & Personnel Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Onboard staff, manage salary arrangements, and control system authentication access.
            </p>
          </div>
          <Link
            href="/employees/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Onboard New Employee</span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              {employees.length} Staff Members
            </span>
          </div>

          {employees.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No employees registered yet. Click &ldquo;Onboard New Employee&rdquo; to add your first staff member.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/75 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Employee ID</th>
                    <th className="py-3 px-4">Full Name & Job Title</th>
                    <th className="py-3 px-4">Contact Info</th>
                    <th className="py-3 px-4">Hire Date</th>
                    <th className="py-3 px-4">Salary Arrangement</th>
                    <th className="py-3 px-4 text-right">Base Pay</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Account Access</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                        {emp.employee_id}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900">{emp.full_name}</p>
                        <p className="text-[11px] text-blue-600 font-semibold">{emp.job_title}</p>
                      </td>
                      <td className="py-3.5 px-4 space-y-0.5">
                        <div className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{emp.phone}</span>
                        </div>
                        {emp.email && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-400">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>{emp.email}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">{formatDate(emp.hire_date)}</td>
                      <td className="py-3.5 px-4 capitalize">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                          {emp.salary_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-slate-900">
                        {formatCurrency(emp.base_salary)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`capitalize px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            emp.employment_status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {emp.employment_status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <EmployeeStatusToggle
                          employeeId={emp.id}
                          isActive={emp.employment_status === 'active'}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
