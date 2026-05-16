import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Receipt,
  FileCheck,
  Users,
  Settings,
  ChevronRight,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
  LogOut,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";

function useNoIndex() {
  useEffect(() => {
    let tag = document.querySelector('meta[name="robots"][data-app-layout]') as HTMLMetaElement | null;
    if (!tag) {
      tag = document.createElement("meta");
      tag.setAttribute("name", "robots");
      tag.setAttribute("data-app-layout", "true");
      document.head.appendChild(tag);
    }
    tag.setAttribute("content", "noindex, nofollow");
    return () => {
      tag?.parentNode?.removeChild(tag!);
    };
  }, []);
}

const PRIMARY_NAV = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/quotations", icon: FileText, label: "Quotations" },
  { href: "/invoices", icon: Receipt, label: "Invoices" },
  { href: "/receipts", icon: FileCheck, label: "Receipts" },
  { href: "/clients", icon: Users, label: "Clients" },
];

const SECONDARY_NAV = [
  { href: "/settings", icon: Settings, label: "Settings" },
];

interface AppLayoutProps {
  children: ReactNode;
  topBanner?: ReactNode;
}

function NavItem({
  href,
  icon: Icon,
  label,
  collapsed,
  active,
  onNavigate,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  collapsed: boolean;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link href={href} onClick={onNavigate}>
      <span
        data-testid={`nav-${label.toLowerCase()}`}
        title={collapsed ? label : undefined}
        className={cn(
          "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all cursor-pointer",
          collapsed ? "justify-center" : "",
          active
            ? "bg-blue-500/12 text-blue-400 font-medium"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/60 font-normal",
        )}
      >
        <Icon
          size={16}
          className={cn("flex-shrink-0", active ? "text-blue-400" : "text-current")}
        />
        {!collapsed && <span className="truncate">{label}</span>}
      </span>
    </Link>
  );
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
    <nav className="flex-1 px-2 py-3 flex flex-col gap-4">
      <div className="space-y-0.5">
        {PRIMARY_NAV.map(({ href, icon, label }) => {
          const active = href === "/" ? location === "/" : location.startsWith(href);
          return (
            <NavItem
              key={href}
              href={href}
              icon={icon}
              label={label}
              collapsed={collapsed}
              active={active}
              onNavigate={onNavigate}
            />
          );
        })}
      </div>

      {!collapsed && (
        <div className="h-px bg-border/60 mx-1" />
      )}

      <div className="space-y-0.5">
        {SECONDARY_NAV.map(({ href, icon, label }) => {
          const active = location.startsWith(href);
          return (
            <NavItem
              key={href}
              href={href}
              icon={icon}
              label={label}
              collapsed={collapsed}
              active={active}
              onNavigate={onNavigate}
            />
          );
        })}
      </div>
    </nav>
  );
}

function UserAvatar() {
  const { data: session } = authClient.useSession();
  const [, setLocation] = useLocation();
  const user = session?.user;

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : (user?.email?.[0] ?? "?").toUpperCase();

  const displayName = user?.name || user?.email?.split("@")[0] || "Account";

  const handleSignOut = async () => {
    await authClient.signOut();
    setLocation("/sign-in");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-semibold flex items-center justify-center hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 flex-shrink-0"
          title={user?.email ?? "Account"}
          aria-label="Account menu"
        >
          {initials}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-52">
        {user?.email && (
          <>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                {user.name && (
                  <p className="text-sm font-medium leading-none truncate">{user.name}</p>
                )}
                <p className="text-xs leading-none text-muted-foreground truncate">{user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem
          onClick={handleSignOut}
          className="text-destructive focus:text-destructive cursor-pointer"
        >
          <LogOut size={14} className="mr-2" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function AppLayout({ children, topBanner }: AppLayoutProps) {
  useNoIndex();
  const { data: session } = authClient.useSession();
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

  const user = session?.user;
  const displayName = user?.name || user?.email?.split("@")[0] || "Account";

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

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed md:static inset-y-0 left-0 z-30 flex-shrink-0 flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          collapsed ? "w-[52px]" : "w-[220px]",
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            "h-14 flex items-center border-b border-sidebar-border flex-shrink-0",
            collapsed ? "px-0 justify-center" : "gap-2.5 px-4",
          )}
        >
          {collapsed ? (
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-sm leading-none select-none">K</span>
            </div>
          ) : (
            <>
              <img
                src={`${import.meta.env.BASE_URL}kuotflow-logo-dark.svg`}
                alt="KuotFlow"
                className="h-7 w-auto flex-1 min-w-0 object-left object-contain"
              />
              <button
                className="ml-auto text-muted-foreground hover:text-foreground md:hidden flex-shrink-0"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <X size={16} />
              </button>
            </>
          )}
        </div>

        <NavLinks
          collapsed={collapsed}
          onNavigate={() => setMobileOpen(false)}
        />

        {/* Footer: user + controls */}
        <div
          className={cn(
            "p-2.5 border-t border-sidebar-border flex items-center gap-2",
            collapsed ? "flex-col justify-center" : "flex-row",
          )}
        >
          <UserAvatar />

          {!collapsed && (
            <span className="text-foreground text-xs font-medium flex-1 truncate">
              {displayName}
            </span>
          )}

          <div className={cn("flex items-center", collapsed ? "flex-col gap-1.5" : "gap-1 ml-auto")}>
            <button
              className="flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted p-1.5"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              title={isDark ? "Light mode" : "Dark mode"}
            >
              {isDark ? <Sun size={14} /> : <Moon size={14} />}
            </button>

            <button
              className="hidden md:flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted p-1.5"
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background min-w-0">
        {topBanner}
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
          <div className="p-5 md:p-7">{children}</div>
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
              "truncate capitalize",
              i === parts.length - 1
                ? "text-foreground font-medium"
                : "text-muted-foreground",
            )}
          >
            {part}
          </span>
        </span>
      ))}
    </div>
  );
}
