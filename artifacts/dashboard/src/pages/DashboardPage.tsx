import { useGetDashboard } from "@workspace/api-client-react";
import { formatCurrency, formatDate, statusBadge, STATUS_LABELS } from "@/lib/format";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  DollarSign,
  FileText,
  TrendingUp,
  CheckCircle,
  Clock,
  Plus,
  ArrowRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const STATUS_CHART_COLORS: Record<string, string> = {
  DRAFT: "#475569",
  SENT: "#3b82f6",
  ACCEPTED: "#10b981",
  REJECTED: "#ef4444",
  PAID: "#8b5cf6",
  EXPIRED: "#f59e0b",
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

export default function DashboardPage() {
  const { data, isLoading } = useGetDashboard();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-slate-800 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const counts = data?.statusCounts ?? {};
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const chartData = Object.entries(counts).map(([status, count]) => ({
    status: STATUS_LABELS[status] ?? status,
    count,
    color: STATUS_CHART_COLORS[status] ?? "#475569",
  }));

  const outstanding = data?.outstandingTotal ?? "0";
  const recent = data?.recentQuotations ?? [];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-0.5">Overview of your quotation pipeline</p>
        </div>
        <Link href="/quotations/new">
          <span className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer">
            <Plus size={15} />
            New Quotation
          </span>
        </Link>
      </motion.div>

      {/* Stat cards */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={DollarSign}
          label="Outstanding"
          value={formatCurrency(outstanding)}
          color="text-blue-400"
          bg="bg-blue-500/10"
        />
        <StatCard
          icon={FileText}
          label="Total Quotes"
          value={String(total)}
          color="text-slate-300"
          bg="bg-slate-700/50"
        />
        <StatCard
          icon={CheckCircle}
          label="Accepted"
          value={String(counts["ACCEPTED"] ?? 0)}
          color="text-emerald-400"
          bg="bg-emerald-500/10"
        />
        <StatCard
          icon={Clock}
          label="Pending (Sent)"
          value={String(counts["SENT"] ?? 0)}
          color="text-amber-400"
          bg="bg-amber-500/10"
        />
      </motion.div>

      {/* Chart + recent */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Chart */}
        <motion.div
          variants={item}
          className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5"
        >
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp size={14} className="text-blue-400" />
            Status Breakdown
          </h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barSize={28}>
                <XAxis
                  dataKey="status"
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: 8,
                    color: "#f1f5f9",
                    fontSize: 12,
                  }}
                  cursor={{ fill: "rgba(148,163,184,0.05)" }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-slate-500 text-sm">
              No quotations yet
            </div>
          )}
        </motion.div>

        {/* Recent quotations */}
        <motion.div
          variants={item}
          className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Recent Quotations</h2>
            <Link href="/quotations">
              <span className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer transition-colors">
                View all <ArrowRight size={11} />
              </span>
            </Link>
          </div>
          <div className="space-y-2">
            {recent.length === 0 && (
              <p className="text-slate-500 text-sm py-8 text-center">No quotations yet</p>
            )}
            {recent.map((q) => (
              <Link key={q.id} href={`/quotations/${q.id}`}>
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer group">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm font-medium">{q.number}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge(q.status)}`}
                      >
                        {STATUS_LABELS[q.status] ?? q.status}
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs mt-0.5 truncate">
                      {q.clientName ?? "Unknown client"}
                      {q.clientCompany ? ` · ${q.clientCompany}` : ""}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className="text-white text-sm font-semibold">
                      {formatCurrency(q.total, q.currency)}
                    </p>
                    <p className="text-slate-500 text-xs">{formatDate(q.issueDate)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  bg,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
  bg: string;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
        <Icon size={18} className={color} />
      </div>
      <div className="min-w-0">
        <p className="text-slate-400 text-xs">{label}</p>
        <p className="text-white font-bold text-lg leading-tight truncate">{value}</p>
      </div>
    </div>
  );
}
