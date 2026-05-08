import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useGetSettings, useUpdateSettings } from "@workspace/api-client-react";
import type { SettingsInput, SettingsInputDefaultTemplate } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { Settings, Upload, Loader2, CreditCard, ExternalLink } from "lucide-react";

interface SubscriptionInfo {
  id: string;
  status: string;
  planName: string;
  interval: string | null;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
}

async function fetchSubscription(): Promise<{ subscription: SubscriptionInfo | null }> {
  const res = await fetch("/api/stripe/subscription", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch subscription");
  return res.json();
}

export default function SettingsPage() {
  const { data: settings, isLoading, refetch } = useGetSettings();
  const updateSettings = useUpdateSettings();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const { data: subscriptionData, isLoading: subscriptionLoading } = useQuery({
    queryKey: ["stripe-subscription"],
    queryFn: fetchSubscription,
    retry: false,
  });

  const [form, setForm] = useState<SettingsInput>({
    name: "",
    addressLine1: "",
    addressLine2: null,
    city: "",
    region: null,
    postalCode: "",
    country: "",
    phone: null,
    email: "",
    website: null,
    taxNumber: null,
    registrationNumber: null,
    logoUrl: null,
    currency: "USD",
    defaultTaxRate: 0,
    defaultTerms: null,
    defaultNotes: null,
    defaultTemplate: "MODERN",
    defaultPaymentUrl: null,
  });

  useEffect(() => {
    if (!settings) return;
    setForm({
      name: settings.name,
      addressLine1: settings.addressLine1,
      addressLine2: settings.addressLine2 ?? null,
      city: settings.city,
      region: settings.region ?? null,
      postalCode: settings.postalCode,
      country: settings.country,
      phone: settings.phone ?? null,
      email: settings.email,
      website: settings.website ?? null,
      taxNumber: settings.taxNumber ?? null,
      registrationNumber: settings.registrationNumber ?? null,
      logoUrl: settings.logoUrl ?? null,
      currency: settings.currency,
      defaultTaxRate: parseFloat(settings.defaultTaxRate),
      defaultTerms: settings.defaultTerms ?? null,
      defaultNotes: settings.defaultNotes ?? null,
      defaultTemplate: settings.defaultTemplate as SettingsInputDefaultTemplate,
      defaultPaymentUrl: settings.defaultPaymentUrl ?? null,
    });
    setLogoPreview(settings.logoUrl ?? null);
  }, [settings]);

  function set(key: keyof SettingsInput, value: unknown) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleLogoUpload(file: File) {
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append("logo", file);
      const res = await fetch("/api/settings/logo", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Upload failed");
      const json = await res.json();
      const url = json.url ?? json.objectPath;
      setLogoPreview(url);
      set("logoUrl", url);
      toast({ title: "Logo uploaded" });
    } catch {
      toast({ title: "Logo upload failed", variant: "destructive" });
    } finally {
      setLogoUploading(false);
    }
  }

  async function handleManageBilling() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/customer-portal", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed to open billing portal");
      }
      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : "Failed to open billing portal",
        variant: "destructive",
      });
      setPortalLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await updateSettings.mutateAsync({ data: form });
      toast({ title: "Settings saved" });
      refetch();
    } catch {
      toast({ title: "Failed to save settings", variant: "destructive" });
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-slate-800 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl space-y-6"
    >
      <div className="flex items-center gap-2">
        <Settings size={20} className="text-blue-400" />
        <h1 className="text-2xl font-bold text-white">Company Settings</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Logo */}
        <Section title="Logo">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-center overflow-hidden">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <Upload size={20} className="text-slate-500" />
              )}
            </div>
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleLogoUpload(f);
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
                onClick={() => fileRef.current?.click()}
                disabled={logoUploading}
              >
                {logoUploading ? (
                  <><Loader2 size={13} className="animate-spin mr-1.5" />Uploading...</>
                ) : (
                  "Upload Logo"
                )}
              </Button>
              <p className="text-slate-500 text-xs mt-1">PNG, JPG, SVG up to 5MB</p>
            </div>
          </div>
        </Section>

        {/* Company Info */}
        <Section title="Company Information">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Company Name" required className="col-span-2">
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className={inputCls}
                required
              />
            </Field>
            <Field label="Email" required>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className={inputCls}
                required
              />
            </Field>
            <Field label="Phone">
              <Input
                value={form.phone ?? ""}
                onChange={(e) => set("phone", e.target.value || null)}
                className={inputCls}
              />
            </Field>
            <Field label="Website">
              <Input
                value={form.website ?? ""}
                onChange={(e) => set("website", e.target.value || null)}
                className={inputCls}
              />
            </Field>
            <Field label="Tax Number">
              <Input
                value={form.taxNumber ?? ""}
                onChange={(e) => set("taxNumber", e.target.value || null)}
                className={inputCls}
              />
            </Field>
            <Field label="Company Registration Number">
              <Input
                value={form.registrationNumber ?? ""}
                onChange={(e) => set("registrationNumber", e.target.value || null)}
                className={inputCls}
                placeholder="e.g. 12345678"
              />
            </Field>
          </div>
        </Section>

        {/* Address */}
        <Section title="Address">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Address Line 1" required className="col-span-2">
              <Input
                value={form.addressLine1}
                onChange={(e) => set("addressLine1", e.target.value)}
                className={inputCls}
                required
              />
            </Field>
            <Field label="Address Line 2" className="col-span-2">
              <Input
                value={form.addressLine2 ?? ""}
                onChange={(e) => set("addressLine2", e.target.value || null)}
                className={inputCls}
              />
            </Field>
            <Field label="City" required>
              <Input
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                className={inputCls}
                required
              />
            </Field>
            <Field label="Region / State">
              <Input
                value={form.region ?? ""}
                onChange={(e) => set("region", e.target.value || null)}
                className={inputCls}
              />
            </Field>
            <Field label="Postal Code" required>
              <Input
                value={form.postalCode}
                onChange={(e) => set("postalCode", e.target.value)}
                className={inputCls}
                required
              />
            </Field>
            <Field label="Country" required>
              <Input
                value={form.country}
                onChange={(e) => set("country", e.target.value)}
                className={inputCls}
                required
              />
            </Field>
          </div>
        </Section>

        {/* Quotation Defaults */}
        <Section title="Quotation Defaults">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Default Currency">
              <Input
                value={form.currency}
                onChange={(e) => set("currency", e.target.value)}
                className={inputCls}
                maxLength={3}
                placeholder="USD"
              />
            </Field>
            <Field label="Default Tax Rate (%)">
              <Input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={form.defaultTaxRate}
                onChange={(e) => set("defaultTaxRate", parseFloat(e.target.value) || 0)}
                className={inputCls}
              />
            </Field>
            <Field label="Default Template">
              <Select
                value={form.defaultTemplate}
                onValueChange={(v) => set("defaultTemplate", v)}
              >
                <SelectTrigger className={inputCls}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  <SelectItem value="MODERN" className="text-white">Modern</SelectItem>
                  <SelectItem value="CLASSIC" className="text-white">Classic</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Default Payment URL">
              <Input
                value={form.defaultPaymentUrl ?? ""}
                onChange={(e) => set("defaultPaymentUrl", e.target.value || null)}
                className={inputCls}
                placeholder="https://..."
              />
            </Field>
            <Field label="Default Terms" className="col-span-2">
              <Textarea
                value={form.defaultTerms ?? ""}
                onChange={(e) => set("defaultTerms", e.target.value || null)}
                className={`${inputCls} min-h-[80px]`}
              />
            </Field>
            <Field label="Default Notes" className="col-span-2">
              <Textarea
                value={form.defaultNotes ?? ""}
                onChange={(e) => set("defaultNotes", e.target.value || null)}
                className={`${inputCls} min-h-[80px]`}
              />
            </Field>
          </div>
        </Section>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={updateSettings.isPending}
            className="bg-blue-600 hover:bg-blue-500 text-white"
            data-testid="save-settings-btn"
          >
            {updateSettings.isPending ? (
              <><Loader2 size={14} className="animate-spin mr-1.5" />Saving...</>
            ) : (
              "Save Settings"
            )}
          </Button>
        </div>
      </form>

      {/* Billing */}
      <Section title="Billing">
        {subscriptionLoading ? (
          <div className="h-10 bg-slate-800 rounded-lg animate-pulse" />
        ) : subscriptionData?.subscription ? (
          <BillingInfo
            subscription={subscriptionData.subscription}
            onManage={handleManageBilling}
            loading={portalLoading}
          />
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-slate-400 text-sm">No active subscription found.</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
              onClick={handleManageBilling}
              disabled={portalLoading}
              data-testid="manage-billing-btn"
            >
              {portalLoading ? (
                <><Loader2 size={13} className="animate-spin mr-1.5" />Opening...</>
              ) : (
                <><CreditCard size={13} className="mr-1.5" />Manage Subscription</>
              )}
            </Button>
          </div>
        )}
      </Section>
    </motion.div>
  );
}

