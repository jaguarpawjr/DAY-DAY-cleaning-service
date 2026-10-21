import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency in Ghana Cedis (GH₵)
 */
export function formatCurrency(amount: number | null | undefined): string {
  const numericAmount = Number(amount) || 0;
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(numericAmount)
    .replace("GHS", "GH₵");
}

/**
 * Format date in Africa/Accra timezone
 */
export function formatDate(
  dateInput: string | Date | null | undefined,
  includeTime: boolean = false
): string {
  if (!dateInput) return "—";
  try {
    const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) return "—";

    const options: Intl.DateTimeFormatOptions = {
      timeZone: "Africa/Accra",
      year: "numeric",
      month: "short",
      day: "numeric",
      ...(includeTime
        ? {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }
        : {}),
    };

    return new Intl.DateTimeFormat("en-GB", options).format(date);
  } catch {
    return String(dateInput);
  }
}

/**
 * Format time only in Africa/Accra
 */
export function formatTime(timeStr: string | null | undefined): string {
  if (!timeStr) return "—";
  if (timeStr.includes(":")) {
    const [hours, minutes] = timeStr.split(":");
    const h = parseInt(hours, 10);
    const m = minutes.substring(0, 2);
    const ampm = h >= 12 ? "PM" : "AM";
    const formattedH = h % 12 || 12;
    return `${formattedH}:${m} ${ampm}`;
  }
  return timeStr;
}

/**
 * Financial Accounting Calculations
 */
export function calculateFinancialSummary(
  recognizedRevenue: number,
  recognizedExpenses: number
) {
  const rev = Number(recognizedRevenue) || 0;
  const exp = Number(recognizedExpenses) || 0;
  const netProfit = rev - exp;
  const profitMargin = rev > 0 ? (netProfit / rev) * 100 : 0;

  return {
    recognizedRevenue: rev,
    recognizedExpenses: exp,
    netProfit,
    profitMargin: Math.round(profitMargin * 100) / 100,
    isProfitable: netProfit >= 0,
  };
}
