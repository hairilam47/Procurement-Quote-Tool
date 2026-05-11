import { useState } from "react";
import { useListInvoices } from "@workspace/api-client-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { formatCurrency, formatDate, invoiceStatusBadge, INVOICE_STATUS_LABELS } from "@/lib/format";
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

const STATUSES = ["ALL", "DRAFT", "SENT", "PAID"];

type SortOption = "DEFAULT" | "AMOUNT_ASC" | "AMOUNT_DESC";

export default function InvoicesPage() {
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("DEFAULT");

  const apiStatus = status === "ALL" ? undefined : status;
  const { data: invoices = [], isLoading } = useListInvoices(
    apiStatus ? { status: apiStatus } : undefined
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

  const sorted = sort === "DEFAULT" ? filtered : [...filtered].sort((a, b) => {
    const aTotal = parseFloat(a.total ?? "0");
    const bTotal = parseFloat(b.total ?? "0");
    if (sort === "AMOUNT_DESC") return bTotal - aTotal;
    return aTotal - bTotal;
  });

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{invoices.length} total</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/quotations/new">
            <span className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer">
              <Plus size={15} />
              New Quotation
            </span>
          </Link>
          <Link href="/invoices/new">
            <span data-testid="new-invoice-btn" className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer">
              <Plus size={15} />
              New Invoice
            </span>
          </Link>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-input border-border text-foreground placeholder:text-muted-foreground h-9"
            data-testid="invoices-search"
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
                {s === "ALL" ? "All statuses" : INVOICE_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
          <SelectTrigger className="w-48 bg-input border-border text-foreground h-9">
            <ArrowUpDown size={13} className="mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Sort by..." />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="DEFAULT" className="text-foreground">Default order</SelectItem>
            <SelectItem value="AMOUNT_DESC" className="text-foreground">Amount: High to Low</SelectItem>
            <SelectItem value="AMOUNT_ASC" className="text-foreground">Amount: Low to High</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <BeamCard>
        <div className="grid grid-cols-[1fr_2fr_1fr_1fr_1fr_auto] gap-0 border-b border-border px-4 py-2.5">
          {["Number", "Client", "Status", "Total", "Due Date", ""].map((h) => (
            <span key={h} className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {h}
            </span>
          ))}
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Loading...</div>
        ) : sorted.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-muted-foreground text-sm">No invoices found</p>
            <Link href="/invoices/new">
              <span className="inline-flex items-center gap-1 text-violet-400 text-sm mt-2 cursor-pointer hover:text-violet-300">
                <Plus size={13} /> Create your first invoice
              </span>
            </Link>
          </div>
        ) : (
          <div>
            {sorted.map((inv, idx) => (
              <div
                key={inv.id}
                className="animate-fade-slide-in"
                style={{ animationDelay: `${Math.min(idx * 35, 400)}ms` }}
              >
                <Link href={`/invoices/${inv.id}`}>
                  <div className="grid grid-cols-[1fr_2fr_1fr_1fr_1fr_auto] gap-0 items-center px-4 py-3.5 border-b border-border/50 hover:bg-muted/50 transition-colors cursor-pointer group">
                    <span className="text-foreground text-sm font-mono font-medium">{inv.number}</span>
                    <div className="min-w-0 pr-4">
                      <p className="text-foreground text-sm truncate">{inv.clientName ?? "-"}</p>
                      {inv.clientCompany && (
                        <p className="text-muted-foreground text-xs truncate">{inv.clientCompany}</p>
                      )}
                    </div>
                    <span>
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${invoiceStatusBadge(inv.status)}`}>
                        {INVOICE_STATUS_LABELS[inv.status] ?? inv.status}
                      </span>
                    </span>
                    <div>
                      <p className="text-foreground text-sm font-semibold">
                        {formatCurrency(inv.total, inv.currency)}
                      </p>
                    </div>
                    <span className="text-muted-foreground text-sm">{formatDate(inv.dueDate)}</span>
                    <span className="text-violet-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
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
