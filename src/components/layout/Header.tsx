'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Menu,
  Bell,
  Plus,
  LogOut,
  User,
  Shield,
  ChevronDown,
  CalendarCheck,
  TrendingUp,
  Package,
  Users,
  Briefcase,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { Profile, Notification } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import { CompanySettings } from '@/types/database';

interface HeaderProps {
  profile: Profile | null;
  onOpenSidebar: () => void;
}

export default function Header({ profile, onOpenSidebar }: HeaderProps) {
  const router = useRouter();
  const supabase = createClient();
  const isAdmin = profile?.role === 'admin';

  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [settings, setSettings] = useState<Pick<CompanySettings, 'company_name' | 'tagline'> | null>(null);

  // Load notifications
  useEffect(() => {
    supabase.from('company_settings').select('company_name, tagline').maybeSingle().then(({ data }) => setSettings(data));
  }, [supabase]);

  useEffect(() => {
    async function loadNotifications() {
      try {
        const { data } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(8);

        if (data) {
          setNotifications(data as Notification[]);
          setUnreadCount(data.filter((n) => !n.is_read).length);
        }
      } catch (err) {
        console.error('Error fetching notifications:', err);
      }
    }

    loadNotifications();
  }, [supabase]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-30 h-20 bg-white/95 backdrop-blur border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between">
      {/* Mobile Menu & Current Date/Time */}
      <div className="flex items-center gap-4">
        <button
          onClick={onOpenSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div className="hidden sm:block">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              {settings?.company_name || ''}
            </span>
            <span className="text-[10px] text-slate-400">•</span>
            <span className="text-xs text-blue-600 font-semibold italic">
              {settings?.tagline || ''}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Operational Timezone: <span className="font-semibold text-slate-700">Africa/Accra (GMT+0)</span>
          </p>
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        {/* Quick Actions (Admin Only) */}
        {isAdmin && (
          <div className="relative">
            <button
              onClick={() => {
                setShowQuickActions(!showQuickActions);
                setShowNotifications(false);
                setShowProfileMenu(false);
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden md:inline">Quick Action</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {showQuickActions && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Create Record
                </div>
                <Link
                  href="/bookings/new"
                  onClick={() => setShowQuickActions(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                >
                  <CalendarCheck className="w-4 h-4 text-blue-600" />
                  <span>New Booking / Inquiry</span>
                </Link>
                <Link
                  href="/jobs/new"
                  onClick={() => setShowQuickActions(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                >
                  <Briefcase className="w-4 h-4 text-blue-600" />
                  <span>Assign Cleaning Job</span>
                </Link>
                <Link
                  href="/clients/new"
                  onClick={() => setShowQuickActions(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                >
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>Add Customer CRM</span>
                </Link>
                <Link
                  href="/expenses/new"
                  onClick={() => setShowQuickActions(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                >
                  <TrendingUp className="w-4 h-4 text-amber-600" />
                  <span>Record Business Expense</span>
                </Link>
                <Link
                  href="/inventory/new"
                  onClick={() => setShowQuickActions(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                >
                  <Package className="w-4 h-4 text-emerald-600" />
                  <span>Register Inventory Item</span>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowQuickActions(false);
              setShowProfileMenu(false);
            }}
            className="relative p-2.5 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 py-3 z-50 animate-in fade-in zoom-in-95">
              <div className="px-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Notifications & Alerts</span>
                <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  {unreadCount} unread
                </span>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No active notifications
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleMarkAsRead(n.id)}
                      className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer ${
                        !n.is_read ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-bold text-slate-800">{n.title}</p>
                        {!n.is_read && (
                          <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Menu */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowQuickActions(false);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-sm">
              {profile?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-slate-800 truncate max-w-[120px]">
                {profile?.full_name?.split(' ')[0] || 'User'}
              </p>
              <p className="text-[10px] text-blue-600 font-semibold capitalize">
                {profile?.role || 'Staff'}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900">{profile?.full_name}</p>
                <p className="text-[11px] text-slate-500 truncate">{profile?.email}</p>
              </div>

              <div className="py-1">
                <Link
                  href="/profile"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  <span>My Profile</span>
                </Link>
                {isAdmin && (
                  <Link
                    href="/settings"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    <Shield className="w-4 h-4 text-slate-400" />
                    <span>Company Settings</span>
                  </Link>
                )}
              </div>

              <div className="pt-1 border-t border-slate-100">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 text-left"
                >
                  <LogOut className="w-4 h-4 text-red-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
