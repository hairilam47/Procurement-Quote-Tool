import { cn } from "@/lib/utils";

export type StatusKey =
  | "DRAFT"
  | "SENT"
  | "ACCEPTED"
  | "REJECTED"
  | "PAID"
  | "EXPIRED";

const CONFIG: Record<
  string,
  { label: string; dot: string; badge: string }
> = {
  DRAFT:    { label: "Draft",    dot: "bg-slate-400",   badge: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
  SENT:     { label: "Sent",     dot: "bg-blue-400",    badge: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  ACCEPTED: { label: "Accepted", dot: "bg-teal-400",    badge: "bg-teal-500/10 text-teal-400 border-teal-500/20" },
  REJECTED: { label: "Rejected", dot: "bg-red-400",     badge: "bg-red-500/10 text-red-400 border-red-500/20" },
  PAID:     { label: "Paid",     dot: "bg-emerald-400", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  EXPIRED:  { label: "Expired",  dot: "bg-amber-400",   badge: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
};

const FALLBACK = { label: "", dot: "bg-slate-400", badge: "bg-slate-500/10 text-slate-400 border-slate-500/20" };

interface StatusBadgeProps {
  status: string;
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const cfg = CONFIG[status] ?? { ...FALLBACK, label: status };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded border",
        cfg.badge,
        className,
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />
      {label ?? cfg.label}
    </span>
  );
}
