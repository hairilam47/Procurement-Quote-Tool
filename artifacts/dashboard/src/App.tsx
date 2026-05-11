import React, { useEffect, useRef, useState } from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, QueryCache, MutationCache, useQueryClient, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "@/components/layout/AppLayout";
import DashboardPage from "@/pages/DashboardPage";
import QuotationsPage from "@/pages/quotations/QuotationsPage";
import QuotationFormPage from "@/pages/quotations/QuotationFormPage";
import QuotationDetailPage from "@/pages/quotations/QuotationDetailPage";
import InvoicesPage from "@/pages/invoices/InvoicesPage";
import InvoiceFormPage from "@/pages/invoices/InvoiceFormPage";
import InvoiceDetailPage from "@/pages/invoices/InvoiceDetailPage";
import ClientsPage from "@/pages/clients/ClientsPage";
import ClientFormPage from "@/pages/clients/ClientFormPage";
import ClientDetailPage from "@/pages/clients/ClientDetailPage";
import SettingsPage from "@/pages/SettingsPage";
import SignInPage from "@/pages/SignInPage";
import SignUpPage from "@/pages/SignUpPage";
import PaymentSuccessPage from "@/pages/PaymentSuccessPage";
import SubscriptionModal from "@/components/SubscriptionModal";
import { authClient } from "@/lib/auth-client";
import { ApiError } from "@workspace/api-client-react";
import { Zap } from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const SHOW_MODAL_EVENT = "kuotflow:show-modal";

function triggerShowModal() {
  window.dispatchEvent(new Event(SHOW_MODAL_EVENT));
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (err) => {
      if (err instanceof ApiError && err.status === 402) {
        triggerShowModal();
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (err) => {
      if (err instanceof ApiError && err.status === 402) {
        triggerShowModal();
      }
    },
  }),
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

interface UserMe {
  id: string;
  stripeSubscriptionId: string | null;
  trialDismissedAt: string | null;
  [key: string]: unknown;
}

interface SubscriptionData {
  subscription: { status: string } | null;
}

async function fetchUserMe(): Promise<UserMe> {
  const res = await fetch("/api/user/me", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch user");
  return res.json();
}

async function fetchSubscription(): Promise<SubscriptionData> {
  const res = await fetch("/api/stripe/subscription", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch subscription");
  return res.json();
}

function CheckoutSuccessBanner() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      queryClient.invalidateQueries({ queryKey: ["stripe-subscription"] });
      queryClient.invalidateQueries({ queryKey: ["user-me"] });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  return null;
}

/**
 * Handles the Google OAuth post-login case where a ?plan= param is carried
 * through the callbackURL (e.g. /app/?plan=monthly). Runs once after mount,
 * kicks off a Stripe checkout session, and cleans up the URL param.
 */
function PostLoginPlanCheckout() {
  const didRun = React.useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    const params = new URLSearchParams(window.location.search);
    const plan = params.get("plan");
    if (!plan) return;

    didRun.current = true;
    // Remove the param from the URL so it doesn't re-trigger on re-renders
    const clean = new URL(window.location.href);
    clean.searchParams.delete("plan");
    window.history.replaceState({}, "", clean.toString());

    fetch("/api/stripe/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ plan }),
    })
      .then((res) => res.json())
      .then((data) => { if (data.url) window.location.href = data.url; })
      .catch(console.error);
  }, []);

  return null;
}

function SyncUser() {
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    async function seed(retries = 3) {
      for (let i = 0; i < retries; i++) {
        try {
          const res = await fetch("/api/user/seed", { method: "POST", credentials: "include" });
          if (res.ok || cancelled) return;
        } catch {
          // network error — wait briefly before retrying
        }
        if (i < retries - 1) await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
      }
    }
    seed();
    return () => { cancelled = true; };
  }, [userId]);

  return null;
}

function CacheInvalidator() {
  const { data: session } = authClient.useSession();
  const qc = useQueryClient();
  const prevRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const uid = session?.user?.id ?? null;
    if (prevRef.current !== undefined && prevRef.current !== uid) {
      qc.clear();
    }
    prevRef.current = uid;
  }, [session?.user?.id, qc]);

  return null;
}

