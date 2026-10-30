'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CompanySettings } from '@/types/database';

interface BrandProps {
  className?: string;
  iconClassName?: string;
  nameClassName?: string;
  taglineClassName?: string;
  showTagline?: boolean;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export default function Brand({
  className = 'inline-flex items-center gap-2',
  iconClassName = 'h-10 w-10 rounded-xl',
  nameClassName = 'font-extrabold text-slate-900 tracking-tight text-lg',
  taglineClassName = 'text-xs font-semibold text-blue-600',
  showTagline = true,
}: BrandProps) {
  const [settings, setSettings] = useState<Pick<CompanySettings, 'company_name' | 'tagline' | 'logo_url'> | null>(null);

  useEffect(() => {
    createClient()
      .from('company_settings')
      .select('company_name, tagline, logo_url')
      .maybeSingle()
      .then(({ data }) => setSettings(data));
  }, []);

  const companyName = settings?.company_name?.trim() || '';
  const tagline = settings?.tagline?.trim() || '';

  return (
    <span className={className}>
      {settings?.logo_url ? (
        <img
          src={settings.logo_url}
          alt={companyName || 'Company logo'}
          className={`${iconClassName} border border-slate-200 bg-white object-contain shadow-sm`}
        />
      ) : (
        <span className={`${iconClassName} flex items-center justify-center bg-blue-600 text-sm font-extrabold text-white shadow-md`}>
          {initials(companyName)}
        </span>
      )}
      <span className="min-w-0">
        <span className={nameClassName}>{companyName}</span>
        {showTagline && tagline && <span className={taglineClassName}>{tagline}</span>}
      </span>
    </span>
  );
}
