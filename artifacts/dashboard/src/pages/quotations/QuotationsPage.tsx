import { useState } from "react";
import { useListQuotations } from "@workspace/api-client-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { formatCurrency, formatDate, statusBadge, STATUS_LABELS } from "@/lib/format";
import { Plus, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUSES = ["ALL", "DRAFT", "SENT", "ACCEPTED", "REJECTED", "PAID", "EXPIRED"];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};
const row = { hidden: { opacity: 0, x: -8 }, show: { opacity: 1, x: 0 } };

export default function QuotationsPage() {
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");

  const apiStatus = status === "ALL" ? undefined : status;
  const { data: quotations = [], isLoading } = useListQuotations(
    apiStatus ? { status: apiStatus } : undefined
  );

  const filtered = quotations.filter((q) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      q.number.toLowerCase().includes(s) ||
      (q.clientName ?? "").toLowerCase().includes(s) ||
      (q.clientCompany ?? "").toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Quotations</h1>
          <p className="text-slate-400 text-sm mt-0.5">{quotations.length} total</p>
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
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <Input
            placeholder="Search quotations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 h-9"
            data-testid="quotations-search"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40 bg-slate-900 border-slate-700 text-white h-9">
            <Filter size={13} className="mr-1.5 text-slate-500" />
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-700">
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="text-white">
                {s === "ALL" ? "All statuses" : STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_2fr_1fr_1fr_1fr_auto] gap-0 border-b border-slate-800 px-4 py-2.5">
          {["Number", "Client", "Status", "Total", "Valid Until", ""].map((h) => (
            <span key={h} className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              {h}
            </span>
          ))}
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-500 text-sm">No quotations found</p>
            <Link href="/quotations/new">
              <span className="inline-flex items-center gap-1 text-blue-400 text-sm mt-2 cursor-pointer hover:text-blue-300">
                <Plus size={13} /> Create your first quotation
              </span>
            </Link>
          </div>
        ) : (
          <motion.div variants={container} initial="hidden" animate="show">
            {filtered.map((q) => (
              <motion.div key={q.id} variants={row}>
                <Link href={`/quotations/${q.id}`}>
                  <div className="grid grid-cols-[1fr_2fr_1fr_1fr_1fr_auto] gap-0 items-center px-4 py-3.5 border-b border-slate-800/50 hover:bg-slate-800/50 transition-colors cursor-pointer group">
                    <span className="text-white text-sm font-mono font-medium">{q.number}</span>
                    <div className="min-w-0 pr-4">
                      <p className="text-white text-sm truncate">{q.clientName ?? "-"}</p>
                      {q.clientCompany && (
                        <p className="text-slate-500 text-xs truncate">{q.clientCompany}</p>
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
                      <p className="text-white text-sm font-semibold">
                        {q.requiredTotal && q.requiredTotal !== q.total
                          ? `Full total: ${formatCurrency(q.total, q.currency)}`
                          : formatCurrency(q.total, q.currency)}
                      </p>
                      {q.requiredTotal && q.requiredTotal !== q.total && (
                        <p className="text-amber-400 text-xs mt-0.5">
                          Amount due now: {formatCurrency(q.requiredTotal, q.currency)}
                        </p>
                      )}
                    </div>
                    <span className="text-slate-400 text-sm">{formatDate(q.validUntil)}</span>
                    <span className="text-blue-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                      View &rarr;
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
