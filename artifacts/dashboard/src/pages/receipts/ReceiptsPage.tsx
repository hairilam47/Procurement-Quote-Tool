import { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Download, FileCheck, ExternalLink } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";

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

const METHOD_LABELS: Record<string, string> = {
  stripe: "Stripe",
  manual: "Manual",
};

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

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Receipts</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Auto-generated when an invoice is marked as paid
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {receipts.length === 0 && !error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
            <FileCheck size={24} className="text-muted-foreground" />
          </div>
          <h2 className="text-base font-semibold text-foreground mb-1">No receipts yet</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            Receipts are generated automatically once an invoice is paid. Mark an invoice as paid to
            see a receipt here.
          </p>
          <Link href="/invoices">
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors cursor-pointer">
              View Invoices <ExternalLink size={13} />
            </span>
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Receipt #</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Invoice</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Client</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Paid Date</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Method</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Amount</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground sr-only">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {receipts.map((receipt) => {
                  const clientName = receipt.clientSnapshot?.name ?? "—";
                  const clientCompany = receipt.clientSnapshot?.company;
                  return (
                    <tr key={receipt.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-4 py-3">
                        <Link href={`/receipts/${receipt.id}`}>
                          <span className="font-mono text-foreground hover:text-blue-400 transition-colors cursor-pointer">
                            {receipt.number}
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/invoices/${receipt.invoiceId}`}>
                          <span className="font-mono text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                            {receipt.invoiceNumber}
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-foreground">{clientName}</span>
                        {clientCompany && (
                          <span className="text-muted-foreground text-xs block">{clientCompany}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(receipt.paidAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 font-medium">
                          {METHOD_LABELS[receipt.paymentMethod] ?? receipt.paymentMethod}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-foreground">
                        {formatCurrency(parseFloat(receipt.amountPaid), receipt.currency)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDownload(receipt)}
                          disabled={downloading === receipt.id}
                          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                          title="Download receipt PDF"
                        >
                          <Download size={13} />
                          {downloading === receipt.id ? "…" : "PDF"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
}
