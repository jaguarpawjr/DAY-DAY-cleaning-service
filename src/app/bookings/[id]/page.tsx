import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Link from 'next/link';
import { ArrowLeft, Phone, MapPin, Calendar, Clock, DollarSign, CheckCircle2 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Booking, Employee } from '@/types/database';
import BookingProcessClient from './BookingProcessClient';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BookingProcessPage({ params }: Props) {
  const { id } = await params;
  const { user, profile } = await getCurrentUser();
  if (!user || !profile || profile.role !== 'admin') {
    redirect('/dashboard?error=unauthorized');
  }

  const supabase = await createClient();

  const [bookingRes, employeesRes] = await Promise.all([
    supabase.from('bookings').select('*, service:services(*)').eq('id', id).single(),
    supabase.from('employees').select('*').eq('employment_status', 'active'),
  ]);

  if (bookingRes.error || !bookingRes.data) {
    notFound();
  }

  const booking = bookingRes.data as Booking;
  const employees = (employeesRes.data as Employee[]) || [];

  return (
    <DashboardLayout profile={profile}>
      <BookingProcessClient booking={booking} employees={employees} />
    </DashboardLayout>
  );
}
