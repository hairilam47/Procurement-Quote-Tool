import { useEffect, useState } from "react";
import {
  useCreateQuotation,
  useUpdateQuotation,
  useGetQuotation,
  useListClients,
  useGetSettings,
  getGetQuotationQueryKey,
} from "@workspace/api-client-react";
import type { QuotationInput, LineItemInput, QuotationInputDiscountType } from "@workspace/api-client-react";
import { useLocation, useParams, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Trash2, Loader2, GripVertical } from "lucide-react";
import { formatCurrency } from "@/lib/format";

const inputCls =
  "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500";

function Field({
  label,
  children,
  required,
  className,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label className="text-slate-400 text-xs">
        {label}
        {required && <span className="text-blue-400 ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
      <h2 className="text-sm font-semibold text-slate-300 border-b border-slate-800 pb-3">{title}</h2>
      {children}
    </div>
  );
}

const today = () => new Date().toISOString().split("T")[0];
const thirtyDays = () => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0];
};

const emptyLineItem = (): LineItemInput => ({
  description: "",
  quantity: 1,
  unit: "hours",
  unitPrice: 0,
  position: 0,
});

export default function QuotationFormPage() {
  const params = useParams<{ id?: string }>();
  const id = params.id;
  const isEdit = Boolean(id);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: settings } = useGetSettings();
  const { data: clients = [] } = useListClients();
  const { data: existing } = useGetQuotation(id ?? "", {
    query: { enabled: isEdit && !!id, queryKey: getGetQuotationQueryKey(id ?? "") },
  });

  const createQuotation = useCreateQuotation();
  const updateQuotation = useUpdateQuotation();

  const [clientId, setClientId] = useState("");
  const [issueDate, setIssueDate] = useState(today());
  const [validUntil, setValidUntil] = useState(thirtyDays());
  const [currency, setCurrency] = useState("USD");
  const [discountType, setDiscountType] = useState<QuotationInputDiscountType>(null);
  const [discountValue, setDiscountValue] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [paymentUrl, setPaymentUrl] = useState("");
  const [showQrCode, setShowQrCode] = useState(false);
  const [template, setTemplate] = useState<"MODERN" | "CLASSIC">("MODERN");
  const [lineItems, setLineItems] = useState<LineItemInput[]>([emptyLineItem()]);

  // Populate defaults from settings
  useEffect(() => {
    if (!settings || isEdit) return;
    setCurrency(settings.currency);
    setTaxRate(parseFloat(settings.defaultTaxRate));
    setTemplate(settings.defaultTemplate as "MODERN" | "CLASSIC");
    setTerms(settings.defaultTerms ?? "");
    setNotes(settings.defaultNotes ?? "");
    setPaymentUrl(settings.defaultPaymentUrl ?? "");
  }, [settings, isEdit]);

  // Populate from existing quotation for edit
  useEffect(() => {
    if (!existing) return;
    setClientId(existing.clientId);
    setIssueDate(existing.issueDate.split("T")[0]);
    setValidUntil(existing.validUntil.split("T")[0]);
    setCurrency(existing.currency);
    setDiscountType((existing.discountType as QuotationInputDiscountType) ?? null);
    setDiscountValue(parseFloat(existing.discountValue ?? "0"));
    setTaxRate(parseFloat(existing.taxRate ?? "0"));
    setNotes(existing.notes ?? "");
    setTerms(existing.terms ?? "");
    setPaymentUrl(existing.paymentUrl ?? "");
    setShowQrCode(existing.showQrCode ?? false);
    setTemplate((existing.template as "MODERN" | "CLASSIC") ?? "MODERN");
    if (existing.lineItems && existing.lineItems.length > 0) {
      setLineItems(
        existing.lineItems.map((li, idx) => ({
          description: li.description,
          quantity: parseFloat(li.quantity),
          unit: li.unit as LineItemInput["unit"],
          unitPrice: parseFloat(li.unitPrice),
          position: idx,
        }))
      );
    }
  }, [existing]);

  function updateLineItem(index: number, key: keyof LineItemInput, value: unknown) {
    setLineItems((prev) =>
      prev.map((li, i) => (i === index ? { ...li, [key]: value } : li))
    );
  }

  function addLineItem() {
    setLineItems((prev) => [...prev, { ...emptyLineItem(), position: prev.length }]);
  }

  function removeLineItem(index: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== index).map((li, i) => ({ ...li, position: i })));
  }

  // Computed totals
  const subtotal = lineItems.reduce(
    (sum, li) => sum + (Number(li.quantity) || 0) * (Number(li.unitPrice) || 0),
    0
  );
  const discountAmount =
    discountType === "PERCENTAGE"
      ? subtotal * (discountValue / 100)
      : discountType === "FIXED"
      ? discountValue
      : 0;
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = taxableAmount * (taxRate / 100);
  const total = taxableAmount + taxAmount;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) {
      toast({ title: "Please select a client", variant: "destructive" });
      return;
    }
    if (lineItems.length === 0) {
      toast({ title: "Add at least one line item", variant: "destructive" });
      return;
    }

    const payload: QuotationInput = {
      clientId,
      issueDate,
      validUntil,
      currency,
      discountType: discountType ?? null,
      discountValue: discountValue || 0,
      taxRate: taxRate || 0,
      notes: notes || null,
      terms: terms || null,
      paymentUrl: paymentUrl || null,
      showQrCode,
      template,
      lineItems: lineItems.map((li, i) => ({ ...li, position: i })),
    };

    try {
      if (isEdit && id) {
        await updateQuotation.mutateAsync({ id, data: payload });
        toast({ title: "Quotation updated" });
        navigate(`/quotations/${id}`);
      } else {
        const created = await createQuotation.mutateAsync({ data: payload });
        toast({ title: "Quotation created" });
        navigate(`/quotations/${created.id}`);
      }
    } catch {
      toast({ title: "Failed to save quotation", variant: "destructive" });
    }
  }

  const isPending = createQuotation.isPending || updateQuotation.isPending;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl space-y-5"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={isEdit && id ? `/quotations/${id}` : "/quotations"}>
          <span className="text-slate-400 hover:text-white cursor-pointer transition-colors">
            <ArrowLeft size={18} />
          </span>
        </Link>
        <h1 className="text-2xl font-bold text-white">
          {isEdit ? "Edit Quotation" : "New Quotation"}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Client & Dates */}
        <Section title="Quotation Details">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Client" required className="col-span-2">
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className={inputCls}>
                  <SelectValue placeholder="Select a client..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-white">
                      {c.name}
                      {c.company ? ` — ${c.company}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Issue Date" required>
              <Input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className={inputCls}
                required
              />
            </Field>
            <Field label="Valid Until" required>
              <Input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className={inputCls}
                required
              />
            </Field>
            <Field label="Currency">
              <Input
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                className={inputCls}
                maxLength={3}
                placeholder="USD"
              />
            </Field>
            <Field label="Template">
              <Select value={template} onValueChange={(v) => setTemplate(v as "MODERN" | "CLASSIC")}>
                <SelectTrigger className={inputCls}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  <SelectItem value="MODERN" className="text-white">Modern</SelectItem>
                  <SelectItem value="CLASSIC" className="text-white">Classic</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        </Section>

        {/* Line Items */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-300">Line Items</h2>
            <button
              type="button"
              onClick={addLineItem}
              className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              <Plus size={12} /> Add Item
            </button>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-[2.5fr_0.7fr_0.7fr_1fr_auto] gap-2 px-5 py-2 border-b border-slate-800/60">
            {["Description", "Qty", "Unit", "Unit Price", ""].map((h) => (
              <span key={h} className="text-xs text-slate-500 uppercase tracking-wider font-medium">
                {h}
              </span>
            ))}
          </div>

          {lineItems.map((li, idx) => (
            <div key={idx} className="grid grid-cols-[2.5fr_0.7fr_0.7fr_1fr_auto] gap-2 px-5 py-2.5 border-b border-slate-800/30 last:border-0 items-center">
              <Input
                value={li.description}
                onChange={(e) => updateLineItem(idx, "description", e.target.value)}
                placeholder="Description..."
                className={`${inputCls} h-8 text-sm`}
              />
              <Input
                type="number"
                min={0}
                step={0.01}
                value={li.quantity}
                onChange={(e) => updateLineItem(idx, "quantity", parseFloat(e.target.value) || 0)}
                className={`${inputCls} h-8 text-sm`}
              />
              <Select
                value={li.unit ?? "hours"}
                onValueChange={(v) => updateLineItem(idx, "unit", v)}
              >
                <SelectTrigger className={`${inputCls} h-8 text-sm`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  <SelectItem value="hours" className="text-white text-sm">hrs</SelectItem>
                  <SelectItem value="days" className="text-white text-sm">days</SelectItem>
                  <SelectItem value="fixed" className="text-white text-sm">fixed</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={li.unitPrice}
                  onChange={(e) => updateLineItem(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                  className={`${inputCls} h-8 text-sm pl-6`}
                />
              </div>
              <button
                type="button"
                onClick={() => removeLineItem(idx)}
                className="text-slate-600 hover:text-red-400 transition-colors p-1"
                disabled={lineItems.length === 1}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}

          {/* Totals */}
          <div className="px-5 py-4 border-t border-slate-800 bg-slate-800/30">
            <div className="max-w-xs ml-auto space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Subtotal</span>
                <span className="text-white">{formatCurrency(subtotal, currency)}</span>
              </div>
              {discountType && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Discount</span>
                  <span className="text-amber-400">- {formatCurrency(discountAmount, currency)}</span>
                </div>
              )}
              {taxRate > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Tax ({taxRate}%)</span>
                  <span className="text-slate-300">{formatCurrency(taxAmount, currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm border-t border-slate-700 pt-1.5 mt-1">
                <span className="text-white font-bold">Total</span>
                <span className="text-white font-bold text-base">{formatCurrency(total, currency)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing adjustments */}
        <Section title="Pricing Adjustments">
          <div className="grid grid-cols-3 gap-4">
            <Field label="Discount Type">
              <Select
                value={discountType ?? "none"}
                onValueChange={(v) => setDiscountType(v === "none" ? null : (v as QuotationInputDiscountType))}
              >
                <SelectTrigger className={inputCls}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  <SelectItem value="none" className="text-white">No discount</SelectItem>
                  <SelectItem value="PERCENTAGE" className="text-white">Percentage (%)</SelectItem>
                  <SelectItem value="FIXED" className="text-white">Fixed amount</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {discountType && (
              <Field label={`Discount ${discountType === "PERCENTAGE" ? "(%)" : `(${currency})`}`}>
                <Input
                  type="number"
                  min={0}
                  max={discountType === "PERCENTAGE" ? 100 : undefined}
                  step={0.01}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                  className={inputCls}
                />
              </Field>
            )}
            <Field label="Tax Rate (%)">
              <Input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                className={inputCls}
              />
            </Field>
          </div>
        </Section>

        {/* Notes & Terms */}
        <Section title="Notes & Terms">
          <Field label="Notes">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`${inputCls} min-h-[70px]`}
              placeholder="Additional notes for the client..."
            />
          </Field>
          <Field label="Terms & Conditions">
            <Textarea
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              className={`${inputCls} min-h-[70px]`}
              placeholder="Payment terms, conditions..."
            />
          </Field>
        </Section>

        {/* Payment */}
        <Section title="Payment">
          <Field label="Payment URL">
            <Input
              value={paymentUrl}
              onChange={(e) => setPaymentUrl(e.target.value)}
              className={inputCls}
              placeholder="https://..."
            />
          </Field>
          <div className="flex items-center gap-3">
            <Switch
              checked={showQrCode}
              onCheckedChange={setShowQrCode}
              id="qr-code"
            />
            <Label htmlFor="qr-code" className="text-slate-300 text-sm cursor-pointer">
              Show QR code on PDF
            </Label>
          </div>
        </Section>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Link href={isEdit && id ? `/quotations/${id}` : "/quotations"}>
            <Button
              type="button"
              variant="outline"
              className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
            >
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={isPending}
            className="bg-blue-600 hover:bg-blue-500 text-white"
          >
            {isPending ? (
              <><Loader2 size={14} className="animate-spin mr-1.5" />Saving...</>
            ) : isEdit ? (
              "Save Changes"
            ) : (
              "Create Quotation"
            )}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
