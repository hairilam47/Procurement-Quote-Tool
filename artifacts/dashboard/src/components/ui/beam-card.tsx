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
        "bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200",
        className
      )}
    >
      {children}
    </div>
  );
}
