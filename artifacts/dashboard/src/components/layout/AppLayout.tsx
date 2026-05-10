import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { UserButton } from "@clerk/react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Users,
  Settings,
  ChevronRight,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
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

function NavLinks({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const [location] = useLocation();
  return (
    <nav className="flex-1 px-2 py-3 space-y-0.5">
      {navItems.map(({ href, icon: Icon, label }) => {
        const isActive =
          href === "/" ? location === "/" : location.startsWith(href);
        return (
          <Link key={href} href={href} onClick={onNavigate}>
            <span
              data-testid={`nav-${label.toLowerCase()}`}
              title={collapsed ? label : undefined}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-all cursor-pointer",
                collapsed ? "justify-center px-2" : "",
                isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon size={15} className="flex-shrink-0" />
              {!collapsed && (
                <span className="truncate">{label}</span>
              )}
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
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("sidebar-collapsed") === "true";
    } catch {
      return false;
    }
  });
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme !== "light";

  useEffect(() => {
    try {
      localStorage.setItem("sidebar-collapsed", String(collapsed));
    } catch {
      // ignore
    }
  }, [collapsed]);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
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
          "fixed md:static inset-y-0 left-0 z-30 flex-shrink-0 flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          collapsed ? "w-14" : "w-56"
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            "h-14 flex items-center border-b border-sidebar-border flex-shrink-0",
            collapsed ? "px-0 justify-center" : "gap-2.5 px-4"
          )}
        >
          <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center flex-shrink-0">
            <span className="text-white font-black text-sm leading-none select-none">K</span>
          </div>
          {!collapsed && (
            <span className="font-bold tracking-tight text-sm truncate">
              <span className="text-foreground">Kuot</span><span className="text-blue-500">Flow</span>
            </span>
          )}
          {/* Mobile close button */}
          {!collapsed && (
            <button
              className="ml-auto text-muted-foreground hover:text-foreground md:hidden"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <NavLinks
          collapsed={collapsed}
          onNavigate={() => setMobileOpen(false)}
        />

        {/* User + collapse toggle */}
        <div
          className={cn(
            "p-3 border-t border-sidebar-border flex items-center",
            collapsed ? "flex-col gap-3 justify-center" : "gap-2.5"
          )}
        >
          <UserButton />
          {!collapsed && (
            <span className="text-muted-foreground text-xs flex-1 truncate">
              Account
            </span>
          )}
          {/* Theme toggle */}
          <button
            className="flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted p-1"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            title={isDark ? "Light mode" : "Dark mode"}
          >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          {/* Desktop collapse toggle */}
          <button
            className="hidden md:flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted p-1"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen size={15} />
            ) : (
              <PanelLeftClose size={15} />
            )}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background min-w-0">
        {/* Top bar */}
        <header className="h-14 flex items-center px-4 md:px-6 border-b border-border flex-shrink-0 gap-3">
          <button
            className="md:hidden text-muted-foreground hover:text-foreground transition-colors"
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
    return <span className="text-sm font-medium text-foreground">Dashboard</span>;
  }
  return (
    <div className="flex items-center gap-1.5 text-sm min-w-0">
      <span className="text-muted-foreground hidden sm:inline">Home</span>
      {parts.map((part, i) => (
        <span key={i} className="flex items-center gap-1.5 min-w-0">
          <ChevronRight size={12} className="text-muted-foreground/60 flex-shrink-0 hidden sm:inline" />
          <span
            className={cn(
              "truncate",
              i === parts.length - 1
                ? "text-foreground font-medium"
                : "text-muted-foreground"
            )}
          >
            {part.charAt(0).toUpperCase() + part.slice(1)}
          </span>
        </span>
      ))}
    </div>
  );
}
