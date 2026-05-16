import { ReactNode } from "react";
import { Link } from "wouter";
import { Plus } from "lucide-react";

export interface PageAction {
  label: string;
  href: string;
  icon?: React.ElementType;
  variant?: "primary" | "secondary";
  testId?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: PageAction[];
  children?: ReactNode;
}

const VARIANT_CLASSES = {
  primary: "bg-blue-600 hover:bg-blue-500 text-white",
  secondary: "bg-violet-600 hover:bg-violet-500 text-white",
};

export function PageHeader({ title, subtitle, actions, children }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
        {subtitle && (
          <p className="text-muted-foreground text-sm mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {children}
        {actions?.map((action) => {
          const Icon = action.icon ?? Plus;
          return (
            <Link key={action.href} href={action.href}>
              <span
                data-testid={action.testId}
                className={`inline-flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-lg transition-colors cursor-pointer ${VARIANT_CLASSES[action.variant ?? "primary"]}`}
              >
                <Icon size={14} />
                {action.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
