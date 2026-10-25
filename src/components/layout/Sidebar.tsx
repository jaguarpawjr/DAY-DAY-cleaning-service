'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarCheck,
  Briefcase,
  Users,
  FileText,
  CreditCard,
  TrendingUp,
  Package,
  Banknote,
  BarChart3,
  Settings,
  MessageSquareWarning,
  Sparkles,
  Shield,
  User,
  ChevronRight,
  Globe,
} from 'lucide-react';
import { Profile } from '@/types/database';

interface SidebarProps {
  profile: Profile | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ profile, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const isAdmin = profile?.role === 'admin';

  const adminNavSections = [
    {
      title: 'Operations',
      items: [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Cleaning Jobs', href: '/jobs', icon: Briefcase },
        { name: 'Bookings & Enquiries', href: '/bookings', icon: CalendarCheck },
        { name: 'Client CRM', href: '/clients', icon: Users },
      ],
    },
    {
      title: 'Finance & Accounting',
      items: [
        { name: 'Invoices & Billing', href: '/invoices', icon: FileText },
        { name: 'Payments & Paystack', href: '/payments', icon: CreditCard },
        { name: 'Expenses', href: '/expenses', icon: TrendingUp },
        { name: 'Financial Ledger', href: '/finance/ledger', icon: TrendingUp },
        { name: 'Profit & Loss', href: '/finance/pnl', icon: Banknote },
      ],
    },
    {
      title: 'Logistics & Personnel',
      items: [
        { name: 'Inventory & Supplies', href: '/inventory', icon: Package },
        { name: 'Employee Directory', href: '/employees', icon: Users },
        { name: 'Payroll & Salaries', href: '/payroll', icon: Banknote },
      ],
    },
    {
      title: 'Quality & Governance',
      items: [
        { name: 'Contracts', href: '/contracts', icon: FileText },
        { name: 'Complaints & QC', href: '/complaints', icon: MessageSquareWarning },
        { name: 'Business Reports', href: '/reports', icon: BarChart3 },
        { name: 'Homepage & Website Settings', href: '/settings/homepage', icon: Globe },
      ],
    },
  ];

  const employeeNavSections = [
    {
      title: 'Field Operations',
      items: [
        { name: 'My Assigned Jobs', href: '/dashboard', icon: Briefcase },
        { name: 'Submit Expense', href: '/expenses/new', icon: TrendingUp },
        { name: 'My Payslips', href: '/payroll/my-payslips', icon: Banknote },
        { name: 'My Payment History', href: '/my-payments', icon: CreditCard },
        { name: 'My Profile', href: '/profile', icon: User },
      ],
    },
  ];

  const sections = isAdmin ? adminNavSections : employeeNavSections;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-20 px-6 border-b border-slate-100 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/30">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm text-slate-900 leading-tight">
                DAYDAY
              </h1>
              <p className="text-[10px] font-semibold text-blue-600 tracking-wider">
                SPARKLE & SHINE
              </p>
            </div>
          </Link>

          <button
            onClick={onClose}
            className="lg:hidden p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
        </div>

        {/* Tagline Badge */}
        <div className="px-6 py-2.5 bg-blue-50/70 border-b border-blue-100/50 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
          <span className="text-[11px] font-medium text-blue-800 italic">
            “Satisfaction Guaranteed.”
          </span>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
          {sections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              <h3 className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {section.title}
              </h3>
              <div className="space-y-0.5 mt-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === '/dashboard'
                      ? pathname === '/dashboard'
                      : pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => {
                        if (window.innerWidth < 1024) onClose();
                      }}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                        <span>{item.name}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* User Card & Role Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-100 border border-blue-200 text-blue-700 font-bold flex items-center justify-center text-xs">
              {profile?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">
                {profile?.full_name || 'Staff User'}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase ${
                    isAdmin
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {isAdmin ? <Shield className="w-2.5 h-2.5 mr-0.5" /> : null}
                  {profile?.role || 'employee'}
                </span>
                <span className="text-[10px] text-slate-400 truncate">Accra, GH</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
