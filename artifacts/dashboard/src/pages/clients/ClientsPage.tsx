import { useState } from "react";
import { useListClients, useDeleteClient } from "@workspace/api-client-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Plus, Search, Trash2, Edit, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const card = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Clients</h1>
          <p className="text-slate-400 text-sm mt-0.5">{clients.length} total</p>
        </div>
        <Link href="/clients/new">
          <span data-testid="new-client-btn" className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer">
            <Plus size={15} />
            New Client
          </span>
        </Link>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <Input
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 h-9 max-w-sm"
          data-testid="clients-search"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <User size={32} className="text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No clients found</p>
          <Link href="/clients/new">
            <span className="inline-flex items-center gap-1 text-blue-400 text-sm mt-2 cursor-pointer hover:text-blue-300">
              <Plus size={13} /> Add your first client
            </span>
          </Link>
        </div>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {clients.map((client) => (
            <motion.div key={client.id} variants={card}>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors group">
                <Link href={`/clients/${client.id}`}>
                  <div className="cursor-pointer">
                    <div className="flex items-start justify-between mb-2">
                      <div className="w-9 h-9 rounded-lg bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                        <User size={16} className="text-blue-400" />
                      </div>
                    </div>
                    <h3 className="text-white font-semibold text-sm">{client.name}</h3>
                    {client.company && (
                      <p className="text-slate-400 text-xs mt-0.5">{client.company}</p>
                    )}
                    <p className="text-slate-500 text-xs mt-1">{client.email}</p>
                    {client.city && (
                      <p className="text-slate-600 text-xs mt-0.5">
                        {client.city}
                        {client.country ? `, ${client.country}` : ""}
                      </p>
                    )}
                  </div>
                </Link>
                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-800">
                  <Link href={`/clients/${client.id}/edit`}>
                    <span className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white cursor-pointer transition-colors">
                      <Edit size={12} /> Edit
                    </span>
                  </Link>
                  <button
                    onClick={() => handleDelete(client.id, client.name)}
                    className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-red-400 cursor-pointer transition-colors ml-auto"
                    data-testid={`delete-client-${client.id}`}
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
