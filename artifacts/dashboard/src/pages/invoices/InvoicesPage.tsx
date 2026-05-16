import { useState, useEffect } from "react";
import { useListInvoices } from "@workspace/api-client-react";
import { Link, useSearch } from "wouter";
import { motion } from "framer-motion";
import { formatCurrency, formatDate, INVOICE_STATUS_LABELS } from "@/lib/format";
import { Receipt, Search, Filter, ArrowUpDown, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { BeamCard } from "@/components/ui/beam-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUSES = ["ALL", "DRAFT", "SENT", "PAID"];

type SortOption = "DEFAULT" | "AMOUNT_ASC" | "AMOUNT_DESC";

function SkeletonRow() {
  return (
    <div className="grid grid-cols-[1fr_2fr_1fr_1fr_1fr_auto] items-center px-4 py-3.5 border-b border-border/50">
      <div className="h-3.5 bg-muted rounded animate-pulse w-20" />
      <div className="h-3.5 bg-muted rounded animate-pulse w-32" />
      <div className="h-5 bg-muted rounded animate-pulse w-14" />
      <div className="h-3.5 bg-muted rounded animate-pulse w-20" />
      <div className="h-3.5 bg-muted rounded animate-pulse w-20" />
      <div className="w-3" />
    </div>
  );
}

export default function InvoicesPage() {
  const search_ = useSearch();
  const initialStatus = (() => {
    const p = new URLSearchParams(search_).get("status");
    if (p && STATUSES.includes(p)) return p;
    return "ALL";
  })();

  const [status, setStatus] = useState(initialStatus);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("DEFAULT");

  useEffect(() => {
    const p = new URLSearchParams(search_).get("status");
    const next = p && STATUSES.includes(p) ? p : "ALL";
    setStatus(next);
  }, [search_]);

  const apiStatus = status === "ALL" ? undefined : status;
  const { data: invoices = [], isLoading } = useListInvoices(
    apiStatus ? { status: apiStatus } : undefined,
  );

  const filtered = invoices.filter((inv) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      inv.number.toLowerCase().includes(s) ||
      (inv.clientName ?? "").toLowerCase().includes(s) ||
      (inv.clientCompany ?? "").toLowerCase().includes(s)
    );
  });

  const sorted =
    sort === "DEFAULT"
      ? filtered
      : [...filtered].sort((a, b) => {
          const aTotal = parseFloat(a.total ?? "0");
          const bTotal = parseFloat(b.total ?? "0");
          if (sort === "AMOUNT_DESC") return bTotal - aTotal;
          return aTotal - bTotal;
        });

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <PageHeader
        title="Invoices"
        subtitle={`${invoices.length} total`}
        actions={[
          { label: "New Quotation", href: "/quotations/new", variant: "primary" },
          { label: "New Invoice", href: "/invoices/new", variant: "secondary", testId: "new-invoice-btn" },
        ]}
      />

      {/* Filters */}
      <div className="flex gap-2.5 flex-wrap">
        <div className="relative flex-1 min-w-44">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
            data-testid="invoices-search"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40 h-9 text-sm">
            <Filter size={12} className="mr-1.5 text-muted-foreground flex-shrink-0" />
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s === "ALL" ? "All statuses" : INVOICE_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
          <SelectTrigger className="w-48 h-9 text-sm">
            <ArrowUpDown size={12} className="mr-1.5 text-muted-foreground flex-shrink-0" />
            <SelectValue placeholder="Sort by..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="DEFAULT">Default order</SelectItem>
            <SelectItem value="AMOUNT_DESC">Amount: High to Low</SelectItem>
            <SelectItem value="AMOUNT_ASC">Amount: Low to High</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <BeamCard>
        <div className="grid grid-cols-[1fr_2fr_1fr_1fr_1fr_auto] items-center px-4 py-2.5 border-b border-border bg-muted/30">
          {["Number", "Client", "Status", "Total", "Due Date", ""].map((h) => (
            <span key={h} className="text-xs font-medium text-muted-foreground/80 uppercase tracking-wider">
              {h}
            </span>
          ))}
        </div>

        {isLoading ? (
          <>
            {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
          </>
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No invoices found"
            description={
              search || status !== "ALL"
                ? "Try adjusting your filters to see more results."
                : "Create your first invoice to start billing clients."
            }
            action={
              !search && status === "ALL"
                ? { label: "New Invoice", href: "/invoices/new" }
                : undefined
            }
          />
        ) : (
          <div className="p-3 space-y-1.5">
            {sorted.map((inv, idx) => (
              <div
                key={inv.id}
                className="animate-fade-slide-in"
                style={{ animationDelay: `${Math.min(idx * 30, 350)}ms` }}
              >
                <Link href={`/invoices/${inv.id}`}>
                  <div className="grid grid-cols-[1fr_2fr_1fr_1fr_1fr_auto] items-center px-4 py-3 rounded-xl bg-muted/20 dark:bg-white/[0.04] hover:bg-muted/30 dark:hover:bg-white/[0.07] transition-colors cursor-pointer group">
                    <span className="text-foreground text-sm font-mono">{inv.number}</span>
                    <div className="min-w-0 pr-4">
                      <p className="text-foreground text-sm truncate">{inv.clientName ?? "-"}</p>
                      {inv.clientCompany && (
                        <p className="text-muted-foreground text-xs truncate">{inv.clientCompany}</p>
                      )}
                    </div>
                    <span>
                      <StatusBadge status={inv.status} label={INVOICE_STATUS_LABELS[inv.status]} />
                    </span>
                    <p className="text-foreground text-sm font-semibold tabular-nums">
                      {formatCurrency(inv.total, inv.currency)}
                    </p>
                    <span className="text-muted-foreground text-sm">{formatDate(inv.dueDate)}</span>
                    <span className="text-muted-foreground/40 text-xs group-hover:text-violet-400 transition-colors">
                      →
                    </span>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </BeamCard>
    </motion.div>
  );
}
