import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { UserButton } from "@clerk/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Users,
  Settings,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/quotations", icon: FileText, label: "Quotations" },
  { href: "/clients", icon: Users, label: "Clients" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

interface AppLayoutProps {
  children: ReactNode;
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const [location] = useLocation();
  return (
    <nav className="flex-1 px-2 py-3 space-y-0.5">
      {navItems.map(({ href, icon: Icon, label }) => {
        const isActive =
          href === "/"
            ? location === "/"
            : location.startsWith(href);
        return (
          <Link key={href} href={href} onClick={onNavigate}>
            <span
              data-testid={`nav-${label.toLowerCase()}`}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-all cursor-pointer",
                isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              <Icon size={15} />
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — desktop always visible, mobile slides in */}
      <aside
        className={cn(
          "fixed md:static inset-y-0 left-0 z-30 w-56 flex-shrink-0 flex flex-col bg-slate-900 border-r border-slate-800 transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-slate-800">
          <div className="w-7 h-7 bg-blue-500 rounded-md flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M2 12L6 4L10 10L12 7L14 12H2Z" fill="white" />
            </svg>
          </div>
          <span className="font-bold text-white tracking-tight text-sm">QuoteFlow</span>
          <button
            className="ml-auto text-slate-400 hover:text-white md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X size={16} />
          </button>
        </div>

        <NavLinks onNavigate={() => setMobileOpen(false)} />

        {/* User */}
        <div className="p-3 border-t border-slate-800 flex items-center gap-2.5">
          <UserButton />
          <span className="text-slate-400 text-xs">Account</span>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-950 min-w-0">
        {/* Top bar */}
        <header className="h-14 flex items-center px-4 md:px-6 border-b border-slate-800 flex-shrink-0 gap-3">
          <button
            className="md:hidden text-slate-400 hover:text-white transition-colors"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            data-testid="mobile-menu-btn"
          >
            <Menu size={20} />
          </button>
          <Breadcrumb location={location} />
        </header>
        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

function Breadcrumb({ location }: { location: string }) {
  const parts = location.split("/").filter(Boolean);
  if (parts.length === 0) {
    return <span className="text-sm font-medium text-white">Dashboard</span>;
  }
  return (
    <div className="flex items-center gap-1.5 text-sm min-w-0">
      <span className="text-slate-500 hidden sm:inline">Home</span>
      {parts.map((part, i) => (
        <span key={i} className="flex items-center gap-1.5 min-w-0">
          <ChevronRight size={12} className="text-slate-600 flex-shrink-0 hidden sm:inline" />
          <span
            className={cn(
              "truncate",
              i === parts.length - 1
                ? "text-white font-medium"
                : "text-slate-500"
            )}
          >
            {part.charAt(0).toUpperCase() + part.slice(1)}
          </span>
        </span>
      ))}
    </div>
  );
}