function BillingInfo({
  subscription,
  onManage,
  loading,
}: {
  subscription: SubscriptionInfo;
  onManage: () => void;
  loading: boolean;
}) {
  const renewalDate = new Date(subscription.currentPeriodEnd * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const statusColor: Record<string, string> = {
    active: "text-green-400",
    trialing: "text-blue-400",
    past_due: "text-yellow-400",
    canceled: "text-red-400",
    unpaid: "text-red-400",
  };

  const statusLabel: Record<string, string> = {
    active: "Active",
    trialing: "Trial",
    past_due: "Past Due",
    canceled: "Canceled",
    unpaid: "Unpaid",
  };

  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-white font-medium">{subscription.planName}</span>
          <span className={`text-xs font-semibold uppercase ${statusColor[subscription.status] ?? "text-slate-400"}`}>
            {statusLabel[subscription.status] ?? subscription.status}
          </span>
        </div>
        <p className="text-slate-400 text-sm">
          {subscription.cancelAtPeriodEnd
            ? `Cancels on ${renewalDate}`
            : `Renews on ${renewalDate}`}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
        onClick={onManage}
        disabled={loading}
        data-testid="manage-billing-btn"
      >
        {loading ? (
          <><Loader2 size={13} className="animate-spin mr-1.5" />Opening...</>
        ) : (
          <><ExternalLink size={13} className="mr-1.5" />Manage Subscription</>
        )}
      </Button>
    </div>
  );
}

const inputCls = "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
      <h2 className="text-sm font-semibold text-slate-300 border-b border-slate-800 pb-3">{title}</h2>
      {children}
    </div>
  );
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
      <Label className="text-slate-400 text-xs">
        {label}
        {required && <span className="text-blue-400 ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}
