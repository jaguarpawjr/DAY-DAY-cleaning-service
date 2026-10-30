import type { Metadata } from "next";
import "./globals.css";
import { createClient } from '@/lib/supabase/server';

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from('company_settings')
    .select('company_name, tagline')
    .maybeSingle();

  return {
    title: settings?.company_name || 'Cleaning Service',
    description: settings?.tagline || 'Professional cleaning services.',
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
