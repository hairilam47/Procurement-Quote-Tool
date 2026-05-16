import { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Download, FileCheck, ExternalLink } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { BeamCard } from "@/components/ui/beam-card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";

interface Receipt {
  id: string;
  number: string;
  invoiceId: string;
  invoiceNumber: string;
  issuedAt: string;
  paidAt: string;
  paymentMethod: string;
  amountPaid: string;
  currency: string;
  clientSnapshot: { name?: string; company?: string | null } | null;
}

async function fetchReceipts(): Promise<Receipt[]> {
  const res = await fetch("/api/receipts", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch receipts");
  return res.json();
}

async function downloadReceiptPdf(id: string, number: string) {
  const res = await fetch(`/api/receipts/${id}/pdf`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to download receipt PDF");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${number}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const METHOD_BADGE_STATUS: Record<string, string> = {
  stripe: "PAID",
  manual: "ACCEPTED",
};

const METHOD_LABELS: Record<string, string> = {
  stripe: "Stripe",
  manual: "Manual",
};

function SkeletonRow() {
  return (
    <div className="grid grid-cols-[1fr_1fr_1.5fr_1fr_1fr_1fr_auto] items-center px-4 py-3.5 border-b border-border/50">
      <div className="h-3.5 bg-muted rounded animate-pulse w-24" />
      <div className="h-3.5 bg-muted rounded animate-pulse w-20" />
      <div className="h-3.5 bg-muted rounded animate-pulse w-28" />
      <div className="h-3.5 bg-muted rounded animate-pulse w-20" />
      <div className="h-5 bg-muted rounded animate-pulse w-16" />
      <div className="h-3.5 bg-muted rounded animate-pulse w-20 ml-auto" />
      <div className="w-4" />
    </div>
  );
}

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    fetchReceipts()
      .then(setReceipts)
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, []);

  async function handleDownload(receipt: Receipt) {
    setDownloading(receipt.id);
    try {
      await downloadReceiptPdf(receipt.id, receipt.number);
    } catch {
      // silent — user can retry
    } finally {
      setDownloading(null);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <PageHeader
        title="Receipts"
        subtitle="Auto-generated when an invoice is marked as paid"
      />

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <BeamCard>
        {/* Header */}
        <div className="grid grid-cols-[1fr_1fr_1.5fr_1fr_1fr_1fr_auto] items-center px-4 py-2.5 border-b border-border bg-muted/30">
          {["Receipt #", "Invoice", "Client", "Paid Date", "Method", "Amount", ""].map((h) => (
            <span
              key={h}
              className={`text-xs font-medium text-muted-foreground/80 uppercase tracking-wider ${h === "Amount" ? "text-right" : ""}`}
            >
              {h}
            </span>
          ))}
        </div>

        {isLoading ? (
          <>
            {[...Array(4)].map((_, i) => <SkeletonRow key={i} />)}
          </>
        ) : receipts.length === 0 && !error ? (
          <EmptyState
            icon={FileCheck}
            title="No receipts yet"
            description="Receipts are generated automatically once an invoice is paid. Mark an invoice as paid to see receipts here."
            action={{ label: "View Invoices", href: "/invoices", icon: ExternalLink }}
          />
        ) : (
          <div className="p-3 space-y-1.5">
            {receipts.map((receipt, idx) => {
              const clientName = receipt.clientSnapshot?.name ?? "—";
              const clientCompany = receipt.clientSnapshot?.company;
              return (
                <div
                  key={receipt.id}
                  className="animate-fade-slide-in"
                  style={{ animationDelay: `${Math.min(idx * 30, 350)}ms` }}
                >
                  <div className="grid grid-cols-[1fr_1fr_1.5fr_1fr_1fr_1fr_auto] items-center px-4 py-3 rounded-xl bg-muted/20 dark:bg-white/[0.04] hover:bg-muted/30 dark:hover:bg-white/[0.07] transition-colors group">
                    <Link href={`/receipts/${receipt.id}`}>
                      <span className="font-mono text-sm text-foreground hover:text-blue-400 transition-colors cursor-pointer">
                        {receipt.number}
                      </span>
                    </Link>
                    <Link href={`/invoices/${receipt.invoiceId}`}>
                      <span className="font-mono text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                        {receipt.invoiceNumber}
                      </span>
                    </Link>
                    <div className="min-w-0 pr-2">
                      <p className="text-foreground text-sm truncate">{clientName}</p>
                      {clientCompany && (
                        <p className="text-muted-foreground text-xs truncate">{clientCompany}</p>
                      )}
                    </div>
                    <span className="text-muted-foreground text-sm">{formatDate(receipt.paidAt)}</span>
                    <span>
                      <StatusBadge
                        status={METHOD_BADGE_STATUS[receipt.paymentMethod] ?? "PAID"}
                        label={METHOD_LABELS[receipt.paymentMethod] ?? receipt.paymentMethod}
                      />
                    </span>
                    <span className="text-right font-mono text-sm font-medium text-foreground tabular-nums">
                      {formatCurrency(parseFloat(receipt.amountPaid), receipt.currency)}
                    </span>
                    <button
                      onClick={() => handleDownload(receipt)}
                      disabled={downloading === receipt.id}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 ml-1"
                      title="Download receipt PDF"
                    >
                      <Download size={13} />
                      <span className="hidden sm:inline">{downloading === receipt.id ? "…" : "PDF"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </BeamCard>
    </motion.div>
  );
}
