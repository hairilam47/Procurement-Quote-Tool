import {
  useGetQuotation,
  useDeleteQuotation,
  useChangeQuotationStatus,
  useDuplicateQuotation,
  getGetQuotationQueryKey,
} from "@workspace/api-client-react";
import { BeamCard } from "@/components/ui/beam-card";
import type { ChangeQuotationStatusBodyStatus } from "@workspace/api-client-react";
import { useParams, useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { formatDate, formatCurrency, statusBadge, STATUS_LABELS } from "@/lib/format";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Download,
  Copy,
  ChevronDown,
  FileText,
  Receipt,
  Link2,
  ClipboardCheck,
  Loader2,
  Mail,
  AlertCircle,
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
  connected: boolean;
  accountId: string | null;
  displayName: string | null;
}

async function fetchStripeConnectStatus(): Promise<StripeConnectStatus> {
  const res = await fetch("/api/stripe/connect/status", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch connect status");
  return res.json();
}

const STATUS_TRANSITIONS: Record<string, ChangeQuotationStatusBodyStatus[]> = {
  DRAFT: ["SENT"],
  SENT: ["ACCEPTED", "REJECTED", "EXPIRED"],
  ACCEPTED: ["PAID"],
  REJECTED: [],
  PAID: [],
  EXPIRED: [],
};

export default function QuotationDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: quotation, isLoading, refetch } = useGetQuotation(id, {
    query: { queryKey: getGetQuotationQueryKey(id) },
  });
  const deleteQuotation = useDeleteQuotation();
  const changeStatus = useChangeQuotationStatus();
  const duplicate = useDuplicateQuotation();
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [isResendingEmail, setIsResendingEmail] = useState(false);

  const { data: connectStatus } = useQuery({
    queryKey: ["stripe-connect-status"],
    queryFn: fetchStripeConnectStatus,
    retry: false,
    staleTime: 60_000,
  });

  async function handleDelete() {
    if (!confirm("Delete this quotation? This cannot be undone.")) return;
    try {
      await deleteQuotation.mutateAsync({ id });
      toast({ title: "Quotation deleted" });
      navigate("/quotations");
    } catch {
      toast({ title: "Failed to delete quotation", variant: "destructive" });
    }
  }

  async function handleStatusChange(status: ChangeQuotationStatusBodyStatus) {
    try {
      await changeStatus.mutateAsync({ id, data: { status } });
      toast({ title: `Status changed to ${STATUS_LABELS[status]}` });
      refetch();
    } catch {
      toast({ title: "Failed to change status", variant: "destructive" });
    }
  }

  async function handleDuplicate() {
    try {
      const newQ = await duplicate.mutateAsync({ id });
      toast({ title: "Quotation duplicated" });
      navigate(`/quotations/${newQ.id}`);
    } catch {
      toast({ title: "Failed to duplicate", variant: "destructive" });
    }
  }

  async function handleGeneratePaymentLink() {
    setIsGeneratingLink(true);
    try {
      const res = await fetch(`/api/quotations/${id}/payment-link`, {
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
    if (!quotation?.paymentUrl) return;
    try {
      await navigator.clipboard.writeText(quotation.paymentUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast({ title: "Could not copy to clipboard", variant: "destructive" });
    }
  }

  async function openPdfBlob(url: string, filename: string) {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function handleDownloadPdf() {
    try {
      const res = await fetch(`/api/quotations/${id}/pdf`, { credentials: "include" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Failed to generate PDF");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      await openPdfBlob(url, `${quotation?.number ?? id}.pdf`);
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "Failed to generate PDF", variant: "destructive" });
    }
  }

  async function handleDownloadReceipt() {
    try {
      const res = await fetch(`/api/quotations/${id}/receipt-pdf`, { credentials: "include" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Failed to generate receipt");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      await openPdfBlob(url, `REC-${quotation?.number ?? id}.pdf`);
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "Failed to generate receipt", variant: "destructive" });
    }
  }

  async function handleResendEmail() {
    setIsResendingEmail(true);
    try {
      const res = await fetch(`/api/quotations/${id}/resend-receipt`, {
        method: "POST",
        credentials: "include",
      });
      const body = await res.json().catch(() => ({})) as { sent?: boolean; reason?: string; error?: string };
      if (!res.ok) {
        throw new Error(body.error ?? "Failed to send email");
      }
      if (body.sent) {
        toast({ title: "Receipt email sent to client" });
      } else {
        toast({ title: `Email not sent: ${body.reason ?? "unknown reason"}`, variant: "destructive" });
      }
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "Failed to send email", variant: "destructive" });
    } finally {
      setIsResendingEmail(false);
    }
  }

  async function handleFollowUpInvoice() {
    try {
      const res = await fetch(`/api/quotations/${id}/followup-invoice-pdf`, { credentials: "include" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Failed to generate follow-up invoice");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      await openPdfBlob(url, `${quotation?.number ?? id}-FI.pdf`);
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "Failed to generate follow-up invoice", variant: "destructive" });
    }
  }

  const needsPaymentLink =
    (quotation?.status === "SENT" || quotation?.status === "ACCEPTED") &&
    !quotation?.paymentUrl;

  const showStripeConnectPrompt = needsPaymentLink && connectStatus?.connected === false;

  const showGenerateLink = needsPaymentLink && connectStatus?.connected === true;
  const showCopyLink =
    (quotation?.status === "SENT" || quotation?.status === "ACCEPTED") &&
    !!quotation?.paymentUrl;

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-3xl">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!quotation) {
    return <div className="text-muted-foreground text-sm">Quotation not found.</div>;
  }

  const transitions = STATUS_TRANSITIONS[quotation.status] ?? [];
  const lineItems = quotation.lineItems ?? [];
  const client = quotation.client;
  const hasDeferredItems = lineItems.some((li) => li.paymentRequired === false);
  const showFollowUpInvoice =
    (quotation.status === "ACCEPTED" || quotation.status === "PAID") &&
    hasDeferredItems;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl space-y-5"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/quotations">
          <span className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors mt-1">
            <ArrowLeft size={18} />
          </span>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground font-mono">{quotation.number}</h1>
            <span className={`text-sm px-2.5 py-1 rounded-full font-medium ${statusBadge(quotation.status)}`}>
              {STATUS_LABELS[quotation.status] ?? quotation.status}
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">
            {client?.name ?? "Unknown client"}
            {client?.company ? ` · ${client.company}` : ""}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-shrink-0 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPdf}
            className="border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            data-testid="view-pdf-btn"
          >
            <Download size={13} className="mr-1.5" /> PDF
          </Button>
          {showStripeConnectPrompt && (
            <a href="/settings">
              <Button
                variant="outline"
                size="sm"
                className="border-amber-700 text-amber-400 hover:text-amber-200 hover:bg-amber-900/30"
                data-testid="stripe-connect-prompt-btn"
              >
                <Link2 size={13} className="mr-1.5" />
                Connect Stripe to Add Payment Link
              </Button>
            </a>
          )}
          {showGenerateLink && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleGeneratePaymentLink}
              disabled={isGeneratingLink}
              className="border-violet-700 text-violet-400 hover:text-violet-200 hover:bg-violet-900/30"
              data-testid="generate-payment-link-btn"
            >
              {isGeneratingLink
                ? <Loader2 size={13} className="mr-1.5 animate-spin" />
                : <Link2 size={13} className="mr-1.5" />}
              Generate Payment Link
            </Button>
          )}
          {showCopyLink && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-violet-400 font-medium px-2 py-1 rounded-full bg-violet-900/30 border border-violet-700/50">
                Payment link active
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="border-violet-700 text-violet-400 hover:text-violet-200 hover:bg-violet-900/30"
                data-testid="copy-payment-link-btn"
              >
                {linkCopied
                  ? <><ClipboardCheck size={13} className="mr-1.5" /> Copied!</>
                  : <><Copy size={13} className="mr-1.5" /> Copy Link</>}
              </Button>
              <a
                href={quotation.paymentUrl ?? ""}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="view-payment-link-btn"
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="border-violet-700 text-violet-400 hover:text-violet-200 hover:bg-violet-900/30"
                >
                  <Link2 size={13} className="mr-1.5" /> View Link
                </Button>
              </a>
            </div>
          )}
          {quotation.status === "PAID" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadReceipt}
              className="border-emerald-700 text-emerald-400 hover:text-emerald-200 hover:bg-emerald-900/30"
              data-testid="download-receipt-btn"
            >
              <Receipt size={13} className="mr-1.5" /> Download Receipt
            </Button>
          )}
          {quotation.status === "PAID" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResendEmail}
              disabled={isResendingEmail}
              className="border-emerald-700 text-emerald-400 hover:text-emerald-200 hover:bg-emerald-900/30"
              data-testid="resend-email-btn"
            >
              {isResendingEmail
                ? <Loader2 size={13} className="mr-1.5 animate-spin" />
                : <Mail size={13} className="mr-1.5" />}
              Resend Email
            </Button>
          )}
          {showFollowUpInvoice && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleFollowUpInvoice}
              className="border-amber-700 text-amber-400 hover:text-amber-200 hover:bg-amber-900/30"
              data-testid="followup-invoice-btn"
            >
              <FileText size={13} className="mr-1.5" /> Follow-up Invoice
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDuplicate}
            disabled={duplicate.isPending}
            className="border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            data-testid="duplicate-btn"
          >
            <Copy size={13} className="mr-1.5" /> Duplicate
          </Button>
          {quotation.status === "DRAFT" && (
            <Link href={`/quotations/${id}/edit`}>
              <Button variant="outline" size="sm" className="border-border text-muted-foreground hover:text-foreground hover:bg-muted">
                <Edit size={13} className="mr-1.5" /> Edit
              </Button>
            </Link>
          )}
          {transitions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white">
                  Change Status <ChevronDown size={13} className="ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-popover border-border" align="end">
                {transitions.map((s) => (
                  <DropdownMenuItem
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    className="text-foreground hover:bg-muted cursor-pointer"
                  >
                    Mark as {STATUS_LABELS[s]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="border-border text-muted-foreground hover:text-foreground hover:bg-muted px-2">
                <ChevronDown size={13} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-popover border-border" align="end">
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-red-400 hover:bg-red-900/20 cursor-pointer"
              >
                <Trash2 size={13} className="mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Meta row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetaCard label="Issue Date" value={formatDate(quotation.issueDate)} />
        <MetaCard label="Valid Until" value={formatDate(quotation.validUntil)} />
        <MetaCard
          label="Currency"
          value={
            quotation.secondaryCurrency
              ? `${quotation.currency} / ${quotation.secondaryCurrency}`
              : quotation.currency
          }
        />
        <MetaCard label="Template" value={quotation.template ?? "MODERN"} />
      </div>

      {/* Client */}
      {client && (
        <BeamCard className="p-5">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 border-b border-border pb-3">
            Client
          </h2>
          <Link href={`/clients/${client.id}`}>
            <div className="cursor-pointer hover:text-blue-400 transition-colors">
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

      {/* Line items */}
      <BeamCard>
        <div className="px-5 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-muted-foreground">Line Items</h2>
        </div>
        <div className="grid grid-cols-[3fr_1fr_1fr_1fr_1fr] border-b border-border/60 px-5 py-2">
          {["Description", "Qty", "Unit", "Unit Price", "Total"].map((h) => (
            <span key={h} className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              {h}
            </span>
          ))}
        </div>
        {lineItems.map((item) => {
          const isDeferred = item.paymentRequired === false;
          return (
            <div
              key={item.id}
              className={`grid grid-cols-[3fr_1fr_1fr_1fr_1fr] px-5 py-3 border-b border-border/30 last:border-0 ${isDeferred ? "opacity-60 bg-muted/20" : ""}`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-foreground text-sm">{item.description}</span>
                  {isDeferred && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                      Deferred
                    </span>
                  )}
                </div>
                {item.sku && (
                  <p className="text-muted-foreground text-xs mt-0.5">SKU: {item.sku}</p>
                )}
              </div>
              <span className="text-foreground/80 text-sm">{item.quantity}</span>
              <span className="text-muted-foreground text-sm">{item.unit}</span>
              <div>
                <span className="text-foreground/80 text-sm">
                  {formatCurrency(item.unitPrice, quotation.currency)}
                </span>
                {item.rateFormula && (
                  <p className="text-muted-foreground/60 text-xs mt-0.5 font-mono">({item.rateFormula})</p>
                )}
              </div>
              <span className="text-foreground text-sm font-medium">
                {formatCurrency(item.lineTotal, quotation.currency)}
              </span>
            </div>
          );
        })}
      </BeamCard>

      {/* Totals */}
      <BeamCard className="p-5">
        {(() => {
          const sec = quotation.secondaryCurrency;
          const rate = quotation.secondaryExchangeRate
            ? parseFloat(quotation.secondaryExchangeRate)
            : null;
          const hasSec = !!(sec && rate);
          const conv = (amount: string | number) => {
            if (!rate) return "";
            const n = typeof amount === "number" ? amount : parseFloat(amount ?? "0");
            return formatCurrency((n * rate).toFixed(2), sec!);
          };
          return (
            <div className={`space-y-2 ${hasSec ? "max-w-sm" : "max-w-xs"} ml-auto`}>
              {hasSec && (
                <div className="flex justify-end gap-6 pb-1 border-b border-border mb-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider w-20 text-right">
                    {quotation.currency}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider w-20 text-right">
                    {sec}
                  </span>
                </div>
              )}
              <DualTotalRow
                label="Subtotal"
                primary={formatCurrency(quotation.subtotal ?? "0", quotation.currency)}
                secondary={hasSec ? conv(quotation.subtotal ?? "0") : undefined}
              />
              {quotation.discountType && (
                <DualTotalRow
                  label={`Discount (${quotation.discountType === "PERCENTAGE" ? `${quotation.discountValue}%` : "fixed"})`}
                  primary={`- ${formatCurrency(quotation.discountAmount ?? "0", quotation.currency)}`}
                  secondary={hasSec ? `- ${conv(quotation.discountAmount ?? "0")}` : undefined}
                  className="text-amber-400"
                />
              )}
              {quotation.taxRate && parseFloat(quotation.taxRate) > 0 ? (
                <DualTotalRow
                  label={`Tax (${quotation.taxRate}%)`}
                  primary={formatCurrency(quotation.taxAmount ?? "0", quotation.currency)}
                  secondary={hasSec ? conv(quotation.taxAmount ?? "0") : undefined}
                />
              ) : null}
              <div className="border-t border-border pt-2 mt-2">
                <DualTotalRow
                  label={lineItems.some((li) => li.paymentRequired === false) ? "Full total" : "Total"}
                  primary={formatCurrency(quotation.total, quotation.currency)}
                  secondary={hasSec ? conv(quotation.total) : undefined}
                  bold
                />
              </div>
              {lineItems.some((li) => li.paymentRequired === false) && quotation.requiredTotal && quotation.requiredTotal !== quotation.total && (
                <DualTotalRow
                  label="Due now"
                  primary={formatCurrency(quotation.requiredTotal, quotation.currency)}
                  secondary={hasSec ? conv(quotation.requiredTotal) : undefined}
                  bold
                  className="text-amber-400"
                />
              )}
              {hasSec && (
                <p className="text-muted-foreground/60 text-xs text-right pt-1">
                  1 {quotation.currency} = {rate.toFixed(6)} {sec} (rate at creation)
                </p>
              )}
            </div>
          );
        })()}
      </BeamCard>

      {/* Notes & Terms */}
      {(quotation.notes || quotation.terms) && (
        <BeamCard className="p-5 space-y-4">
          {quotation.notes && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Notes</h3>
              <p className="text-foreground/80 text-sm whitespace-pre-line">{quotation.notes}</p>
            </div>
          )}
          {quotation.terms && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Terms & Conditions</h3>
              <p className="text-muted-foreground text-sm whitespace-pre-line">{quotation.terms}</p>
            </div>
          )}
        </BeamCard>
      )}

      <p className="text-muted-foreground/60 text-xs">
        Created {formatDate(quotation.createdAt ?? "")}
      </p>
    </motion.div>
  );
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <BeamCard className="p-3.5">
      <p className="text-muted-foreground text-xs mb-0.5">{label}</p>
      <p className="text-foreground text-sm font-medium">{value}</p>
    </BeamCard>
  );
}

function DualTotalRow({
  label,
  primary,
  secondary,
  bold,
  className,
}: {
  label: string;
  primary: string;
  secondary?: string;
  bold?: boolean;
  className?: string;
}) {
  return (
    <div className="flex justify-between items-center gap-2">
      <span className={`text-sm flex-1 ${bold ? "text-foreground font-bold" : "text-muted-foreground"}`}>{label}</span>
      <span className={`text-sm w-24 text-right ${bold ? "text-foreground font-bold text-base" : "text-foreground/80"} ${className ?? ""}`}>
        {primary}
      </span>
      {secondary !== undefined && (
        <span className={`text-sm w-24 text-right ${bold ? "text-foreground/90 font-bold" : "text-muted-foreground"} ${className ?? ""}`}>
          {secondary}
        </span>
      )}
    </div>
  );
}
