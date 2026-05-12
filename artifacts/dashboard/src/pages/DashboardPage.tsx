import { useState, useEffect, useRef } from "react";
import { useGetDashboard } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency, formatDate, statusBadge, STATUS_LABELS } from "@/lib/format";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { BeamCard } from "@/components/ui/beam-card";
import {
  DollarSign,
  FileText,
  TrendingUp,
  CheckCircle,
  CheckCircle2,
  Clock,
  Plus,
  ArrowRight,
  Receipt,
  BadgeDollarSign,
  CalendarCheck,
  FilePen,
  CreditCard,
  X,
  Rocket,
  Building2,
  Link2,
  Users,
  Send,
  Circle,
  AlertCircle,
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

const PAYWALL_DISMISSED_KEY = "paywall_banner_dismissed";
const ONBOARDING_DISMISSED_KEY = "onboarding_checklist_dismissed";

async function fetchSubscription(): Promise<{ subscription: { id: string } | null }> {
  const res = await fetch("/api/stripe/subscription", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch subscription");
  return res.json();
}

interface OnboardingStatus {
  hasCompanyDetails: boolean;
  hasStripeConnect: boolean;
  hasClient: boolean;
  hasSentQuotation: boolean;
}

async function fetchOnboardingStatus(): Promise<OnboardingStatus> {
  const res = await fetch("/api/onboarding/status", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch onboarding status");
  return res.json();
}

function PaywallBanner() {
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(PAYWALL_DISMISSED_KEY) === "1"
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ["stripe-subscription"],
    queryFn: fetchSubscription,
    retry: false,
    staleTime: 60_000,
  });

  const handleDismiss = () => {
    sessionStorage.setItem(PAYWALL_DISMISSED_KEY, "1");
    setDismissed(true);
  };

  if (isLoading || isError || dismissed || data?.subscription != null) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="paywall-banner"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25 }}
      >
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
          <CreditCard size={16} className="flex-shrink-0 text-amber-400" />
          <p className="flex-1 text-sm font-medium">
            No active subscription.{" "}
            <Link href="/settings#billing">
              <span className="underline underline-offset-2 cursor-pointer hover:text-amber-200 transition-colors">
                Subscribe to get started
              </span>
            </Link>
          </p>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="text-amber-400 hover:text-amber-200 transition-colors flex-shrink-0"
          >
            <X size={15} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function OnboardingChecklist() {
  const alreadyDismissed = localStorage.getItem(ONBOARDING_DISMISSED_KEY) === "1";
  const [fullyHidden, setFullyHidden] = useState(alreadyDismissed);
  const [visible, setVisible] = useState(!alreadyDismissed);
  const [showAllDoneBanner, setShowAllDoneBanner] = useState(false);
  const allDoneHandled = useRef(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["onboarding-status"],
    queryFn: fetchOnboardingStatus,
    retry: false,
    staleTime: 30_000,
  });

  const allDone =
    !!data &&
    data.hasCompanyDetails &&
    data.hasStripeConnect &&
    data.hasClient &&
    data.hasSentQuotation;

  useEffect(() => {
    if (!allDone || allDoneHandled.current || fullyHidden) return;
    allDoneHandled.current = true;
    setShowAllDoneBanner(true);
    const timer = setTimeout(() => {
      setVisible(false);
      localStorage.setItem(ONBOARDING_DISMISSED_KEY, "1");
    }, 2000);
    return () => clearTimeout(timer);
  }, [allDone, fullyHidden]);

  const handleDismiss = () => {
    localStorage.setItem(ONBOARDING_DISMISSED_KEY, "1");
    setVisible(false);
  };

  if (fullyHidden) return null;
  if (isLoading) return null;

  if (isError) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/50 border border-border text-muted-foreground text-sm">
        <AlertCircle size={15} className="flex-shrink-0" />
        <span>Could not load setup checklist.</span>
        <button
          onClick={() => refetch()}
          className="underline underline-offset-2 hover:text-foreground transition-colors text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const steps: {
    key: keyof OnboardingStatus;
    icon: React.ElementType;
    label: string;
    description: string;
    href: string;
    cta: string;
    highlight?: boolean;
  }[] = [
    {
      key: "hasCompanyDetails",
      icon: Building2,
      label: "Set up your company details",
      description: "Add your company name and address so they appear on quotations.",
      href: "/settings#company-info",
      cta: "Go to Settings",
    },
    {
      key: "hasStripeConnect",
      icon: Link2,
      label: "Connect your Stripe account",
      description: "Link Stripe to generate payment links directly on quotations.",
      href: "/settings#stripe-account",
      cta: "Connect Stripe",
      highlight: true,
    },
    {
      key: "hasClient",
      icon: Users,
      label: "Add your first client",
      description: "Create a client record before creating your first quotation.",
      href: "/clients/new",
      cta: "Add Client",
    },
    {
      key: "hasSentQuotation",
      icon: Send,
      label: "Send your first quotation",
      description: "Create a quotation and mark it as Sent to share with a client.",
      href: "/quotations/new",
      cta: "New Quotation",
    },
  ];

  const completedCount = steps.filter((s) => data[s.key]).length;

  return (
    <AnimatePresence onExitComplete={() => setFullyHidden(true)}>
      {visible && (
        <motion.div
          key="onboarding-checklist"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8, height: 0, marginBottom: 0 }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
        >
          {showAllDoneBanner ? (
            <BeamCard className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">You're all set!</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    All setup steps complete. Happy quoting!
                  </p>
                </div>
              </div>
            </BeamCard>
          ) : (
            <BeamCard className="p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                    <Rocket size={15} className="text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Get started</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {completedCount} of {steps.length} steps complete
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleDismiss}
                  aria-label="Dismiss"
                  className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 mt-0.5"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-muted rounded-full mb-4 overflow-hidden">
                <motion.div
                  className="h-full bg-blue-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(completedCount / steps.length) * 100}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>

              <div className="space-y-2">
                {steps.map((step) => {
                  const done = data[step.key];
                  const Icon = step.icon;
                  return (
                    <div
                      key={step.key}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        done
                          ? "border-transparent bg-transparent opacity-50"
                          : step.highlight
                          ? "border-violet-700/50 bg-violet-500/5"
                          : "border-border bg-muted/30"
                      }`}
                    >
                      <div className="flex-shrink-0">
                        {done ? (
                          <CheckCircle2 size={18} className="text-emerald-400" />
                        ) : (
                          <Circle size={18} className="text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium leading-tight ${
                            done ? "line-through text-muted-foreground" : "text-foreground"
                          }`}
                        >
                          {step.label}
                        </p>
                        {!done && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {step.description}
                          </p>
                        )}
                      </div>
                      {!done && (
                        <Link href={step.href}>
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md whitespace-nowrap cursor-pointer transition-colors flex-shrink-0 ${
                              step.highlight
                                ? "bg-violet-600 hover:bg-violet-500 text-white"
                                : "bg-blue-600 hover:bg-blue-500 text-white"
                            }`}
                          >
                            <Icon size={11} />
                            {step.cta}
                          </span>
                        </Link>
                      )}
                      {done && (
                        <div className="flex-shrink-0">
                          <Icon size={14} className="text-muted-foreground/50" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </BeamCard>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function DashboardPage() {
  const { data, isLoading } = useGetDashboard();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
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
  const invoiceStats = data?.invoiceStats;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Paywall banner */}
      <PaywallBanner />

      {/* Onboarding checklist */}
      <OnboardingChecklist />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Overview of your quotation pipeline</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/invoices/new">
            <span className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer">
              <Plus size={15} />
              New Invoice
            </span>
          </Link>
          <Link href="/quotations/new">
            <span className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer">
              <Plus size={15} />
              New Quotation
            </span>
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {([
          { icon: DollarSign, label: "Outstanding", value: formatCurrency(outstanding), color: "text-blue-400", bg: "bg-blue-500/10" },
          { icon: FileText, label: "Total Quotes", value: String(total), color: "text-muted-foreground", bg: "bg-muted" },
          { icon: CheckCircle, label: "Accepted", value: String(counts["ACCEPTED"] ?? 0), color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { icon: Clock, label: "Pending (Sent)", value: String(counts["SENT"] ?? 0), color: "text-amber-400", bg: "bg-amber-500/10" },
        ] as const).map((card, i) => (
          <div key={card.label} className="animate-fade-slide-in" style={{ animationDelay: `${i * 55}ms` }}>
            <StatCard icon={card.icon} label={card.label} value={card.value} color={card.color} bg={card.bg} />
          </div>
        ))}
      </div>

      {/* Invoice stat cards */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Receipt size={14} className="text-violet-400" />
          <h2 className="text-sm font-semibold text-foreground">Invoice Overview</h2>
          <Link href="/invoices">
            <span className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 cursor-pointer transition-colors ml-auto">
              View all <ArrowRight size={11} />
            </span>
          </Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {([
            {
              icon: DollarSign,
              label: "Outstanding",
              value: formatCurrency(invoiceStats?.outstanding ?? "0"),
              color: "text-blue-400",
              bg: "bg-blue-500/10",
            },
            {
              icon: CalendarCheck,
              label: "Paid This Month",
              value: formatCurrency(invoiceStats?.paidThisMonth ?? "0"),
              color: "text-emerald-400",
              bg: "bg-emerald-500/10",
            },
            {
              icon: BadgeDollarSign,
              label: "Total Invoiced",
              value: formatCurrency(invoiceStats?.totalInvoiced ?? "0"),
              color: "text-violet-400",
              bg: "bg-violet-500/10",
            },
            {
              icon: FilePen,
              label: "Draft Invoices",
              value: String(invoiceStats?.draftCount ?? 0),
              color: "text-muted-foreground",
              bg: "bg-muted",
            },
          ] as const).map((card, i) => (
            <div key={card.label} className="animate-fade-slide-in" style={{ animationDelay: `${i * 55}ms` }}>
              <StatCard icon={card.icon} label={card.label} value={card.value} color={card.color} bg={card.bg} />
            </div>
          ))}
        </div>
      </div>

      {/* Chart + recent */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Chart */}
        <div className="lg:col-span-2">
          <BeamCard className="p-5 h-full">
            <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
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
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                No quotations yet
              </div>
            )}
          </BeamCard>
        </div>

        {/* Recent quotations */}
        <div className="lg:col-span-3">
          <BeamCard className="p-5 h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">Recent Quotations</h2>
              <Link href="/quotations">
                <span className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer transition-colors">
                  View all <ArrowRight size={11} />
                </span>
              </Link>
            </div>
            <div className="space-y-2">
              {recent.length === 0 && (
                <p className="text-muted-foreground text-sm py-8 text-center">No quotations yet</p>
              )}
              {recent.map((q, i) => (
                <div key={q.id} className="animate-fade-slide-in" style={{ animationDelay: `${i * 50}ms` }}>
                <Link href={`/quotations/${q.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors cursor-pointer group">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-foreground text-sm font-medium">{q.number}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge(q.status)}`}
                        >
                          {STATUS_LABELS[q.status] ?? q.status}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-xs mt-0.5 truncate">
                        {q.clientName ?? "Unknown client"}
                        {q.clientCompany ? ` · ${q.clientCompany}` : ""}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="text-foreground text-sm font-semibold">
                        {formatCurrency(q.total, q.currency)}
                      </p>
                      <p className="text-muted-foreground text-xs">{formatDate(q.issueDate)}</p>
                    </div>
                  </div>
                </Link>
                </div>
              ))}
            </div>
          </BeamCard>
        </div>
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
    <BeamCard className="p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
        <Icon size={18} className={color} />
      </div>
      <div className="min-w-0">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="text-foreground font-bold text-lg leading-tight truncate">{value}</p>
      </div>
    </BeamCard>
  );
}
