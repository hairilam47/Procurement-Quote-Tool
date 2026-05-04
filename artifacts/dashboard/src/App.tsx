import { useEffect, useRef } from "react";
import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ClerkProvider, Show, useAuth, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "@/components/layout/AppLayout";
import DashboardPage from "@/pages/DashboardPage";
import QuotationsPage from "@/pages/quotations/QuotationsPage";
import QuotationFormPage from "@/pages/quotations/QuotationFormPage";
import QuotationDetailPage from "@/pages/quotations/QuotationDetailPage";
import ClientsPage from "@/pages/clients/ClientsPage";
import ClientFormPage from "@/pages/clients/ClientFormPage";
import ClientDetailPage from "@/pages/clients/ClientDetailPage";
import SettingsPage from "@/pages/SettingsPage";
import SignInPage from "@/pages/SignInPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const clerkPubKey = publishableKeyFromHost(
  typeof window !== "undefined" ? window.location.hostname : "",
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

// Empty in dev, auto-set in production
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

function SyncUser() {
  const { isSignedIn, userId } = useAuth();
  useEffect(() => {
    if (!isSignedIn) return;
    fetch("/api/auth/seed", { method: "POST", credentials: "include" });
  }, [isSignedIn, userId]);
  return null;
}

function CacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsub = addListener(({ user }) => {
      const uid = user?.id ?? null;
      if (prevRef.current !== undefined && prevRef.current !== uid) {
        qc.clear();
      }
      prevRef.current = uid;
    });
    return unsub;
  }, [addListener, qc]);
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
  return (
    <Switch>
      {/* Sign-in route — always accessible */}
      <Route path="/sign-in/*?" component={SignInPage} />

      {/* All other routes — protected */}
      <Route>
        <Show when="signed-in">
          <SyncUser />
          <ProtectedRoutes />
        </Show>
        <Show when="signed-out">
          <Redirect to="/sign-in" />
        </Show>
      </Route>
    </Switch>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-in`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <CacheInvalidator />
          <AppRoutes />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
