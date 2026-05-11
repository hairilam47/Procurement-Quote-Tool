import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Check, Loader2, Zap } from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Price {
  price_id: string;
  unit_amount: number;
  currency: string;
  recurring: { interval: string; interval_count: number } | null;
  active: boolean;
}

interface SubscriptionModalProps {
  onClose: () => void;
}

async function fetchPrices(): Promise<{ data: Price[] }> {
  const res = await fetch(`${basePath}/api/stripe/prices`);
  if (!res.ok) throw new Error("Failed to fetch prices");
  return res.json();
}

function formatInterval(price: Price): string {
  const interval = price.recurring?.interval ?? "month";
  const count = price.recurring?.interval_count ?? 1;
  if (count === 1) {
    const labels: Record<string, string> = {
      day: "Daily",
      week: "Weekly",
      month: "Monthly",
      year: "Yearly",
    };
    return labels[interval] ?? interval;
  }
  return `Every ${count} ${interval}s`;
}

function intervalOrder(price: Price): number {
  const order: Record<string, number> = { day: 0, week: 1, month: 2, year: 3 };
  return order[price.recurring?.interval ?? "month"] ?? 99;
}

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

export default function SubscriptionModal({ onClose }: SubscriptionModalProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["stripe-prices-modal"],
    queryFn: fetchPrices,
    retry: 1,
    staleTime: 60_000,
  });

  const prices = (data?.data ?? [])
    .filter((p) => p.active)
    .sort((a, b) => intervalOrder(a) - intervalOrder(b));

  const defaultSelected = prices.find((p) => p.recurring?.interval === "month") ?? prices[0];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [dismissLoading, setDismissLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (defaultSelected && selectedId === null) {
      setSelectedId(defaultSelected.price_id);
    }
  }, [defaultSelected, selectedId]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  async function handleSkip() {
    setDismissLoading(true);
    try {
      await fetch(`${basePath}/api/user/dismiss-trial`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // best-effort — dismiss locally even if request fails
    } finally {
      setDismissLoading(false);
      onClose();
    }
  }

  async function handleSubscribe() {
    const selected = prices.find((p) => p.price_id === selectedId);
    if (!selected) return;

    const interval = selected.recurring?.interval ?? "month";
    const planMap: Record<string, string> = {
      day: "daily",
      week: "weekly",
      month: "monthly",
      year: "yearly",
    };
    const plan = planMap[interval] ?? "monthly";

    setCheckoutLoading(true);
    setError("");
    try {
      const res = await fetch(`${basePath}/api/stripe/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ plan }),
      });
      const json = await res.json() as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        setError(json.error ?? "Failed to start checkout. Please try again.");
        setCheckoutLoading(false);
        return;
      }
      window.location.href = json.url;
    } catch {
      setError("Failed to start checkout. Please try again.");
      setCheckoutLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div
        className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sub-modal-title"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="px-8 pt-8 pb-6 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-xl bg-blue-600/20 flex items-center justify-center">
            <Zap size={22} className="text-blue-400" />
          </div>
          <h2 id="sub-modal-title" className="text-2xl font-bold text-white mb-2">
            Unlock KuotFlow
          </h2>
          <p className="text-slate-400 text-sm">
            Choose a plan to create unlimited quotations, invoices, and clients.
          </p>
        </div>

        {/* Plan cards */}
        <div className="px-8 pb-4">
          {isLoading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={24} className="animate-spin text-blue-400" />
            </div>
          )}
          {isError && (
            <p className="text-center text-sm text-red-400 py-6">
              Unable to load pricing. Please try again later.
            </p>
          )}
          {!isLoading && !isError && prices.length === 0 && (
            <p className="text-center text-sm text-slate-400 py-6">
              No plans available yet. Contact support to subscribe.
            </p>
          )}
          {!isLoading && !isError && prices.length > 0 && (
            <div className="space-y-2">
              {prices.map((price) => {
                const isSelected = price.price_id === selectedId;
                return (
                  <button
                    key={price.price_id}
                    onClick={() => setSelectedId(price.price_id)}
                    className={`w-full flex items-center justify-between rounded-xl px-5 py-4 border transition text-left ${
                      isSelected
                        ? "border-blue-500 bg-blue-600/10 ring-1 ring-blue-500"
                        : "border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${
                          isSelected ? "border-blue-400 bg-blue-400" : "border-slate-600"
                        }`}
                      >
                        {isSelected && <Check size={10} className="text-white" strokeWidth={3} />}
                      </div>
                      <span className="text-sm font-medium text-white">{formatInterval(price)}</span>
                    </div>
                    <span className="text-sm font-semibold text-white">
                      {formatAmount(price.unit_amount, price.currency)}
                      <span className="text-slate-400 font-normal text-xs ml-1">
                        /{price.recurring?.interval ?? "mo"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {error && (
            <p className="mt-3 text-sm text-red-400 text-center">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 pb-8 pt-2 flex items-center justify-between gap-4">
          <button
            onClick={handleSkip}
            disabled={dismissLoading}
            className="text-sm text-slate-500 hover:text-slate-300 transition disabled:opacity-50"
          >
            {dismissLoading ? "Saving…" : "Skip for now"}
          </button>

          <button
            onClick={handleSubscribe}
            disabled={checkoutLoading || !selectedId || prices.length === 0}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {checkoutLoading && <Loader2 size={14} className="animate-spin" />}
            {checkoutLoading ? "Redirecting…" : "Subscribe"}
          </button>
        </div>
      </div>
    </div>
  );
}
