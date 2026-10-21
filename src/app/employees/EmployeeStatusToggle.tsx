'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function EmployeeStatusToggle({
  employeeId,
  isActive,
}: {
  employeeId: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [active, setActive] = useState(isActive);
  const [isLoading, setIsLoading] = useState(false);

  const toggleStatus = async () => {
    const nextState = !active;
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/employees', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: employeeId, is_active: nextState }),
      });

      if (res.ok) {
        setActive(nextState);
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={toggleStatus}
      disabled={isLoading}
      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
        active
          ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
          : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200'
      }`}
    >
      {isLoading ? '...' : active ? 'Deactivate' : 'Activate'}
    </button>
  );
}
