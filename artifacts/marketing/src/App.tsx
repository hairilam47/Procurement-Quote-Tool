import { Switch, Route, Router as WouterRouter } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";

const queryClient = new QueryClient();

// SSR-safe: create memory location once at module level only in Node/SSR environment
const ssrLocation = typeof window === "undefined" ? memoryLocation({ path: "/" }) : null;

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const base = ssrLocation ? "" : (import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "");
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={base} hook={ssrLocation?.hook}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
