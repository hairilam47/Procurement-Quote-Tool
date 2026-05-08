import { BorderBeam } from "border-beam";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export function BeamCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  return (
    <BorderBeam
      colorVariant={isDark ? "colorful" : "ocean"}
      theme={isDark ? "dark" : "light"}
      className={cn("bg-card border border-border rounded-xl overflow-hidden", className)}
    >
      {children}
    </BorderBeam>
  );
}
