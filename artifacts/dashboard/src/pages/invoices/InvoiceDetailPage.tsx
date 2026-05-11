import {
  useGetInvoice,
  useDeleteInvoice,
  useChangeInvoiceStatus,
  getGetInvoiceQueryKey,
} from "@workspace/api-client-react";
import { BeamCard } from "@/components/ui/beam-card";
import type { ChangeInvoiceStatusBodyStatus } from "@workspace/api-client-react";
import { useParams, useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { formatDate, formatCurrency, invoiceStatusBadge, INVOICE_STATUS_LABELS } from "@/lib/format";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Download,
  ChevronDown,
  Link2,
  ClipboardCheck,
  Loader2,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

interface StripeConnectStatus {
  connected: boolean; accountId: string | null; displayName: string | null;
}

async function fetchStripeConnectStatus(): Promise<StripeConnectStatus> {
  const res = await fetch("/api/stripe/connect/status", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch connect status");
  return res.json();
}

const STATUS_TRANSITIONS: Record<string, ChangeInvoiceStatusBodyStatus[]> = {
  DRAFT: ["SENT"],
  SENT: ["PAID"],
  PAID: [],
};

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: invoice, isLoading, refetch } = useGetInvoice(id, {
    query: { queryKey: getGetInvoiceQueryKey(id) },
  });
  const deleteInvoice = useDeleteInvoice();
  const changeStatus = useChangeInvoiceStatus();
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const { data: connectStatus } = useQuery({
    queryKey: ["stripe-connect-status"],
    queryFn: fetchStripeConnectStatus,
    retry: false,
    staleTime: 60_000,
  });

  async function handleDelete() {
    if (!confirm("Delete this invoice? This cannot be undone.")) return;
    try {
      await deleteInvoice.mutateAsync({ id });
      toast({ title: "Invoice deleted" });
      navigate("/invoices");
    } catch {
      toast({ title: "Failed to delete invoice", variant: "destructive" });
    }
  }

  async function handleStatusChange(status: ChangeInvoiceStatusBodyStatus) {
    try {
      await changeStatus.mutateAsync({ id, data: { status } });
      toast({ title: `Status changed to ${INVOICE_STATUS_LABELS[status]}` });
      refetch();
    } catch {
      toast({ title: "Failed to change status", variant: "destructive" });
    }
  }

  async function openPdfBlob(url: string, filename: string) {
    const a = document.createElement("a");
    a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer"; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function handleDownloadPdf() {
    try {
      const res = await fetch(`/api/invoices/${id}/pdf`, { credentials: "include" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Failed to generate PDF");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      await openPdfBlob(url, `${invoice?.number ?? id}.pdf`);
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "Failed to generate PDF", variant: "destructive" });
    }
  }

  async function handleGeneratePaymentLink() {
    setIsGeneratingLink(true);
    try {
      const res = await fetch(`/api/invoices/${id}/payment-link`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string; message?: string };
        throw new Error(body.message ?? body.error ?? "Failed to generate payment link");
      }
      toast({ title: "Payment link generated" });
      refetch();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "Failed to generate payment link", variant: "destructive" });
    } finally {
      setIsGeneratingLink(false);
    }
  }

  async function handleCopyLink() {
    if (!invoice?.paymentUrl) return;
    try {
      await navigator.clipboard.writeText(invoice.paymentUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast({ title: "Could not copy to clipboard", variant: "destructive" });
    }
  }

  const needsPaymentLink = invoice?.status === "SENT" && !invoice?.paymentUrl;
  const showStripeConnectPrompt = needsPaymentLink && connectStatus?.connected === false;
  const showGenerateLink = needsPaymentLink && connectStatus?.connected === true;
  const showCopyLink = invoice?.status === "SENT" && !!invoice?.paymentUrl;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!invoice) {
    return <div className="text-muted-foreground text-sm">Invoice not found.</div>;
  }

  const transitions = STATUS_TRANSITIONS[invoice.status] ?? [];
  const lineItems = invoice.lineItems ?? [];
  const client = invoice.client;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex items-start gap-3">
        <Link href="/invoices">
          <span className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors mt-1">
            <ArrowLeft size={18} />
          </span>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground font-mono">{invoice.number}</h1>
            <span className={`text-sm px-2.5 py-1 rounded-full font-medium ${invoiceStatusBadge(invoice.status)}`}>
              {INVOICE_STATUS_LABELS[invoice.status] ?? invoice.status}
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">
            {client?.name ?? "Unknown client"}
            {client?.company ? ` · ${client.company}` : ""}
          </p>
        </div>

        <div className="flex gap-2 flex-shrink-0 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleDownloadPdf}
            className="border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            data-testid="view-invoice-pdf-btn">
            <Download size={13} className="mr-1.5" /> PDF
          </Button>
          {showStripeConnectPrompt && (
            <a href="/settings">
              <Button variant="outline" size="sm"
                className="border-amber-700 text-amber-400 hover:text-amber-200 hover:bg-amber-900/30">
                <Link2 size={13} className="mr-1.5" />
                Connect Stripe to Add Payment Link
              </Button>
            </a>
          )}
          {showGenerateLink && (
            <Button variant="outline" size="sm" onClick={handleGeneratePaymentLink} disabled={isGeneratingLink}
              className="border-violet-700 text-violet-400 hover:text-violet-200 hover:bg-violet-900/30"
              data-testid="generate-invoice-payment-link-btn">
              {isGeneratingLink ? <Loader2 size={13} className="mr-1.5 animate-spin" /> : <Link2 size={13} className="mr-1.5" />}
              Generate Payment Link
            </Button>
          )}
          {showCopyLink && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-violet-400 font-medium px-2 py-1 rounded-full bg-violet-900/30 border border-violet-700/50">
                Payment link active
              </span>
              <Button variant="outline" size="sm" onClick={handleCopyLink}
                className="border-violet-700 text-violet-400 hover:text-violet-200 hover:bg-violet-900/30">
                {linkCopied ? <><ClipboardCheck size={13} className="mr-1.5" /> Copied!</> : <><Copy size={13} className="mr-1.5" /> Copy Link</>}
              </Button>
              <a href={invoice.paymentUrl ?? ""} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm"
                  className="border-violet-700 text-violet-400 hover:text-violet-200 hover:bg-violet-900/30">
                  <Link2 size={13} className="mr-1.5" /> View Link
                </Button>
              </a>
            </div>
          )}
          {invoice.status === "DRAFT" && (
            <Link href={`/invoices/${id}/edit`}>
              <Button variant="outline" size="sm"
                className="border-border text-muted-foreground hover:text-foreground hover:bg-muted">
                <Edit size={13} className="mr-1.5" /> Edit
              </Button>
            </Link>
          )}
          {transitions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="bg-violet-600 hover:bg-violet-500 text-white">
                  Change Status <ChevronDown size={13} className="ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-popover border-border" align="end">
                {transitions.map((s) => (
                  <DropdownMenuItem key={s} onClick={() => handleStatusChange(s)}
                    className="text-foreground hover:bg-muted cursor-pointer">
                    Mark as {INVOICE_STATUS_LABELS[s]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm"
                className="border-border text-muted-foreground hover:text-foreground hover:bg-muted px-2">
                <ChevronDown size={13} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-popover border-border" align="end">
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem onClick={handleDelete}
                className="text-red-400 hover:bg-red-900/20 cursor-pointer">
                <Trash2 size={13} className="mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetaCard label="Issue Date" value={formatDate(invoice.issueDate)} />
        <MetaCard label="Due Date" value={formatDate(invoice.dueDate)} />
        <MetaCard label="Currency" value={invoice.secondaryCurrency ? `${invoice.currency} / ${invoice.secondaryCurrency}` : invoice.currency} />
        <MetaCard label="Template" value={invoice.template ?? "MODERN"} />
      </div>

      {client && (
        <BeamCard className="p-5">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 border-b border-border pb-3">Client</h2>
          <Link href={`/clients/${client.id}`}>
            <div className="cursor-pointer hover:text-violet-400 transition-colors">
              <p className="text-foreground font-medium">{client.name}</p>
              {client.company && <p className="text-muted-foreground text-sm">{client.company}</p>}
              <p className="text-muted-foreground text-sm">{client.email}</p>
              {client.addressLine1 && (
                <p className="text-muted-foreground/60 text-xs mt-1">
                  {[client.addressLine1, client.city, client.country].filter(Boolean).join(", ")}
                </p>
              )}
            </div>
          </Link>
        </BeamCard>
      )}

      <BeamCard>
        <div className="px-5 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-muted-foreground">Line Items</h2>
        </div>
        <div className="grid grid-cols-[3fr_1fr_1fr_1fr_1fr] border-b border-border/60 px-5 py-2">
          {["Description", "Qty", "Unit", "Unit Price", "Total"].map((h) => (
            <span key={h} className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{h}</span>
          ))}
        </div>
        {lineItems.map((item) => (
          <div key={item.id} className="grid grid-cols-[3fr_1fr_1fr_1fr_1fr] px-5 py-3 border-b border-border/30 last:border-0">
            <div>
              <span className="text-foreground text-sm">{item.description}</span>
              {item.sku && <p className="text-muted-foreground text-xs mt-0.5">SKU: {item.sku}</p>}
            </div>
            <span className="text-foreground/80 text-sm">{item.quantity}</span>
            <span className="text-muted-foreground text-sm">{item.unit}</span>
            <div>
              <span className="text-foreground/80 text-sm">{formatCurrency(item.unitPrice, invoice.currency)}</span>
              {item.rateFormula && (
                <p className="text-muted-foreground/60 text-xs mt-0.5 font-mono">({item.rateFormula})</p>
              )}
            </div>
            <span className="text-foreground text-sm font-medium">{formatCurrency(item.lineTotal, invoice.currency)}</span>
          </div>
        ))}
      </BeamCard>

      <BeamCard className="p-5">
        <div className="max-w-xs ml-auto space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="text-foreground">{formatCurrency(invoice.subtotal ?? "0", invoice.currency)}</span>
          </div>
          {invoice.discountType && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Discount ({invoice.discountType === "PERCENTAGE" ? `${invoice.discountValue}%` : "fixed"})
              </span>
              <span className="text-amber-400">- {formatCurrency(invoice.discountAmount ?? "0", invoice.currency)}</span>
            </div>
          )}
          {invoice.taxRate && parseFloat(invoice.taxRate) > 0 ? (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax ({invoice.taxRate}%)</span>
              <span className="text-foreground">{formatCurrency(invoice.taxAmount ?? "0", invoice.currency)}</span>
            </div>
          ) : null}
          <div className="border-t border-border pt-2 mt-2 flex justify-between text-sm font-bold">
            <span className="text-foreground">Total</span>
            <span className="text-foreground">{formatCurrency(invoice.total, invoice.currency)}</span>
          </div>
        </div>
      </BeamCard>

      {(invoice.notes || invoice.terms) && (
        <BeamCard className="p-5 space-y-4">
          {invoice.notes && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Notes</h3>
              <p className="text-foreground text-sm whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}
          {invoice.terms && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Terms</h3>
              <p className="text-foreground text-sm whitespace-pre-wrap">{invoice.terms}</p>
            </div>
          )}
        </BeamCard>
      )}
    </motion.div>
  );
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <BeamCard className="p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground mt-0.5">{value}</p>
    </BeamCard>
  );
}
