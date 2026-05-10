import { useState } from "react";
import { useListQuotations } from "@workspace/api-client-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { formatCurrency, formatDate, statusBadge, STATUS_LABELS } from "@/lib/format";
import { Plus, Search, Filter, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { BeamCard } from "@/components/ui/beam-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUSES = ["ALL", "DRAFT", "SENT", "ACCEPTED", "REJECTED", "PAID", "EXPIRED"];
const DEFERRED_FILTER = "DEFERRED";

type SortOption = "DEFAULT" | "AMOUNT_ASC" | "AMOUNT_DESC";

export default function QuotationsPage() {
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("DEFAULT");

  const isDeferred = status === DEFERRED_FILTER;
  const apiStatus = status === "ALL" || isDeferred ? undefined : status;
  const { data: quotations = [], isLoading } = useListQuotations(
    apiStatus ? { status: apiStatus } : undefined
  );

  const filtered = quotations.filter((q) => {
    if (isDeferred) {
      const total = parseFloat(q.total ?? "0");
      const requiredTotal = parseFloat(q.requiredTotal ?? "0");
      if (!(requiredTotal < total)) return false;
    }
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      q.number.toLowerCase().includes(s) ||
      (q.clientName ?? "").toLowerCase().includes(s) ||
      (q.clientCompany ?? "").toLowerCase().includes(s)
    );
  });

  const sorted = sort === "DEFAULT" ? filtered : [...filtered].sort((a, b) => {
    const aTotal = parseFloat(a.total ?? "0");
    const bTotal = parseFloat(b.total ?? "0");
    const aRequired = parseFloat(a.requiredTotal ?? a.total ?? "0");
    const bRequired = parseFloat(b.requiredTotal ?? b.total ?? "0");
    const aIsSplit = aRequired < aTotal;
    const bIsSplit = bRequired < bTotal;

    if (sort === "AMOUNT_DESC") {
      if (aIsSplit && !bIsSplit) return -1;
      if (!aIsSplit && bIsSplit) return 1;
      return bRequired - aRequired;
    } else {
      if (aIsSplit && !bIsSplit) return -1;
      if (!aIsSplit && bIsSplit) return 1;
      return aRequired - bRequired;
    }
  });

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Quotations</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{quotations.length} total</p>
        </div>
        <Link href="/quotations/new">
          <span data-testid="new-quotation-btn" className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer">
            <Plus size={15} />
            New Quotation
          </span>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search quotations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-input border-border text-foreground placeholder:text-muted-foreground h-9"
            data-testid="quotations-search"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40 bg-input border-border text-foreground h-9">
            <Filter size={13} className="mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="text-foreground">
                {s === "ALL" ? "All statuses" : STATUS_LABELS[s]}
              </SelectItem>
            ))}
            <SelectItem value={DEFERRED_FILTER} className="text-amber-400">
              Has deferred items
            </SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
          <SelectTrigger className="w-48 bg-input border-border text-foreground h-9" data-testid="sort-select">
            <ArrowUpDown size={13} className="mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Sort by..." />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="DEFAULT" className="text-foreground">Default order</SelectItem>
            <SelectItem value="AMOUNT_DESC" className="text-foreground">Due now: High to Low</SelectItem>
            <SelectItem value="AMOUNT_ASC" className="text-foreground">Due now: Low to High</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <BeamCard>
        <div className="grid grid-cols-[1fr_2fr_1fr_1fr_1fr_auto] gap-0 border-b border-border px-4 py-2.5">
          {["Number", "Client", "Status", "Total", "Valid Until", ""].map((h) => (
            <span key={h} className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {h}
            </span>
          ))}
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Loading...</div>
        ) : sorted.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-muted-foreground text-sm">No quotations found</p>
            <Link href="/quotations/new">
              <span className="inline-flex items-center gap-1 text-blue-400 text-sm mt-2 cursor-pointer hover:text-blue-300">
                <Plus size={13} /> Create your first quotation
              </span>
            </Link>
          </div>
        ) : (
          <div>
            {sorted.map((q, idx) => (
              <div
                key={q.id}
                className="animate-fade-slide-in"
                style={{ animationDelay: `${Math.min(idx * 35, 400)}ms` }}
              >
                <Link href={`/quotations/${q.id}`}>
                  <div className="grid grid-cols-[1fr_2fr_1fr_1fr_1fr_auto] gap-0 items-center px-4 py-3.5 border-b border-border/50 hover:bg-muted/50 transition-colors cursor-pointer group">
                    <span className="text-foreground text-sm font-mono font-medium">{q.number}</span>
                    <div className="min-w-0 pr-4">
                      <p className="text-foreground text-sm truncate">{q.clientName ?? "-"}</p>
                      {q.clientCompany && (
                        <p className="text-muted-foreground text-xs truncate">{q.clientCompany}</p>
                      )}
                    </div>
                    <span>
                      <span
                        className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge(q.status)}`}
                      >
                        {STATUS_LABELS[q.status] ?? q.status}
                      </span>
                    </span>
                    <div>
                      <p className="text-foreground text-sm font-semibold">
                        {q.requiredTotal && q.requiredTotal !== q.total
                          ? `Full total: ${formatCurrency(q.total, q.currency)}`
                          : formatCurrency(q.total, q.currency)}
                      </p>
                      {q.requiredTotal && q.requiredTotal !== q.total && (
                        <p className="text-amber-400 text-xs mt-0.5">
                          Due now: {formatCurrency(q.requiredTotal, q.currency)}
                        </p>
                      )}
                    </div>
                    <span className="text-muted-foreground text-sm">{formatDate(q.validUntil)}</span>
                    <span className="text-blue-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                      View &rarr;
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
