import { useGetClient, useDeleteClient, useListQuotations } from "@workspace/api-client-react";
import { useParams, useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { formatDate, formatCurrency, statusBadge, STATUS_LABELS } from "@/lib/format";
import { ArrowLeft, Edit, Trash2, Mail, Phone, MapPin, Building2, FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: client, isLoading } = useGetClient(id);
  const { data: quotations = [] } = useListQuotations({ clientId: id });
  const deleteClient = useDeleteClient();

  async function handleDelete() {
    if (!client) return;
    if (!confirm(`Delete client "${client.name}"? This cannot be undone.`)) return;
    try {
      await deleteClient.mutateAsync({ id });
      toast({ title: "Client deleted" });
      navigate("/clients");
    } catch {
      toast({ title: "Failed to delete client", variant: "destructive" });
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-slate-800 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-slate-500 text-sm">Client not found.</div>
    );
  }

  const addressParts = [
    client.addressLine1,
    client.addressLine2,
    client.city,
    client.region,
    client.postalCode,
    client.country,
  ].filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl space-y-5"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/clients">
          <span className="text-slate-400 hover:text-white cursor-pointer transition-colors">
            <ArrowLeft size={18} />
          </span>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-white truncate">{client.name}</h1>
          {client.company && <p className="text-slate-400 text-sm">{client.company}</p>}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Link href={`/clients/${id}/edit`}>
            <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800">
              <Edit size={13} className="mr-1.5" /> Edit
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            className="border-slate-700 text-red-400 hover:text-red-300 hover:bg-red-900/20"
          >
            <Trash2 size={13} className="mr-1.5" /> Delete
          </Button>
        </div>
      </div>

      {/* Info card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-slate-300 border-b border-slate-800 pb-3">
          Contact Details
        </h2>
        <InfoRow icon={Mail} label="Email" value={client.email} />
        {client.phone && <InfoRow icon={Phone} label="Phone" value={client.phone} />}
        {client.company && <InfoRow icon={Building2} label="Company" value={client.company} />}
        {addressParts.length > 0 && (
          <InfoRow icon={MapPin} label="Address" value={addressParts.join(", ")} />
        )}
        {client.notes && (
          <div className="pt-2 border-t border-slate-800">
            <p className="text-slate-500 text-xs mb-1">Notes</p>
            <p className="text-slate-300 text-sm whitespace-pre-line">{client.notes}</p>
          </div>
        )}
      </div>

      {/* Quotation history */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <FileText size={14} className="text-blue-400" />
            Quotations ({quotations.length})
          </h2>
          <Link href={`/quotations/new?clientId=${id}`}>
            <span className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer transition-colors">
              <Plus size={12} /> New quotation
            </span>
          </Link>
        </div>
        {quotations.length === 0 ? (
          <p className="text-slate-500 text-sm py-4 text-center">No quotations yet</p>
        ) : (
          <div className="space-y-2">
            {quotations.map((q) => (
              <Link key={q.id} href={`/quotations/${q.id}`}>
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer">
                  <div>
                    <span className="text-white text-sm font-mono font-medium">{q.number}</span>
                    <span
                      className={`ml-2 text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge(q.status)}`}
                    >
                      {STATUS_LABELS[q.status] ?? q.status}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-white text-sm font-semibold">
                      {formatCurrency(q.total, q.currency)}
                    </p>
                    <p className="text-slate-500 text-xs">{formatDate(q.issueDate)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <p className="text-slate-600 text-xs">
        Created {formatDate(client.createdAt)} · Updated {formatDate(client.updatedAt)}
      </p>
    </motion.div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon size={14} className="text-slate-500 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-slate-500 text-xs">{label}</p>
        <p className="text-slate-200 text-sm">{value}</p>
      </div>
    </div>
  );
}
