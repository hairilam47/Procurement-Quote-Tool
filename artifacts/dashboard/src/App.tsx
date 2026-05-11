import { useEffect, useRef } from "react";
import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
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
import { authClient } from "@/lib/auth-client";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

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

function ProtectedRoutes() {
  return (
    <AppLayout>
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
          <>
            <SyncUser />
            <ProtectedRoutes />
          </>
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
