import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";

const queryClient = new QueryClient();

// In SSR (Node.js) there is no window, so we use a trivial static location hook
// that simply returns ['/', noop]. This avoids wouter/memory-location which uses
// useSyncExternalStore — React's renderToString requires getServerSnapshot for
// that API, which memory-location does not provide.
const ssrHook = typeof window === "undefined"
  ? (): [string, (to: string) => void] => ["/", () => undefined]
  : null;

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const base = ssrHook ? "" : (import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "");
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={base} hook={ssrHook ?? undefined}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
