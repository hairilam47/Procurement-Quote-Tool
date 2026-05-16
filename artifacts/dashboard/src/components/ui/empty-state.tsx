import { ElementType, ReactNode } from "react";
import { Link } from "wouter";
import { Plus } from "lucide-react";

interface EmptyStateProps {
  icon: ElementType;
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
    icon?: ElementType;
  };
  children?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action, children }: EmptyStateProps) {
  const ActionIcon = action?.icon ?? Plus;
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
        <Icon size={22} className="text-muted-foreground/60" />
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">{description}</p>
      {action && (
        <Link href={action.href}>
          <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors cursor-pointer">
            <ActionIcon size={14} />
            {action.label}
          </span>
        </Link>
      )}
      {children}
    </div>
  );
}
