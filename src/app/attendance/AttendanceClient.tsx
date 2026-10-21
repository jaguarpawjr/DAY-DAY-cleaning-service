'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, CheckCircle2, AlertCircle, LogIn, LogOut, Calendar, MapPin } from 'lucide-react';
import { formatDate, formatTime } from '@/lib/utils';
import { Attendance, Employee, Profile } from '@/types/database';

interface Props {
  profile: Profile;
  employeeRecord: Employee | null;
  todayAttendance: Attendance | null;
  allAttendance: Attendance[];
}

export default function AttendanceClient({
  profile,
  employeeRecord,
  todayAttendance,
  allAttendance,
}: Props) {
  const router = useRouter();
  const isAdmin = profile.role === 'admin';

  const [currentTime, setCurrentTime] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-GB', {
          timeZone: 'Africa/Accra',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleClock = async (action: 'clock_in' | 'clock_out') => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/attendance/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update attendance');

      setSuccessMessage(
        action === 'clock_in'
          ? 'You have successfully clocked in for today.'
          : 'You have successfully clocked out for today.'
      );
      setNotes('');
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Staff Attendance & Time Clock
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Daily attendance tracking in Accra, Ghana (GMT+0).
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-xs">{errorMessage}</p>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-xs">{successMessage}</p>
        </div>
      )}

      {/* Clock In / Out Terminal Card */}
      {!isAdmin && employeeRecord && (
        <div className="bg-gradient-to-r from-blue-700 to-blue-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/30 text-xs font-semibold mb-2">
                <Clock className="w-3.5 h-3.5" /> Africa/Accra Business Time
              </div>
              <h2 className="text-4xl font-mono font-extrabold tracking-tight">
                {currentTime || '08:00:00 AM'}
              </h2>
              <p className="text-blue-200 text-xs mt-1">
                Employee: <strong>{employeeRecord.full_name}</strong> ({employeeRecord.employee_id} - {employeeRecord.job_title})
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              {!todayAttendance && (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleClock('clock_in')}
                  className="w-full sm:w-auto px-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold rounded-2xl text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  <LogIn className="w-5 h-5" />
                  <span>Clock In For Today</span>
                </button>
              )}

              {todayAttendance && !todayAttendance.clock_out && (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleClock('clock_out')}
                  className="w-full sm:w-auto px-6 py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-2xl text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Clock Out Now</span>
                </button>
              )}

              {todayAttendance && todayAttendance.clock_out && (
                <div className="bg-white/10 backdrop-blur border border-white/20 p-3 rounded-2xl text-xs text-center">
                  <p className="font-bold text-emerald-300 flex items-center gap-1 justify-center">
                    <CheckCircle2 className="w-4 h-4" /> Day Completed
                  </p>
                  <p className="text-blue-100 text-[11px] mt-0.5">
                    In: {formatTime(todayAttendance.clock_in.split('T')[1])} | Out: {formatTime(todayAttendance.clock_out.split('T')[1])}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Attendance History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            {isAdmin ? 'Staff Daily Attendance Register' : 'My Attendance History'}
          </span>
        </div>

        {allAttendance.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No attendance sessions logged yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Clock In</th>
                  <th className="py-3 px-4">Clock Out</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {allAttendance.map((att) => (
                  <tr key={att.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {formatDate(att.work_date)}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{att.employee?.full_name}</p>
                      <p className="text-[10px] text-slate-400">{att.employee?.employee_id}</p>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-emerald-600 font-bold">
                      {att.clock_in ? formatDate(att.clock_in, true) : '—'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 font-bold">
                      {att.clock_out ? formatDate(att.clock_out, true) : 'Active Session'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`capitalize px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          att.status === 'present'
                            ? 'bg-emerald-100 text-emerald-800'
                            : att.status === 'late'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {att.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                      {att.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
