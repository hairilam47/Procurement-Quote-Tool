import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  useCreateQuotation,
  useUpdateQuotation,
  useGetQuotation,
  useListClients,
  useGetSettings,
  getGetQuotationQueryKey,
} from "@workspace/api-client-react";
import { BeamCard } from "@/components/ui/beam-card";
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
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/format";

const inputCls =
  "bg-input border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500";

function evaluateFormulaClient(formula: string): number | null {
  const trimmed = formula.trim();
  if (!trimmed) return null;
  if (!/^[\d\s.()+\-*/]+$/.test(trimmed)) return null;
  try {
    const result = new Function(`"use strict"; return (${trimmed});`)();
    if (typeof result !== "number" || !isFinite(result) || isNaN(result) || result < 0) return null;
    return result;
  } catch {
    return null;
  }
}

const ALL_CURRENCIES = [
  { code: "AED", name: "UAE Dirham" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "BRL", name: "Brazilian Real" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "CLP", name: "Chilean Peso" },
  { code: "CNY", name: "Chinese Yuan" },
  { code: "COP", name: "Colombian Peso" },
  { code: "CZK", name: "Czech Koruna" },
  { code: "DKK", name: "Danish Krone" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "HKD", name: "Hong Kong Dollar" },
  { code: "HUF", name: "Hungarian Forint" },
  { code: "IDR", name: "Indonesian Rupiah" },
  { code: "ILS", name: "Israeli Shekel" },
  { code: "INR", name: "Indian Rupee" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "KRW", name: "South Korean Won" },
  { code: "KWD", name: "Kuwaiti Dinar" },
  { code: "MXN", name: "Mexican Peso" },
  { code: "MYR", name: "Malaysian Ringgit" },
  { code: "NOK", name: "Norwegian Krone" },
  { code: "NZD", name: "New Zealand Dollar" },
  { code: "PHP", name: "Philippine Peso" },
  { code: "PLN", name: "Polish Zloty" },
  { code: "QAR", name: "Qatari Riyal" },
  { code: "RUB", name: "Russian Ruble" },
  { code: "SAR", name: "Saudi Riyal" },
  { code: "SEK", name: "Swedish Krona" },
  { code: "SGD", name: "Singapore Dollar" },
  { code: "THB", name: "Thai Baht" },
  { code: "TRY", name: "Turkish Lira" },
  { code: "TWD", name: "Taiwan Dollar" },
  { code: "USD", name: "US Dollar" },
  { code: "VND", name: "Vietnamese Dong" },
  { code: "ZAR", name: "South African Rand" },
];

const EURO_ZONE = ["AT","BE","CY","EE","FI","FR","DE","GR","IE","IT","LV","LT","LU","MT","NL","PT","SK","SI","ES"];
const REGION_CURRENCY: Record<string, string> = {
  NZ: "NZD", AU: "AUD", GB: "GBP", CA: "CAD", JP: "JPY", CN: "CNY",
  CH: "CHF", HK: "HKD", SE: "SEK", NO: "NOK", DK: "DKK", SG: "SGD",
  MX: "MXN", BR: "BRL", IN: "INR", ZA: "ZAR", KR: "KRW", MY: "MYR",
  TH: "THB", ID: "IDR", PH: "PHP", TW: "TWD", AE: "AED", SA: "SAR",
  PL: "PLN", CZ: "CZK", HU: "HUF", IL: "ILS", TR: "TRY", RU: "RUB",
  CL: "CLP", CO: "COP", QA: "QAR", KW: "KWD", VN: "VND",
};

function detectLocaleCurrency(): string {
  try {
    const locale = navigator.language || "en-US";
    const region = locale.split("-")[1]?.toUpperCase();
    if (region && EURO_ZONE.includes(region)) return "EUR";
    return (region && REGION_CURRENCY[region]) || "USD";
  } catch {
    return "USD";
  }
}

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
      <Label className="text-muted-foreground text-xs">
        {label}
        {required && <span className="text-blue-400 ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <BeamCard className="p-5 space-y-4">
      <h2 className="text-sm font-semibold text-muted-foreground border-b border-border pb-3">{title}</h2>
      {children}
    </BeamCard>
  );
}

const today = () => new Date().toISOString().split("T")[0];
const thirtyDays = () => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0];
};

const emptyLineItem = (): LineItemInput => ({
  sku: null,
  description: "",
  quantity: 1,
  unit: "hours",
  unitPrice: 0,
  rateFormula: null,
  paymentRequired: true,
  position: 0,
});

