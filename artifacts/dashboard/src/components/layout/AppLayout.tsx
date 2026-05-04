import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { UserButton } from "@clerk/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Users,
  Settings,
  ChevronRight,
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

export default function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col bg-slate-900 border-r border-slate-800">
        {/* Logo */}
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-slate-800">
          <div className="w-7 h-7 bg-blue-500 rounded-md flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M2 12L6 4L10 10L12 7L14 12H2Z" fill="white" />
            </svg>
          </div>
          <span className="font-bold text-white tracking-tight text-sm">QuoteFlow</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive =
              href === "/"
                ? location === "/"
                : location.startsWith(href);
            return (
              <Link key={href} href={href}>
                <span
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

        {/* User */}
        <div className="p-3 border-t border-slate-800 flex items-center gap-2.5">
          <UserButton />
          <span className="text-slate-400 text-xs">Account</span>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
        {/* Breadcrumb bar */}
        <header className="h-14 flex items-center px-6 border-b border-slate-800 flex-shrink-0">
          <Breadcrumb location={location} />
        </header>
        <main className="flex-1 overflow-auto">
          <div className="p-6">{children}</div>
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
    <div className="flex items-center gap-1.5 text-sm">
      <span className="text-slate-500">Home</span>
      {parts.map((part, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <ChevronRight size={12} className="text-slate-600" />
          <span
            className={cn(
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
