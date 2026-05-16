import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Download, FileCheck } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { BeamCard } from "@/components/ui/beam-card";

interface LineItem {
  id: string;
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  lineTotal: string;
  sku?: string | null;
}

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
  clientSnapshot: {
    name?: string;
    company?: string | null;
    email?: string | null;
    phone?: string | null;
    addressLine1?: string | null;
    city?: string | null;
    postalCode?: string | null;
    country?: string | null;
  } | null;
  companySnapshot: {
    name?: string;
    email?: string | null;
    phone?: string | null;
    addressLine1?: string | null;
    city?: string | null;
    country?: string | null;
  } | null;
  lineItemsSnapshot: LineItem[] | null;
}

const METHOD_LABELS: Record<string, string> = {
  stripe: "Stripe Payment",
  manual: "Manual Payment",
};

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <BeamCard className="px-4 py-3">
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </BeamCard>
  );
}

export default function ReceiptDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    fetch(`/api/receipts/${id}`, { credentials: "include" })
      .then((r) => r.json())
      .then(setReceipt)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [id]);

  async function handleDownloadPdf() {
    if (!receipt) return;
    setIsDownloading(true);
    try {
      const res = await fetch(`/api/receipts/${id}/pdf`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to download PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${receipt.number}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      // silent
    } finally {
      setIsDownloading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!receipt) {
    return <div className="text-muted-foreground text-sm">Receipt not found.</div>;
  }

  const lineItems = receipt.lineItemsSnapshot ?? [];
  const client = receipt.clientSnapshot;
  const company = receipt.companySnapshot;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/receipts">
          <span className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors mt-1">
            <ArrowLeft size={18} />
          </span>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground font-mono">{receipt.number}</h1>
            <span className="text-sm px-2.5 py-1 rounded-full font-medium bg-green-500/10 text-green-400 border border-green-500/20">
              Paid
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">
            Receipt for{" "}
            <Link href={`/invoices/${receipt.invoiceId}`}>
              <span className="font-mono text-blue-400 hover:text-blue-300 cursor-pointer transition-colors">
                {receipt.invoiceNumber}
              </span>
            </Link>
            {client?.name ? ` · ${client.name}` : ""}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadPdf}
          disabled={isDownloading}
          className="border-border text-muted-foreground hover:text-foreground hover:bg-muted flex-shrink-0"
        >
          <Download size={13} className="mr-1.5" />
          {isDownloading ? "Downloading…" : "Download PDF"}
        </Button>
      </div>

      {/* Meta grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetaCard label="Paid Date" value={formatDate(receipt.paidAt)} />
        <MetaCard label="Issued Date" value={formatDate(receipt.issuedAt)} />
        <MetaCard label="Currency" value={receipt.currency} />
        <MetaCard label="Payment Method" value={METHOD_LABELS[receipt.paymentMethod] ?? receipt.paymentMethod} />
      </div>

      {/* Parties */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {client && (
          <BeamCard className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Bill To</p>
            <p className="text-sm font-semibold text-foreground">{client.name}</p>
            {client.company && <p className="text-sm text-muted-foreground">{client.company}</p>}
            {client.email && <p className="text-sm text-muted-foreground">{client.email}</p>}
            {client.addressLine1 && <p className="text-sm text-muted-foreground mt-1">{client.addressLine1}</p>}
            {(client.city || client.country) && (
              <p className="text-sm text-muted-foreground">
                {[client.city, client.postalCode, client.country].filter(Boolean).join(", ")}
              </p>
            )}
          </BeamCard>
        )}
        {company && (
          <BeamCard className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">From</p>
            <p className="text-sm font-semibold text-foreground">{company.name}</p>
            {company.email && <p className="text-sm text-muted-foreground">{company.email}</p>}
            {company.phone && <p className="text-sm text-muted-foreground">{company.phone}</p>}
            {company.addressLine1 && <p className="text-sm text-muted-foreground mt-1">{company.addressLine1}</p>}
            {(company.city || company.country) && (
              <p className="text-sm text-muted-foreground">
                {[company.city, company.country].filter(Boolean).join(", ")}
              </p>
            )}
          </BeamCard>
        )}
      </div>

      {/* Line items */}
      {lineItems.length > 0 && (
        <BeamCard>
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-medium text-foreground">Line Items</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Description</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Qty</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Unit Price</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lineItems.map((li, i) => (
                  <tr key={li.id ?? i}>
                    <td className="px-4 py-3">
                      <p className="text-foreground">{li.description}</p>
                      {li.sku && <p className="text-xs text-muted-foreground font-mono">SKU: {li.sku}</p>}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground font-mono">
                      {li.quantity} {li.unit}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground font-mono">
                      {formatCurrency(parseFloat(li.unitPrice), receipt.currency)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-foreground">
                      {formatCurrency(parseFloat(li.lineTotal), receipt.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Total */}
          <div className="border-t border-border px-4 py-4 flex justify-end">
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-1">Amount Paid</p>
              <p className="text-xl font-bold text-green-400 font-mono">
                {formatCurrency(parseFloat(receipt.amountPaid), receipt.currency)}
              </p>
            </div>
          </div>
        </BeamCard>
      )}

      {/* System note */}
      <div className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
        <FileCheck size={14} className="text-green-400 flex-shrink-0" />
        This receipt was automatically generated when invoice {receipt.invoiceNumber} was marked as paid.
        It cannot be edited or deleted.
      </div>
    </motion.div>
  );
}
