import { useEffect, useState } from "react";
import {
  useCreateClient,
  useUpdateClient,
  useGetClient,
  getGetClientQueryKey,
} from "@workspace/api-client-react";
import type { ClientInput } from "@workspace/api-client-react";
import { useLocation, useParams } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "wouter";

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

const empty: ClientInput = {
  name: "",
  company: null,
  email: "",
  phone: null,
  addressLine1: null,
  addressLine2: null,
  city: null,
  region: null,
  postalCode: null,
  country: null,
  notes: null,
};

export default function ClientFormPage() {
  const params = useParams<{ id?: string }>();
  const id = params.id;
  const isEdit = Boolean(id);

  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [form, setForm] = useState<ClientInput>(empty);

  const { data: existing } = useGetClient(id ?? "", {
    query: { enabled: isEdit && !!id, queryKey: getGetClientQueryKey(id ?? "") },
  });
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();

  useEffect(() => {
    if (!existing) return;
    setForm({
      name: existing.name,
      company: existing.company ?? null,
      email: existing.email,
      phone: existing.phone ?? null,
      addressLine1: existing.addressLine1 ?? null,
      addressLine2: existing.addressLine2 ?? null,
      city: existing.city ?? null,
      region: existing.region ?? null,
      postalCode: existing.postalCode ?? null,
      country: existing.country ?? null,
      notes: existing.notes ?? null,
    });
  }, [existing]);

  function set(key: keyof ClientInput, value: unknown) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (isEdit && id) {
        await updateClient.mutateAsync({ id, data: form });
        toast({ title: "Client updated" });
        navigate(`/clients/${id}`);
      } else {
        const created = await createClient.mutateAsync({ data: form });
        toast({ title: "Client created" });
        navigate(`/clients/${created.id}`);
      }
    } catch {
      toast({ title: "Failed to save client", variant: "destructive" });
    }
  }

  const isPending = createClient.isPending || updateClient.isPending;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl space-y-6"
    >
      <div className="flex items-center gap-3">
        <Link href={isEdit && id ? `/clients/${id}` : "/clients"}>
          <span className="text-slate-400 hover:text-white cursor-pointer transition-colors">
            <ArrowLeft size={18} />
          </span>
        </Link>
        <h1 className="text-2xl font-bold text-white">
          {isEdit ? "Edit Client" : "New Client"}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-300 border-b border-slate-800 pb-3">
            Contact Information
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Full Name" required>
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className={inputCls}
                required
              />
            </Field>
            <Field label="Company">
              <Input
                value={form.company ?? ""}
                onChange={(e) => set("company", e.target.value || null)}
                className={inputCls}
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
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-300 border-b border-slate-800 pb-3">
            Address
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Address Line 1" className="col-span-2">
              <Input
                value={form.addressLine1 ?? ""}
                onChange={(e) => set("addressLine1", e.target.value || null)}
                className={inputCls}
              />
            </Field>
            <Field label="Address Line 2" className="col-span-2">
              <Input
                value={form.addressLine2 ?? ""}
                onChange={(e) => set("addressLine2", e.target.value || null)}
                className={inputCls}
              />
            </Field>
            <Field label="City">
              <Input
                value={form.city ?? ""}
                onChange={(e) => set("city", e.target.value || null)}
                className={inputCls}
              />
            </Field>
            <Field label="Region / State">
              <Input
                value={form.region ?? ""}
                onChange={(e) => set("region", e.target.value || null)}
                className={inputCls}
              />
            </Field>
            <Field label="Postal Code">
              <Input
                value={form.postalCode ?? ""}
                onChange={(e) => set("postalCode", e.target.value || null)}
                className={inputCls}
              />
            </Field>
            <Field label="Country">
              <Input
                value={form.country ?? ""}
                onChange={(e) => set("country", e.target.value || null)}
                className={inputCls}
              />
            </Field>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-300 border-b border-slate-800 pb-3">
            Notes
          </h2>
          <Textarea
            value={form.notes ?? ""}
            onChange={(e) => set("notes", e.target.value || null)}
            className={`${inputCls} min-h-[80px]`}
            placeholder="Internal notes about this client..."
          />
        </div>

        <div className="flex justify-end gap-3">
          <Link href={isEdit && id ? `/clients/${id}` : "/clients"}>
            <Button type="button" variant="outline" className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800">
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
              "Create Client"
            )}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
