'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, Save, CheckCircle2, AlertCircle, Building, CreditCard, Sparkles } from 'lucide-react';
import { CompanySettings } from '@/types/database';

export default function SettingsClient({ initialSettings }: { initialSettings: CompanySettings }) {
  const router = useRouter();
  const [companyName, setCompanyName] = useState(initialSettings.company_name);
  const [tagline, setTagline] = useState(initialSettings.tagline);
  const [phone, setPhone] = useState(initialSettings.phone);
  const [email, setEmail] = useState(initialSettings.email);
  const [address, setAddress] = useState(initialSettings.address);
  const [currency, setCurrency] = useState(initialSettings.default_currency);
  const [taxRate, setTaxRate] = useState(String(initialSettings.tax_rate_percent || '0'));

  // Mobile Money
  const [momoName, setMomoName] = useState(initialSettings.momo_account_name || 'DAYDAY SPARKLE AND SHINE');
  const [momoNumber, setMomoNumber] = useState(initialSettings.momo_account_number || '0245558899');
  const [momoNetwork, setMomoNetwork] = useState(initialSettings.momo_network || 'MTN Mobile Money');

  // Bank
  const [bankName, setBankName] = useState(initialSettings.bank_name || 'Ecobank Ghana');
  const [bankAccountName, setBankAccountName] = useState(
    initialSettings.bank_account_name || 'DAYDAY SPARKLE AND SHINE CLEANING SERVICE'
  );
  const [bankAccountNumber, setBankAccountNumber] = useState(
    initialSettings.bank_account_number || '1441002233445'
  );
  const [bankBranch, setBankBranch] = useState(initialSettings.bank_branch || 'Spintex Branch');

  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: companyName.trim(),
          tagline: tagline.trim(),
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim(),
          default_currency: currency.trim(),
          tax_rate_percent: parseFloat(taxRate || '0'),
          momo_account_name: momoName.trim(),
          momo_account_number: momoNumber.trim(),
          momo_network: momoNetwork.trim(),
          bank_name: bankName.trim(),
          bank_account_name: bankAccountName.trim(),
          bank_account_number: bankAccountNumber.trim(),
          bank_branch: bankBranch.trim(),
        }),
      });

      if (!res.ok) throw new Error('Failed to update company settings');

      setSuccessMessage('Company settings updated successfully.');
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Company Settings & Localization
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Configure business brand details, currency, payment accounts, and official invoices metadata.
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

      <form onSubmit={handleSave} className="space-y-6">
        {/* Company Identity */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Building className="w-4 h-4 text-blue-600" />
            <span>Brand Identity & Legal Name</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Company Legal Name
              </label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Official Tagline
              </label>
              <input
                type="text"
                required
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-blue-600 italic"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Phone Number
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Official Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">
                Physical Office Address (Accra, Ghana)
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Default Currency
              </label>
              <input
                type="text"
                required
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Tax Rate (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              />
            </div>
          </div>
        </div>

        {/* Ghanaian Payment Destination Details */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-600" />
            <span>Ghana Payment Accounts (Printed on Invoices)</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Mobile Money */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <p className="font-bold text-slate-800 uppercase tracking-wider">
                Mobile Money Details
              </p>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Network</label>
                <input
                  type="text"
                  value={momoNetwork}
                  onChange={(e) => setMomoNetwork(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">MoMo Number</label>
                <input
                  type="text"
                  value={momoNumber}
                  onChange={(e) => setMomoNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Account Name</label>
                <input
                  type="text"
                  value={momoName}
                  onChange={(e) => setMomoName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            {/* Bank Details */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <p className="font-bold text-slate-800 uppercase tracking-wider">
                Bank Transfer Details
              </p>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Bank Name</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Account Number</label>
                <input
                  type="text"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Account Name / Branch</label>
                <input
                  type="text"
                  value={bankAccountName}
                  onChange={(e) => setBankAccountName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isLoading ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
