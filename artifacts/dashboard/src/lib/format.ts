export function formatCurrency(amount: string | number, currency = "USD"): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "-";
  const code = (currency ?? "").trim().toUpperCase();
  if (code.length !== 3) {
    return num.toFixed(2);
  }
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      minimumFractionDigits: 2,
    }).format(num);
  } catch {
    return `${code} ${num.toFixed(2)}`;
  }
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatRelativeDate(date: string): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return formatDate(date);
}

export const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-700 text-slate-200",
  SENT: "bg-blue-600/20 text-blue-400 border border-blue-600/30",
  ACCEPTED: "bg-emerald-600/20 text-emerald-400 border border-emerald-600/30",
  REJECTED: "bg-red-600/20 text-red-400 border border-red-600/30",
  PAID: "bg-violet-600/20 text-violet-400 border border-violet-600/30",
  EXPIRED: "bg-amber-600/20 text-amber-400 border border-amber-600/30",
};

export const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  PAID: "Paid",
  EXPIRED: "Expired",
};

export function statusBadge(status: string) {
  return STATUS_COLORS[status] ?? "bg-slate-700 text-slate-300";
}

export const INVOICE_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-700 text-slate-200",
  SENT: "bg-blue-600/20 text-blue-400 border border-blue-600/30",
  PAID: "bg-emerald-600/20 text-emerald-400 border border-emerald-600/30",
};

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  PAID: "Paid",
};

export function invoiceStatusBadge(status: string) {
  return INVOICE_STATUS_COLORS[status] ?? "bg-slate-700 text-slate-300";
}
