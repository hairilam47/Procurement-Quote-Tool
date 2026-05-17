import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

interface MarketingLayoutProps {
  children: React.ReactNode;
}

export function MarketingLayout({ children }: MarketingLayoutProps) {
  return (
    <div className="min-h-[100dvh] flex flex-col font-sans selection:bg-primary/20">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <img
              src={`${import.meta.env.BASE_URL}kuotflow-logo.svg`}
              alt="KuotFlow"
              className="h-10 w-auto"
            />
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How it works</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
          </nav>

          <div className="flex items-center gap-4">
            <a href="/app/sign-in" data-testid="nav-login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
              Log in
            </a>
            <a href="/app/sign-up" data-testid="nav-signup">
              <Button size="sm" className="font-medium rounded-full px-5">
                Sign up
              </Button>
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>

      <footer className="border-t border-border/40 bg-muted/30 pt-16 pb-8">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
            <div className="col-span-2 lg:col-span-2">
              <Link href="/" className="flex items-center mb-4">
                <img
                  src={`${import.meta.env.BASE_URL}kuotflow-logo.svg`}
                  alt="KuotFlow"
                  className="h-9 w-auto"
                />
              </Link>
              <p className="text-muted-foreground text-sm max-w-xs">
                Professional quotation management for IT service providers. Win more work with better quotes.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4 text-sm">Product</h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground">Features</a></li>
                <li><a href="#pricing" className="hover:text-foreground">Pricing</a></li>
                <li><a href="#faq" className="hover:text-foreground">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4 text-sm">Account</h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><a href="/app/sign-up" className="hover:text-foreground">Sign up free</a></li>
                <li><a href="/app/sign-in" className="hover:text-foreground">Log in</a></li>
                <li><a href="/app" className="hover:text-foreground">Dashboard</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4 text-sm">Company</h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><a href="#how-it-works" className="hover:text-foreground">How it works</a></li>
                <li><a href="/privacy" className="hover:text-foreground">Privacy</a></li>
                <li><a href="/terms" className="hover:text-foreground">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border/40 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} KuotFlow. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground italic">Quote That Close</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
