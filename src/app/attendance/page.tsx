import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import AttendanceClient from './AttendanceClient';
import { Attendance, Employee } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function AttendancePage() {
  const { user, profile } = await getCurrentUser();
  if (!user || !profile) {
    redirect('/login');
  }

  const supabase = await createClient();
  const isAdmin = profile.role === 'admin';

  let todayAttendance: Attendance | null = null;
  let employeeRecord: Employee | null = null;
  let allAttendance: Attendance[] = [];

  const todayStr = new Date().toISOString().split('T')[0];

  if (!isAdmin) {
    // Fetch current user's employee record
    const { data: emp } = await supabase
      .from('employees')
      .select('*')
      .eq('profile_id', user.id)
      .maybeSingle();

    if (emp) {
      employeeRecord = emp as Employee;
      const { data: att } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', emp.id)
        .eq('work_date', todayStr)
        .maybeSingle();

      todayAttendance = att as Attendance;

      const { data: myHistory } = await supabase
        .from('attendance')
        .select('*, employee:employees(*)')
        .eq('employee_id', emp.id)
        .order('work_date', { ascending: false })
        .limit(30);

      allAttendance = (myHistory as Attendance[]) || [];
    }
  } else {
    // Admin: fetch all attendance
    const { data: all } = await supabase
      .from('attendance')
      .select('*, employee:employees(*)')
      .order('work_date', { ascending: false })
      .limit(100);

    allAttendance = (all as Attendance[]) || [];
  }

  return (
    <DashboardLayout profile={profile}>
      <AttendanceClient
        profile={profile}
        employeeRecord={employeeRecord}
        todayAttendance={todayAttendance}
        allAttendance={allAttendance}
      />
    </DashboardLayout>
  );
}
