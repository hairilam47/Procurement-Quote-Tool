import {
  useGetQuotation,
  useDeleteQuotation,
  useChangeQuotationStatus,
  useDuplicateQuotation,
  getGetQuotationQueryKey,
} from "@workspace/api-client-react";
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

  async function handleDownloadPdf() {
    try {
      const res = await fetch(`/api/quotations/${id}/pdf`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch {
      toast({ title: "Failed to generate PDF", variant: "destructive" });
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-3xl">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-slate-800 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!quotation) {
    return <div className="text-slate-500 text-sm">Quotation not found.</div>;
  }

  const transitions = STATUS_TRANSITIONS[quotation.status] ?? [];
  const lineItems = quotation.lineItems ?? [];
  const client = quotation.client;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl space-y-5"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/quotations">
          <span className="text-slate-400 hover:text-white cursor-pointer transition-colors mt-1">
            <ArrowLeft size={18} />
          </span>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-white font-mono">{quotation.number}</h1>
            <span className={`text-sm px-2.5 py-1 rounded-full font-medium ${statusBadge(quotation.status)}`}>
              {STATUS_LABELS[quotation.status] ?? quotation.status}
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-0.5">
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
            className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
          >
            <Download size={13} className="mr-1.5" /> PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDuplicate}
            disabled={duplicate.isPending}
            className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
          >
            <Copy size={13} className="mr-1.5" /> Duplicate
          </Button>
          {quotation.status === "DRAFT" && (
            <Link href={`/quotations/${id}/edit`}>
              <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800">
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
              <DropdownMenuContent className="bg-slate-900 border-slate-700" align="end">
                {transitions.map((s) => (
                  <DropdownMenuItem
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    className="text-white hover:bg-slate-800 cursor-pointer"
                  >
                    Mark as {STATUS_LABELS[s]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 px-2">
                <ChevronDown size={13} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-slate-900 border-slate-700" align="end">
              <DropdownMenuSeparator className="bg-slate-800" />
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
        <MetaCard label="Currency" value={quotation.currency} />
        <MetaCard label="Template" value={quotation.template ?? "MODERN"} />
      </div>

      {/* Client */}
      {client && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-3 border-b border-slate-800 pb-3">
            Client
          </h2>
          <Link href={`/clients/${client.id}`}>
            <div className="cursor-pointer hover:text-blue-400 transition-colors">
              <p className="text-white font-medium">{client.name}</p>
              {client.company && <p className="text-slate-400 text-sm">{client.company}</p>}
              <p className="text-slate-500 text-sm">{client.email}</p>
              {client.addressLine1 && (
                <p className="text-slate-600 text-xs mt-1">
                  {[client.addressLine1, client.city, client.country].filter(Boolean).join(", ")}
                </p>
              )}
            </div>
          </Link>
        </div>
      )}

      {/* Line items */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-slate-300">Line Items</h2>
        </div>
        <div className="grid grid-cols-[3fr_1fr_1fr_1fr_1fr] border-b border-slate-800/60 px-5 py-2">
          {["Description", "Qty", "Unit", "Unit Price", "Total"].map((h) => (
            <span key={h} className="text-xs text-slate-500 uppercase tracking-wider font-medium">
              {h}
            </span>
          ))}
        </div>
        {lineItems.map((item) => (
          <div
            key={item.id}
            className="grid grid-cols-[3fr_1fr_1fr_1fr_1fr] px-5 py-3 border-b border-slate-800/30 last:border-0"
          >
            <span className="text-white text-sm">{item.description}</span>
            <span className="text-slate-300 text-sm">{item.quantity}</span>
            <span className="text-slate-400 text-sm">{item.unit}</span>
            <span className="text-slate-300 text-sm">
              {formatCurrency(item.unitPrice, quotation.currency)}
            </span>
            <span className="text-white text-sm font-medium">
              {formatCurrency(item.lineTotal, quotation.currency)}
            </span>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="space-y-2 max-w-xs ml-auto">
          <TotalRow
            label="Subtotal"
            value={formatCurrency(quotation.subtotal ?? "0", quotation.currency)}
          />
          {quotation.discountType && (
            <TotalRow
              label={`Discount (${quotation.discountType === "PERCENTAGE" ? `${quotation.discountValue}%` : "fixed"})`}
              value={`- ${formatCurrency(quotation.discountAmount ?? "0", quotation.currency)}`}
              className="text-amber-400"
            />
          )}
          {quotation.taxRate && parseFloat(quotation.taxRate) > 0 ? (
            <TotalRow
              label={`Tax (${quotation.taxRate}%)`}
              value={formatCurrency(quotation.taxAmount ?? "0", quotation.currency)}
            />
          ) : null}
          <div className="border-t border-slate-700 pt-2 mt-2">
            <TotalRow
              label="Total"
              value={formatCurrency(quotation.total, quotation.currency)}
              bold
            />
          </div>
        </div>
      </div>

      {/* Notes & Terms */}
      {(quotation.notes || quotation.terms) && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          {quotation.notes && (
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Notes</h3>
              <p className="text-slate-300 text-sm whitespace-pre-line">{quotation.notes}</p>
            </div>
          )}
          {quotation.terms && (
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Terms & Conditions</h3>
              <p className="text-slate-400 text-sm whitespace-pre-line">{quotation.terms}</p>
            </div>
          )}
        </div>
      )}

      <p className="text-slate-600 text-xs">
        Created {formatDate(quotation.createdAt ?? "")}
      </p>
    </motion.div>
  );
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
      <p className="text-slate-500 text-xs mb-0.5">{label}</p>
      <p className="text-white text-sm font-medium">{value}</p>
    </div>
  );
}

function TotalRow({
  label,
  value,
  bold,
  className,
}: {
  label: string;
  value: string;
  bold?: boolean;
  className?: string;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className={`text-sm ${bold ? "text-white font-bold" : "text-slate-400"}`}>{label}</span>
      <span className={`text-sm ${bold ? "text-white font-bold text-base" : "text-slate-300"} ${className ?? ""}`}>
        {value}
      </span>
    </div>
  );
}
