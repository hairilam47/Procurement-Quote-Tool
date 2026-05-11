import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Download, Loader2, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

type PublicSummary = {
  number: string;
  status: string;
  clientName: string | null;
  clientCompany: string | null;
  total: string;
  requiredTotal: string;
  currency: string;
  paidAt: string | null;
  companyName: string | null;
  companyEmail: string | null;
  companyPhone: string | null;
};

function formatCurrency(amount: string | number, currency = "USD"): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

type PageState = "loading" | "paid" | "processing" | "not-found" | "error";

const MAX_POLLS = 10;
const POLL_INTERVAL_MS = 3000;

function ContactBlock({ email, phone }: { email: string | null; phone: string | null }) {
  if (!email && !phone) return null;
  return (
    <div className="text-sm text-muted-foreground space-y-1">
      {email && (
        <p>
          Email:{" "}
          <a href={`mailto:${email}`} className="text-blue-400 hover:underline">
            {email}
          </a>
        </p>
      )}
      {phone && <p>Phone: {phone}</p>}
    </div>
  );
}

export default function PaymentSuccessPage() {
  const [state, setState] = useState<PageState>("loading");
  const [summary, setSummary] = useState<PublicSummary | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const pollCountRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const params = new URLSearchParams(window.location.search);
  const quotationId = params.get("quotationId");
  const invoiceId = params.get("invoiceId");

  const docId = quotationId ?? invoiceId;
  const isInvoice = !quotationId && !!invoiceId;

  const summaryUrl = isInvoice
    ? `/api/invoices/${invoiceId}/public-summary`
    : `/api/quotations/${quotationId}/public-summary`;

  useEffect(() => {
    if (!docId) {
      setState("not-found");
      return;
    }

    let cancelled = false;

    async function fetchSummary() {
      try {
        const res = await fetch(summaryUrl);
        if (cancelled) return;

        if (res.status === 404) {
          setState("not-found");
          return;
        }
        if (!res.ok) {
          setState("error");
          return;
        }

        const data = await res.json() as PublicSummary;
        setSummary(data);

        if (data.status === "PAID") {
          setState("paid");
          return;
        }

        pollCountRef.current += 1;
        if (pollCountRef.current >= MAX_POLLS) {
          setState("processing");
        } else {
          timerRef.current = setTimeout(fetchSummary, POLL_INTERVAL_MS);
        }
      } catch {
        if (!cancelled) setState("error");
      }
    }

    fetchSummary();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [docId, summaryUrl]);

  async function handleDownloadReceipt() {
    if (!docId) return;
    setIsDownloading(true);
    setDownloadError(null);
    try {
      const url = isInvoice
        ? `/api/invoices/${invoiceId}/pdf/public`
        : `/api/quotations/${quotationId}/receipt-pdf/public`;

      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Download failed");
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = isInvoice
        ? `${summary?.number ?? invoiceId}.pdf`
        : `REC-${summary?.number ?? quotationId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Failed to download");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        {state === "loading" && (
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            <Loader2 size={40} className="animate-spin" />
            <p className="text-sm">Confirming your payment…</p>
          </div>
        )}

        {state === "paid" && summary && (
          <div className="rounded-2xl border border-border bg-card shadow-lg overflow-hidden">
            <div className="bg-emerald-900/30 border-b border-emerald-700/40 px-8 py-8 flex flex-col items-center gap-3">
              <CheckCircle2 size={48} className="text-emerald-400" />
              <h1 className="text-2xl font-bold text-foreground text-center">
                Payment Received
              </h1>
              <p className="text-muted-foreground text-sm text-center">
                Thank you — your payment has been confirmed.
              </p>
            </div>

            <div className="px-8 py-6 space-y-4">
              {summary.companyName && (
                <p className="text-center text-muted-foreground text-xs uppercase tracking-wider font-semibold">
                  {summary.companyName}
                </p>
              )}

              <div className="space-y-3">
                <SummaryRow label={isInvoice ? "Invoice" : "Quotation"} value={summary.number} mono />
                {summary.clientName && (
                  <SummaryRow
                    label="Client"
                    value={
                      summary.clientCompany
                        ? `${summary.clientName} · ${summary.clientCompany}`
                        : summary.clientName
                    }
                  />
                )}
                <SummaryRow
                  label="Amount Paid"
                  value={formatCurrency(summary.requiredTotal ?? summary.total, summary.currency)}
                  highlight
                />
                <SummaryRow label="Payment Date" value={formatDate(summary.paidAt)} />
              </div>

              <div className="pt-4 border-t border-border space-y-2">
                <Button
                  onClick={handleDownloadReceipt}
                  disabled={isDownloading}
                  className="w-full bg-emerald-700 hover:bg-emerald-600 text-white"
                >
                  {isDownloading
                    ? <><Loader2 size={15} className="mr-2 animate-spin" /> Downloading…</>
                    : <><Download size={15} className="mr-2" /> Download {isInvoice ? "Invoice" : "Receipt"} PDF</>}
                </Button>
                {downloadError && (
                  <p className="text-red-400 text-xs text-center">{downloadError}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {state === "processing" && (
          <div className="rounded-2xl border border-amber-700/40 bg-card shadow-lg px-8 py-8 flex flex-col items-center gap-4 text-center">
            <Clock size={40} className="text-amber-400" />
            <h1 className="text-xl font-bold text-foreground">Still Processing</h1>
            <p className="text-muted-foreground text-sm">
              Your payment was received but confirmation is taking a little longer than expected.
              Please contact us with your reference and we'll confirm it manually.
            </p>
            {summary && (
              <p className="text-xs font-mono text-muted-foreground/70 bg-muted px-3 py-1.5 rounded">
                Ref: {summary.number}
              </p>
            )}
            <ContactBlock email={summary?.companyEmail ?? null} phone={summary?.companyPhone ?? null} />
          </div>
        )}

        {state === "not-found" && (
          <div className="rounded-2xl border border-border bg-card shadow-lg px-8 py-8 flex flex-col items-center gap-4 text-center">
            <AlertTriangle size={40} className="text-amber-400" />
            <h1 className="text-xl font-bold text-foreground">Payment Not Found</h1>
            <p className="text-muted-foreground text-sm">
              We couldn't find your payment record — please contact us and we'll look into it.
            </p>
            <ContactBlock email={summary?.companyEmail ?? null} phone={summary?.companyPhone ?? null} />
          </div>
        )}

        {state === "error" && (
          <div className="rounded-2xl border border-border bg-card shadow-lg px-8 py-8 flex flex-col items-center gap-4 text-center">
            <AlertTriangle size={40} className="text-red-400" />
            <h1 className="text-xl font-bold text-foreground">Something went wrong</h1>
            <p className="text-muted-foreground text-sm">
              We couldn't load your payment details. Please try refreshing, or contact us for help.
            </p>
            <ContactBlock email={summary?.companyEmail ?? null} phone={summary?.companyPhone ?? null} />
            <Button variant="outline" onClick={() => window.location.reload()}>
              Try again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground text-sm flex-shrink-0">{label}</span>
      <span
        className={[
          "text-sm text-right",
          mono ? "font-mono" : "",
          highlight ? "text-emerald-400 font-bold text-base" : "text-foreground font-medium",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}
