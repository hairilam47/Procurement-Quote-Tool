import { cn } from "@/lib/utils";

export function BeamCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-card border border-card-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 dark:bg-white/[0.025] dark:border-white/[0.07] dark:backdrop-blur-sm",
        className
      )}
    >
      {children}
    </div>
  );
}
