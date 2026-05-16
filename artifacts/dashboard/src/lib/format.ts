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

// Unified status colours — consistent across all entity types.
// PAID = emerald (money/success), ACCEPTED = teal, SENT = blue, DRAFT = slate.
export const STATUS_COLORS: Record<string, string> = {
  DRAFT:    "bg-slate-500/10 text-slate-400 border border-slate-500/20",
  SENT:     "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  ACCEPTED: "bg-teal-500/10 text-teal-400 border border-teal-500/20",
  REJECTED: "bg-red-500/10 text-red-400 border border-red-500/20",
  PAID:     "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  EXPIRED:  "bg-amber-500/10 text-amber-400 border border-amber-500/20",
};

export const STATUS_LABELS: Record<string, string> = {
  DRAFT:    "Draft",
  SENT:     "Sent",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  PAID:     "Paid",
  EXPIRED:  "Expired",
};

export function statusBadge(status: string) {
  return STATUS_COLORS[status] ?? "bg-slate-500/10 text-slate-400 border border-slate-500/20";
}

// Invoice statuses share the same unified palette.
export const INVOICE_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-500/10 text-slate-400 border border-slate-500/20",
  SENT:  "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  PAID:  "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
};

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SENT:  "Sent",
  PAID:  "Paid",
};

export function invoiceStatusBadge(status: string) {
  return INVOICE_STATUS_COLORS[status] ?? "bg-slate-500/10 text-slate-400 border border-slate-500/20";
}
