'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  CreditCard,
  Banknote,
  Users,
  Briefcase,
  AlertTriangle,
  Clock,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  CheckCircle2,
  DollarSign,
  PlusCircle,
  FileText,
  Filter,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Profile, Job, Booking, Invoice, Expense, Client, Employee } from '@/types/database';

interface DashboardClientProps {
  profile: Profile;
  initialData: {
    invoices: Invoice[];
    expenses: Expense[];
    jobs: Job[];
    bookings: Booking[];
    clients: Client[];
    employees: Employee[];
    lowStockCount: number;
    pendingExpensesCount: number;
    unresolvedComplaintsCount: number;
    myJobs?: Job[];
    todayAttendance?: any;
  };
}

const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#1e40af'];
const EXPENSE_COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#06b6d4', '#8b5cf6'];

export default function DashboardClient({ profile, initialData }: DashboardClientProps) {
  const isAdmin = profile.role === 'admin';
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'quarter' | 'year' | 'all'>('month');

  // Filter calculations based on date
  const filteredData = useMemo(() => {
    const now = new Date();
    let startDate = new Date(0); // epoch

    if (dateFilter === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (dateFilter === 'week') {
      const day = now.getDay() || 7;
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1);
    } else if (dateFilter === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (dateFilter === 'quarter') {
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
      startDate = new Date(now.getFullYear(), quarterMonth, 1);
    } else if (dateFilter === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
    }

    const invoices = (initialData.invoices || []).filter(
      (inv) => new Date(inv.issue_date) >= startDate
    );
    const expenses = (initialData.expenses || []).filter(
      (exp) => new Date(exp.date_incurred) >= startDate && exp.status !== 'rejected'
    );
    const jobs = (initialData.jobs || []).filter(
      (j) => new Date(j.scheduled_date) >= startDate
    );
    const bookings = (initialData.bookings || []).filter(
      (b) => new Date(b.created_at) >= startDate
    );

    // Financial Metrics
    const recognizedRevenue = invoices.reduce((acc, inv) => acc + Number(inv.total_amount || 0), 0);
    const paymentsReceived = invoices.reduce((acc, inv) => acc + Number(inv.paid_amount || 0), 0);
    const totalExpenses = expenses.reduce((acc, exp) => acc + Number(exp.amount || 0), 0);
    const netProfit = recognizedRevenue - totalExpenses;
    const profitMargin = recognizedRevenue > 0 ? (netProfit / recognizedRevenue) * 100 : 0;
    const outstandingBalances = invoices.reduce((acc, inv) => acc + Number(inv.balance_due || 0), 0);

    // Operational Metrics
    const todayStr = new Date().toISOString().split('T')[0];
    const jobsToday = (initialData.jobs || []).filter((j) => j.scheduled_date === todayStr);
    const jobsInProgress = (initialData.jobs || []).filter((j) => j.status === 'in_progress');
    const jobsCompleted = jobs.filter((j) => j.status === 'completed');
    const newBookings = bookings.filter((b) => b.status === 'pending');

    return {
      recognizedRevenue,
      paymentsReceived,
      totalExpenses,
      netProfit,
      profitMargin,
      outstandingBalances,
      jobsToday: jobsToday.length,
      jobsInProgress: jobsInProgress.length,
      jobsCompleted: jobsCompleted.length,
      newBookings: newBookings.length,
      totalClients: initialData.clients?.length || 0,
      activeEmployees: (initialData.employees || []).filter((e) => e.employment_status === 'active').length,
      invoices,
      expenses,
      jobs,
      bookings,
    };
  }, [dateFilter, initialData]);

  // Aggregate monthly trend data for Recharts
  const monthlyFinancialTrends = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();

    const data = months.map((monthName, idx) => ({
      name: monthName,
      revenue: 0,
      expenses: 0,
      profit: 0,
    }));

    (initialData.invoices || []).forEach((inv) => {
      const d = new Date(inv.issue_date);
      if (d.getFullYear() === currentYear) {
        const m = d.getMonth();
        data[m].revenue += Number(inv.total_amount || 0);
      }
    });

    (initialData.expenses || []).forEach((exp) => {
      if (exp.status !== 'rejected') {
        const d = new Date(exp.date_incurred);
        if (d.getFullYear() === currentYear) {
          const m = d.getMonth();
          data[m].expenses += Number(exp.amount || 0);
        }
      }
    });

    data.forEach((item) => {
      item.profit = item.revenue - item.expenses;
    });

    return data;
  }, [initialData]);

  // Aggregate expense breakdown by category
  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    (initialData.expenses || []).forEach((exp) => {
      if (exp.status !== 'rejected') {
        const cat = exp.category.replace('_', ' ');
        map[cat] = (map[cat] || 0) + Number(exp.amount || 0);
      }
    });

    return Object.entries(map).map(([name, value]) => ({
      name: name.toUpperCase(),
      value,
    }));
  }, [initialData.expenses]);

  // If Employee View
  if (!isAdmin) {
    const myJobs = initialData.myJobs || [];
    return (
      <div className="space-y-6">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-blue-700 to-blue-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/30 text-xs font-semibold text-blue-100 mb-2">
                <Sparkles className="w-3.5 h-3.5" /> DAYDAY Operations Portal
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Welcome, {profile.full_name}!
              </h1>
              <p className="text-blue-100 text-sm mt-1">
                Your assigned cleaning schedule and daily tasks. “Satisfaction Guaranteed.”
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/attendance"
                className="px-4 py-2.5 bg-white text-blue-700 hover:bg-blue-50 font-bold rounded-xl text-xs shadow-md transition-colors flex items-center gap-2"
              >
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Clock In / Out</span>
              </Link>
              <Link
                href="/expenses/new"
                className="px-4 py-2.5 bg-blue-600/80 hover:bg-blue-600 text-white font-semibold rounded-xl text-xs border border-blue-400/30 transition-colors flex items-center gap-2"
              >
                <TrendingUp className="w-4 h-4" />
                <span>Submit Expense</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Assigned Jobs List */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Your Assigned Cleaning Jobs</h2>
              <p className="text-xs text-slate-500">Update job status, record materials, and upload completion photos</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
              {myJobs.length} Assigned
            </span>
          </div>

          {myJobs.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
              <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No cleaning jobs assigned right now</p>
              <p className="text-xs text-slate-400 mt-1">
                Your supervisor or admin will assign you to upcoming client locations.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {myJobs.map((job) => (
                <div
                  key={job.id}
                  className="p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        {job.job_number}
                      </span>
                      <span className="text-sm font-bold text-slate-800">
                        {job.service?.name || 'Cleaning Service'}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                          job.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : job.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-700 animate-pulse'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {job.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 flex items-center gap-1.5 mt-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {formatDate(job.scheduled_date)} at {job.scheduled_start_time}
                    </p>
                    <p className="text-xs text-slate-500 truncate max-w-md">
                      📍 {job.location}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                    >
                      Open Job Details &rarr;
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Administrator View
  return (
    <div className="space-y-8">
      {/* Top Banner & Date Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Executive Operations Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time financial performance, scheduling, and cleaning operations.
          </p>
        </div>

        {/* Date Filter Pills */}
        <div className="inline-flex items-center p-1 bg-white border border-slate-200 rounded-2xl shadow-sm text-xs font-semibold">
          {(['today', 'week', 'month', 'quarter', 'year', 'all'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setDateFilter(filter)}
              className={`px-3 py-1.5 rounded-xl capitalize transition-all cursor-pointer ${
                dateFilter === filter
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {filter === 'all' ? 'All Time' : filter}
            </button>
          ))}
        </div>
      </div>

      {/* 1. FINANCIAL SUMMARY CARDS */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Financial Health ({dateFilter.toUpperCase()})
          </h2>
          <span className="text-xs text-blue-600 font-semibold">All figures in Ghana Cedis (GH₵)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Recognized Revenue */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Recognized Revenue</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Banknote className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <p className="text-2xl font-bold text-slate-900">
                {formatCurrency(filteredData.recognizedRevenue)}
              </p>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              Cash Received: <span className="font-semibold text-slate-700">{formatCurrency(filteredData.paymentsReceived)}</span>
            </p>
          </div>

          {/* Total Expenses */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Total Expenses</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <p className="text-2xl font-bold text-slate-900">
                {formatCurrency(filteredData.totalExpenses)}
              </p>
            </div>
            <p className="mt-2 text-[11px] text-amber-600 font-medium">
              {initialData.pendingExpensesCount} pending approval
            </p>
          </div>

          {/* Net Profit / Loss */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Net Profit</span>
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  filteredData.netProfit >= 0
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-red-50 text-red-600'
                }`}
              >
                {filteredData.netProfit >= 0 ? (
                  <ArrowUpRight className="w-4 h-4" />
                ) : (
                  <ArrowDownRight className="w-4 h-4" />
                )}
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <p
                className={`text-2xl font-bold ${
                  filteredData.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {formatCurrency(filteredData.netProfit)}
              </p>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  filteredData.netProfit >= 0
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {filteredData.profitMargin.toFixed(1)}% margin
              </span>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              Formula: Recognized Revenue − Recognized Expenses
            </p>
          </div>

          {/* Accounts Receivable */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Outstanding Receivables</span>
              <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(filteredData.outstandingBalances)}
              </p>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              Unpaid client invoice balances
            </p>
          </div>
        </div>
      </div>

      {/* 2. OPERATIONAL SUMMARY CARDS */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Daily Operations & Field Status
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-[11px] font-semibold text-slate-500">Jobs Today</p>
            <p className="text-xl font-bold text-blue-600 mt-1">{filteredData.jobsToday}</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-[11px] font-semibold text-slate-500">In Progress</p>
            <p className="text-xl font-bold text-amber-600 mt-1">{filteredData.jobsInProgress}</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-[11px] font-semibold text-slate-500">Completed Jobs</p>
            <p className="text-xl font-bold text-emerald-600 mt-1">{filteredData.jobsCompleted}</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-[11px] font-semibold text-slate-500">New Bookings</p>
            <p className="text-xl font-bold text-blue-600 mt-1">{filteredData.newBookings}</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-[11px] font-semibold text-slate-500">Low Stock Alerts</p>
            <p
              className={`text-xl font-bold mt-1 ${
                initialData.lowStockCount > 0 ? 'text-red-600' : 'text-slate-700'
              }`}
            >
              {initialData.lowStockCount}
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-[11px] font-semibold text-slate-500">Open Complaints</p>
            <p
              className={`text-xl font-bold mt-1 ${
                initialData.unresolvedComplaintsCount > 0 ? 'text-red-600' : 'text-slate-700'
              }`}
            >
              {initialData.unresolvedComplaintsCount}
            </p>
          </div>
        </div>
      </div>

      {/* 3. RECHARTS VISUALIZATIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue vs Expenses Bar/Line Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Revenue & Expense Performance (GH₵)</h3>
              <p className="text-xs text-slate-500">Monthly breakdown for current fiscal year</p>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyFinancialTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                <Tooltip
                  formatter={(val: any) => formatCurrency(Number(val))}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', borderColor: '#e2e8f0' }}
                />
                <Legend />
                <Bar dataKey="revenue" name="Revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Category Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Expense Breakdown</h3>
            <p className="text-xs text-slate-500">Distribution by operational category</p>
          </div>
          <div className="h-60 w-full mt-2">
            {expenseByCategory.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No recorded expenses
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {expenseByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => formatCurrency(Number(val))} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="text-center text-xs text-slate-400 pt-2 border-t border-slate-100">
            Total Incurred: <span className="font-bold text-slate-700">{formatCurrency(filteredData.totalExpenses)}</span>
          </div>
        </div>
      </div>

      {/* 4. RECENT CLEANING JOBS & BOOKINGS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Jobs */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">Upcoming & Active Jobs</h3>
            <Link href="/jobs" className="text-xs font-semibold text-blue-600 hover:underline">
              View All Jobs &rarr;
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {(initialData.jobs || []).slice(0, 5).map((job) => (
              <div key={job.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-600">{job.job_number}</span>
                    <span className="text-xs font-semibold text-slate-800">{job.service?.name}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {formatDate(job.scheduled_date)} • 📍 {job.location}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-900">{formatCurrency(job.agreed_price)}</p>
                  <span
                    className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                      job.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-700'
                        : job.status === 'in_progress'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {job.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Bookings */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">Pending Customer Bookings</h3>
            <Link href="/bookings" className="text-xs font-semibold text-blue-600 hover:underline">
              Review All &rarr;
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {(initialData.bookings || []).slice(0, 5).map((booking) => (
              <div key={booking.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                      {booking.booking_ref}
                    </span>
                    <span className="text-xs font-semibold text-slate-800">{booking.customer_name}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {booking.customer_phone} • Preferred: {formatDate(booking.preferred_date)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-blue-600">{formatCurrency(booking.quoted_price)}</p>
                  <Link
                    href={`/bookings/${booking.id}`}
                    className="inline-block mt-1 text-[11px] font-semibold text-blue-600 hover:underline"
                  >
                    Process Booking
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
