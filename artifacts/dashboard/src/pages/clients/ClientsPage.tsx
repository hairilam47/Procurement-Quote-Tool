import { useState } from "react";
import { useListClients, useDeleteClient } from "@workspace/api-client-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Plus, Search, Trash2, Edit, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { BeamCard } from "@/components/ui/beam-card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/hooks/use-toast";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};
const card = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="w-9 h-9 rounded-lg bg-muted animate-pulse" />
      <div className="h-3.5 bg-muted rounded animate-pulse w-28" />
      <div className="h-3 bg-muted rounded animate-pulse w-20" />
      <div className="h-3 bg-muted rounded animate-pulse w-36" />
    </div>
  );
}

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const { data: clients = [], isLoading, refetch } = useListClients({ search: search || undefined });
  const deleteClient = useDeleteClient();
  const { toast } = useToast();

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete client "${name}"? This cannot be undone.`)) return;
    try {
      await deleteClient.mutateAsync({ id });
      toast({ title: "Client deleted" });
      refetch();
    } catch {
      toast({ title: "Failed to delete client", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Clients"
        subtitle={`${clients.length} total`}
        actions={[{ label: "New Client", href: "/clients/new", testId: "new-client-btn" }]}
      />

      <div className="relative max-w-sm">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-9 text-sm"
          data-testid="clients-search"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : clients.length === 0 ? (
        <BeamCard>
          <EmptyState
            icon={Users}
            title="No clients found"
            description={
              search
                ? `No clients match "${search}". Try a different search.`
                : "Add your first client to start creating quotations."
            }
            action={
              !search
                ? { label: "Add Client", href: "/clients/new" }
                : undefined
            }
          />
        </BeamCard>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {clients.map((client) => (
            <motion.div key={client.id} variants={card}>
              <BeamCard className="p-4 flex flex-col h-full">
                <Link href={`/clients/${client.id}`}>
                  <div className="cursor-pointer flex-1">
                    <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center mb-3">
                      <span className="text-blue-400 text-sm font-semibold select-none">
                        {client.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <h3 className="text-foreground font-medium text-sm">{client.name}</h3>
                    {client.company && (
                      <p className="text-muted-foreground text-xs mt-0.5">{client.company}</p>
                    )}
                    <p className="text-muted-foreground text-xs mt-1 truncate">{client.email}</p>
                    {client.city && (
                      <p className="text-muted-foreground/60 text-xs mt-0.5">
                        {client.city}
                        {client.country ? `, ${client.country}` : ""}
                      </p>
                    )}
                  </div>
                </Link>
                <div className="flex gap-3 mt-3 pt-3 border-t border-border/60">
                  <Link href={`/clients/${client.id}/edit`}>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                      <Edit size={11} /> Edit
                    </span>
                  </Link>
                  <button
                    onClick={() => handleDelete(client.id, client.name)}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-red-400 cursor-pointer transition-colors ml-auto"
                    data-testid={`delete-client-${client.id}`}
                  >
                    <Trash2 size={11} /> Delete
                  </button>
                </div>
              </BeamCard>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