function ProtectedRoutes({ topBanner }: { topBanner?: React.ReactNode }) {
  return (
    <AppLayout topBanner={topBanner}>
      <Switch>
        <Route path="/" component={DashboardPage} />
        <Route path="/quotations" component={QuotationsPage} />
        <Route path="/quotations/new" component={QuotationFormPage} />
        <Route path="/quotations/:id/edit" component={QuotationFormPage} />
        <Route path="/quotations/:id" component={QuotationDetailPage} />
        <Route path="/invoices" component={InvoicesPage} />
        <Route path="/invoices/new" component={InvoiceFormPage} />
        <Route path="/invoices/:id/edit" component={InvoiceFormPage} />
        <Route path="/invoices/:id" component={InvoiceDetailPage} />
        <Route path="/clients" component={ClientsPage} />
        <Route path="/clients/new" component={ClientFormPage} />
        <Route path="/clients/:id/edit" component={ClientFormPage} />
        <Route path="/clients/:id" component={ClientDetailPage} />
        <Route path="/settings" component={SettingsPage} />
      </Switch>
    </AppLayout>
  );
}

function TrialBanner({ onOpenModal }: { onOpenModal: () => void }) {
  return (
    <div className="w-full bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between gap-4 flex-wrap">
      <p className="text-xs text-amber-300 flex items-center gap-1.5">
        <Zap size={12} className="flex-shrink-0" />
        You're on a free trial — 1 quotation, 1 invoice, and 1 client allowed.
      </p>
      <button
        onClick={onOpenModal}
        className="text-xs font-semibold text-amber-300 hover:text-amber-200 border border-amber-500/40 hover:border-amber-400 rounded px-3 py-1 transition flex-shrink-0"
      >
        Subscribe to unlock everything
      </button>
    </div>
  );
}

function AuthenticatedApp() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);

  const { data: userMe } = useQuery({
    queryKey: ["user-me"],
    queryFn: fetchUserMe,
    staleTime: 60_000,
    retry: 1,
  });

  const { data: subscriptionData } = useQuery({
    queryKey: ["stripe-subscription"],
    queryFn: fetchSubscription,
    staleTime: 60_000,
    retry: false,
    enabled: !!userMe?.stripeSubscriptionId,
  });

  const hasActiveSubscription = !!userMe?.stripeSubscriptionId &&
    (!subscriptionData || subscriptionData.subscription?.status === "active" || subscriptionData.subscription?.status === "trialing");

  const trialDismissed = !!userMe?.trialDismissedAt;
  const isTrialMode = !hasActiveSubscription && trialDismissed;

  // Auto-open modal on login when user has no subscription and hasn't dismissed.
  // Also honour a localStorage fallback set when the server dismiss call fails.
  useEffect(() => {
    if (userMe && !hasActiveSubscription && !trialDismissed) {
      const localDismissed = (() => {
        try { return localStorage.getItem("trial_dismissed_local") === "1"; } catch { return false; }
      })();
      if (!localDismissed) setModalOpen(true);
    }
  }, [userMe, hasActiveSubscription, trialDismissed]);

  // Listen for 402 events from QueryClient error handlers
  useEffect(() => {
    function handleShowModal() {
      setModalOpen(true);
    }
    window.addEventListener(SHOW_MODAL_EVENT, handleShowModal);
    return () => window.removeEventListener(SHOW_MODAL_EVENT, handleShowModal);
  }, []);

  function handleModalClose() {
    setModalOpen(false);
    qc.invalidateQueries({ queryKey: ["user-me"] });
  }

  const banner = isTrialMode
    ? <TrialBanner onOpenModal={() => setModalOpen(true)} />
    : undefined;

  return (
    <>
      <SyncUser />
      <CheckoutSuccessBanner />
      <PostLoginPlanCheckout />
      <ProtectedRoutes topBanner={banner} />
      {modalOpen && <SubscriptionModal onClose={handleModalClose} />}
    </>
  );
}

function AppRoutes() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route path="/pay/success" component={PaymentSuccessPage} />
      <Route>
        {session?.user ? (
          <AuthenticatedApp />
        ) : (
          <Redirect to="/sign-in" />
        )}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <CacheInvalidator />
          <AppRoutes />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </WouterRouter>
  );
}

export default App;
