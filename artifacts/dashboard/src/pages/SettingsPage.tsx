import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGetSettings, useUpdateSettings } from "@workspace/api-client-react";
import { BeamCard } from "@/components/ui/beam-card";
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
import { Settings, Upload, Loader2, CreditCard, ExternalLink, CheckCircle2, AlertCircle, Link2 } from "lucide-react";

interface SubscriptionInfo {
  id: string;
  status: string;
  planName: string;
  interval: string | null;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
}

interface StripeConnectStatus {
  connected: boolean;
  accountId: string | null;
  displayName: string | null;
}

async function fetchSubscription(): Promise<{ subscription: SubscriptionInfo | null }> {
  const res = await fetch("/api/stripe/subscription", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch subscription");
  return res.json();
}

async function fetchStripeConnectStatus(): Promise<StripeConnectStatus> {
  const res = await fetch("/api/stripe/connect/status", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch Stripe Connect status");
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
  const queryClient = useQueryClient();

  const { data: subscriptionData, isLoading: subscriptionLoading } = useQuery({
    queryKey: ["stripe-subscription"],
    queryFn: fetchSubscription,
    retry: false,
  });

  const { data: connectStatus, isLoading: connectLoading } = useQuery({
    queryKey: ["stripe-connect-status"],
    queryFn: fetchStripeConnectStatus,
    retry: false,
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/stripe/connect", {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error((json as { error?: string }).error ?? "Failed to disconnect");
      }
    },
    onSuccess: () => {
      toast({ title: "Stripe account disconnected" });
      queryClient.invalidateQueries({ queryKey: ["stripe-connect-status"] });
    },
    onError: (err) => {
      toast({
        title: err instanceof Error ? err.message : "Failed to disconnect",
        variant: "destructive",
      });
    },
  });

  // Handle redirect back from Stripe OAuth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stripeConnect = params.get("stripe_connect");
    if (stripeConnect === "success") {
      toast({ title: "Stripe account connected successfully" });
      queryClient.invalidateQueries({ queryKey: ["stripe-connect-status"] });
      window.history.replaceState({}, "", window.location.pathname);
    } else if (stripeConnect === "error") {
      const reason = params.get("reason") ?? "Unknown error";
      toast({ title: `Stripe Connect failed: ${reason}`, variant: "destructive" });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

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
          <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />
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
        <h1 className="text-2xl font-bold text-foreground">Company Settings</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Logo */}
        <Section title="Logo">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-muted border border-border rounded-xl flex items-center justify-center overflow-hidden">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <Upload size={20} className="text-muted-foreground" />
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
                className="border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                onClick={() => fileRef.current?.click()}
                disabled={logoUploading}
              >
                {logoUploading ? (
                  <><Loader2 size={13} className="animate-spin mr-1.5" />Uploading...</>
                ) : (
                  "Upload Logo"
                )}
              </Button>
              <p className="text-muted-foreground text-xs mt-1">PNG, JPG, SVG up to 5MB</p>
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
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="MODERN" className="text-foreground">Modern</SelectItem>
                  <SelectItem value="CLASSIC" className="text-foreground">Classic</SelectItem>
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

      {/* Stripe Account */}
      <Section title="Stripe Account">
        {connectLoading ? (
          <div className="h-10 bg-muted rounded-lg animate-pulse" />
        ) : connectStatus?.connected ? (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-green-400 flex-shrink-0" />
              <div>
                <p className="text-foreground text-sm font-medium">Stripe Connected</p>
                {connectStatus.displayName && (
                  <p className="text-muted-foreground text-xs mt-0.5">{connectStatus.displayName}</p>
                )}
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-red-800 text-red-400 hover:text-red-200 hover:bg-red-900/20"
              onClick={() => {
                if (confirm("Disconnect your Stripe account? You will no longer be able to generate payment links until you reconnect.")) {
                  disconnectMutation.mutate();
                }
              }}
              disabled={disconnectMutation.isPending}
            >
              {disconnectMutation.isPending ? (
                <><Loader2 size={13} className="animate-spin mr-1.5" />Disconnecting...</>
              ) : (
                "Disconnect"
              )}
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-muted-foreground flex-shrink-0" />
              <p className="text-muted-foreground text-sm">
                Connect your Stripe account to accept payments directly on quotations.
              </p>
            </div>
            <a href="/api/stripe/connect">
              <Button
                type="button"
                size="sm"
                className="bg-violet-600 hover:bg-violet-500 text-white"
                data-testid="connect-stripe-btn"
              >
                <Link2 size={13} className="mr-1.5" />
                Connect Stripe
              </Button>
            </a>
          </div>
        )}
      </Section>

      {/* Billing */}
      <Section title="Billing">
        {subscriptionLoading ? (
          <div className="h-10 bg-muted rounded-lg animate-pulse" />
        ) : subscriptionData?.subscription ? (
          <BillingInfo
            subscription={subscriptionData.subscription}
            onManage={handleManageBilling}
            loading={portalLoading}
          />
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">No active subscription found.</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-border text-muted-foreground hover:text-foreground hover:bg-muted"
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
          <span className="text-foreground font-medium">{subscription.planName}</span>
          <span className={`text-xs font-semibold uppercase ${statusColor[subscription.status] ?? "text-muted-foreground"}`}>
            {statusLabel[subscription.status] ?? subscription.status}
          </span>
        </div>
        <p className="text-muted-foreground text-sm">
          {subscription.cancelAtPeriodEnd
            ? `Cancels on ${renewalDate}`
            : `Renews on ${renewalDate}`}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="border-border text-muted-foreground hover:text-foreground hover:bg-muted"
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

const inputCls = "bg-input border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <BeamCard className="p-5 space-y-4">
      <h2 className="text-sm font-semibold text-muted-foreground border-b border-border pb-3">{title}</h2>
      {children}
    </BeamCard>
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
      <Label className="text-muted-foreground text-xs">
        {label}
        {required && <span className="text-blue-400 ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}