const LineItemRow = memo(function LineItemRow({
  li,
  idx,
  currency,
  isOnly,
  onUpdate,
  onFormulaChange,
  onRemove,
}: {
  li: LineItemInput;
  idx: number;
  currency: string;
  isOnly: boolean;
  onUpdate: (index: number, key: keyof LineItemInput, value: unknown) => void;
  onFormulaChange: (index: number, formula: string) => void;
  onRemove: (index: number) => void;
}) {
  const rowTotal = (Number(li.quantity) || 0) * (Number(li.unitPrice) || 0);
  const isDeferred = li.paymentRequired === false;
  return (
    <div className={`grid grid-cols-[3fr_0.9fr_1fr_1.3fr_1.1fr_auto] gap-3 px-5 py-2.5 border-b border-border/30 last:border-0 items-center transition-opacity ${isDeferred ? "opacity-60" : ""}`}>
      <div className="flex flex-col gap-1">
        <Input
          value={li.description}
          onChange={(e) => onUpdate(idx, "description", e.target.value)}
          placeholder="Description..."
          className={`${inputCls} h-8 text-sm`}
          data-testid={`line-item-description-${idx}`}
        />
        <Input
          value={li.sku ?? ""}
          onChange={(e) => onUpdate(idx, "sku", e.target.value || null)}
          placeholder="SKU (optional)"
          className={`${inputCls} h-6 text-xs`}
          data-testid={`line-item-sku-${idx}`}
        />
        <div className="flex items-center gap-1.5 mt-0.5">
          <Switch
            checked={!isDeferred}
            onCheckedChange={(v) => onUpdate(idx, "paymentRequired", v)}
            className="scale-75 origin-left"
            data-testid={`line-item-required-${idx}`}
          />
          <span className="text-xs text-muted-foreground">
            {isDeferred ? "Deferred" : "Required now"}
          </span>
        </div>
      </div>
      <Input
        type="number"
        min={0}
        step={0.01}
        value={li.quantity}
        onChange={(e) => onUpdate(idx, "quantity", parseFloat(e.target.value) || 0)}
        className={`${inputCls} h-8 text-sm`}
        data-testid={`line-item-qty-${idx}`}
      />
      <Select
        value={li.unit ?? "hours"}
        onValueChange={(v) => onUpdate(idx, "unit", v)}
      >
        <SelectTrigger className={`${inputCls} h-8 text-sm`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-popover border-border">
          <SelectItem value="hours" className="text-foreground text-sm">hrs</SelectItem>
          <SelectItem value="days" className="text-foreground text-sm">days</SelectItem>
          <SelectItem value="fixed" className="text-foreground text-sm">fixed</SelectItem>
        </SelectContent>
      </Select>
      <div className="flex flex-col gap-1">
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
          <Input
            type="number"
            min={0}
            step={0.01}
            value={li.unitPrice}
            onChange={(e) => onUpdate(idx, "unitPrice", parseFloat(e.target.value) || 0)}
            className={`${inputCls} h-8 text-sm pl-6 ${li.rateFormula ? "opacity-60" : ""}`}
            readOnly={!!li.rateFormula}
            data-testid={`line-item-price-${idx}`}
          />
        </div>
        <Input
          value={li.rateFormula ?? ""}
          onChange={(e) => onFormulaChange(idx, e.target.value)}
          placeholder="e.g. 30*0.0032"
          className={`${inputCls} h-6 text-xs font-mono`}
          data-testid={`line-item-formula-${idx}`}
        />
      </div>
      <span className="text-foreground/90 text-sm font-medium tabular-nums">
        {formatCurrency(rowTotal, currency)}
      </span>
      <button
        type="button"
        onClick={() => onRemove(idx)}
        className="text-muted-foreground/40 hover:text-red-400 transition-colors p-1"
        disabled={isOnly}
        data-testid={`remove-line-item-${idx}`}
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
});

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
  const { data: connectStatus } = useQuery({
    queryKey: ["stripe-connect-status"],
    queryFn: fetchStripeConnectStatus,
    retry: false,
    staleTime: 60_000,
  });

  const createQuotation = useCreateQuotation();
  const updateQuotation = useUpdateQuotation();

  const [clientId, setClientId] = useState("");
  const [issueDate, setIssueDate] = useState(today());
  const [validUntil, setValidUntil] = useState(thirtyDays());
  const [currency, setCurrency] = useState(() => detectLocaleCurrency());
  const [secondaryCurrency, setSecondaryCurrency] = useState<string>("");
  const [discountType, setDiscountType] = useState<QuotationInputDiscountType>(null);
  const [discountValue, setDiscountValue] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [paymentUrl, setPaymentUrl] = useState("");
  const [showQrCode, setShowQrCode] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "bank_transfer" | "both" | "none">("none");
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
    setSecondaryCurrency(existing.secondaryCurrency ?? "");
    setDiscountType((existing.discountType as QuotationInputDiscountType) ?? null);
    setDiscountValue(parseFloat(existing.discountValue ?? "0"));
    setTaxRate(parseFloat(existing.taxRate ?? "0"));
    setNotes(existing.notes ?? "");
    setTerms(existing.terms ?? "");
    setPaymentUrl(existing.paymentUrl ?? "");
    setShowQrCode(existing.showQrCode ?? false);
    // Legacy compatibility: if the quotation was created before paymentMethod
    // existed, infer "stripe" from the presence of a paymentUrl.
    const resolvedMethod = (existing.paymentMethod as "stripe" | "bank_transfer" | "both" | "none") ?? "none";
    const inferredMethod =
      resolvedMethod === "none" && existing.paymentUrl ? "stripe" : resolvedMethod;
    setPaymentMethod(inferredMethod);
    setTemplate((existing.template as "MODERN" | "CLASSIC") ?? "MODERN");
    if (existing.lineItems && existing.lineItems.length > 0) {
      setLineItems(
        existing.lineItems.map((li, idx) => ({
          sku: li.sku ?? null,
          description: li.description,
          quantity: parseFloat(li.quantity),
          unit: li.unit as LineItemInput["unit"],
          unitPrice: parseFloat(li.unitPrice),
          rateFormula: li.rateFormula ?? null,
          paymentRequired: li.paymentRequired !== false,
          position: idx,
        }))
      );
    }
  }, [existing]);

  const updateLineItem = useCallback((index: number, key: keyof LineItemInput, value: unknown) => {
    setLineItems((prev) =>
      prev.map((li, i) => (i === index ? { ...li, [key]: value } : li))
    );
  }, []);

  const handleFormulaChange = useCallback((index: number, formula: string) => {
    const evaluated = formula.trim() ? evaluateFormulaClient(formula) : null;
    setLineItems((prev) =>
      prev.map((li, i) => {
        if (i !== index) return li;
        return {
          ...li,
          rateFormula: formula || null,
          unitPrice: evaluated !== null ? evaluated : li.unitPrice,
        };
      })
    );
  }, []);

  const addLineItem = useCallback(() => {
    setLineItems((prev) => [...prev, { ...emptyLineItem(), position: prev.length }]);
  }, []);

  const removeLineItem = useCallback((index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index).map((li, i) => ({ ...li, position: i })));
  }, []);

  // Computed totals — memoised so they only recalculate when inputs change
  const { subtotal, discountAmount, taxAmount, total, hasDeferred, requiredTotal } = useMemo(() => {
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
    const hasDeferred = lineItems.some((li) => li.paymentRequired === false);
    const requiredSubtotal = lineItems
      .filter((li) => li.paymentRequired !== false)
      .reduce((sum, li) => sum + (Number(li.quantity) || 0) * (Number(li.unitPrice) || 0), 0);
    const requiredDiscountAmount =
      discountType === "PERCENTAGE"
        ? requiredSubtotal * (discountValue / 100)
        : discountType === "FIXED" && subtotal > 0
        ? discountAmount * (requiredSubtotal / subtotal)
        : 0;
    const requiredTaxableAmount = requiredSubtotal - requiredDiscountAmount;
    const requiredTotal = requiredTaxableAmount + requiredTaxableAmount * (taxRate / 100);
    return { subtotal, discountAmount, taxAmount, total, hasDeferred, requiredTotal };
  }, [lineItems, discountType, discountValue, taxRate]);

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
      secondaryCurrency: secondaryCurrency.trim().toUpperCase() || null,
      discountType: discountType ?? null,
      discountValue: discountValue || 0,
      taxRate: taxRate || 0,
      notes: notes || null,
      terms: terms || null,
      paymentUrl: paymentUrl || null,
      showQrCode,
      paymentMethod,
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
      className="w-full space-y-5"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={isEdit && id ? `/quotations/${id}` : "/quotations"}>
          <span className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
            <ArrowLeft size={18} />
          </span>
        </Link>
        <h1 className="text-2xl font-bold text-foreground">
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
                <SelectContent className="bg-popover border-border">
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-foreground">
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
            <Field label="Currency" required>
              <Select value={currency} onValueChange={setCurrency} data-testid="currency-select">
                <SelectTrigger className={inputCls} data-testid="currency-select-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border max-h-60">
                  {ALL_CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code} className="text-foreground">
                      {c.code} — {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Secondary Currency (optional)">
              <Select
                value={secondaryCurrency || "none"}
                onValueChange={(v) => setSecondaryCurrency(v === "none" ? "" : v)}
              >
                <SelectTrigger className={inputCls} data-testid="secondary-currency-input">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border max-h-60">
                  <SelectItem value="none" className="text-foreground">None</SelectItem>
                  {ALL_CURRENCIES.filter((c) => c.code !== currency).map((c) => (
                    <SelectItem key={c.code} value={c.code} className="text-foreground">
                      {c.code} — {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Template">
              <Select value={template} onValueChange={(v) => setTemplate(v as "MODERN" | "CLASSIC")}>
                <SelectTrigger className={inputCls}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="MODERN" className="text-foreground">Modern</SelectItem>
                  <SelectItem value="CLASSIC" className="text-foreground">Classic</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        </Section>

        {/* Line Items */}
        <BeamCard>
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground">Line Items</h2>
            <button
              type="button"
              onClick={addLineItem}
              className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              <Plus size={12} /> Add Item
            </button>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-[3fr_0.9fr_1fr_1.3fr_1.1fr_auto] gap-3 px-5 py-2 border-b border-border/60">
            {["Description", "Qty", "Unit", "Unit Price", "Total", ""].map((h) => (
              <span key={h} className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                {h}
              </span>
            ))}
          </div>

          {lineItems.map((li, idx) => (
            <LineItemRow
              key={idx}
              li={li}
              idx={idx}
              currency={currency}
              isOnly={lineItems.length === 1}
              onUpdate={updateLineItem}
              onFormulaChange={handleFormulaChange}
              onRemove={removeLineItem}
            />
          ))}

          {/* Totals */}
          <div className="px-5 py-4 border-t border-border bg-muted/30">
            <div className="max-w-xs ml-auto space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">{formatCurrency(subtotal, currency)}</span>
              </div>
              {discountType && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="text-amber-400">- {formatCurrency(discountAmount, currency)}</span>
                </div>
              )}
              {taxRate > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax ({taxRate}%)</span>
                  <span className="text-foreground/80">{formatCurrency(taxAmount, currency)}</span>
                </div>
              )}
              {hasDeferred && (
                <div className="flex justify-between text-sm border-t border-border pt-1.5 mt-1">
                  <span className="text-blue-400 font-semibold">Amount due now</span>
                  <span className="text-blue-400 font-semibold">{formatCurrency(requiredTotal, currency)}</span>
                </div>
              )}
              <div className={`flex justify-between text-sm pt-1.5 mt-1 ${hasDeferred ? "" : "border-t border-border"}`}>
                <span className={hasDeferred ? "text-muted-foreground" : "text-foreground font-bold"}>
                  {hasDeferred ? "Full total" : "Total"}
                </span>
                <span className={hasDeferred ? "text-muted-foreground" : "text-foreground font-bold text-base"}>
                  {formatCurrency(total, currency)}
                </span>
              </div>
            </div>
          </div>
        </BeamCard>

        {/* Pricing adjustments */}
        <Section title="Pricing Adjustments">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field label="Discount Type">
              <Select
                value={discountType ?? "none"}
                onValueChange={(v) => setDiscountType(v === "none" ? null : (v as QuotationInputDiscountType))}
              >
                <SelectTrigger className={inputCls}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="none" className="text-foreground">No discount</SelectItem>
                  <SelectItem value="PERCENTAGE" className="text-foreground">Percentage (%)</SelectItem>
                  <SelectItem value="FIXED" className="text-foreground">Fixed amount</SelectItem>
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
          <Field label="Payment Method">
            <div className="flex gap-2 flex-wrap">
              {([
                { value: "none", label: "None" },
                { value: "bank_transfer", label: "Bank Transfer" },
                { value: "stripe", label: "Stripe" },
                { value: "both", label: "Both" },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPaymentMethod(opt.value)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                    paymentMethod === opt.value
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-transparent border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {(paymentMethod === "stripe" || paymentMethod === "both") && connectStatus?.connected === false && (
              <p className="text-amber-400 text-xs mt-1">
                No Stripe account connected. Connect Stripe in Settings or enter a payment URL below.
              </p>
            )}
          </Field>
          {(paymentMethod === "stripe" || paymentMethod === "both") && (
            <>
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
            </>
          )}
          {(paymentMethod === "bank_transfer" || paymentMethod === "both") && (
            <p className="text-muted-foreground text-xs">
              Bank details will be pulled from your company settings and shown on the PDF.
            </p>
          )}
        </Section>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Link href={isEdit && id ? `/quotations/${id}` : "/quotations"}>
            <Button
              type="button"
              variant="outline"
              className="border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={isPending}
            className="bg-blue-600 hover:bg-blue-500 text-white"
            data-testid="submit-quotation-btn"
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
