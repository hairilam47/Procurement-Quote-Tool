import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface FadeInProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "left" | "right";
}

export function FadeIn({
  children,
  className,
  delay = 0,
  direction = "up",
}: FadeInProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);

    const handleChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handleChange);

    let observer: IntersectionObserver | null = null;

    if (!mq.matches) {
      const el = ref.current;
      if (el) {
        observer = new IntersectionObserver(
          ([entry]) => {
            if (entry.isIntersecting) {
              setVisible(true);
              observer?.disconnect();
            }
          },
          { threshold: 0.1 }
        );
        observer.observe(el);
      }
    } else {
      setVisible(true);
    }

    return () => {
      mq.removeEventListener("change", handleChange);
      observer?.disconnect();
    };
  }, []);

  const initialTransform =
    direction === "up"
      ? "translateY(28px)"
      : direction === "left"
      ? "translateX(-28px)"
      : "translateX(28px)";

  const style = reducedMotion
    ? undefined
    : {
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : initialTransform,
        transition: `opacity 0.55s ease ${delay}ms, transform 0.55s ease ${delay}ms`,
        willChange: visible ? "auto" : ("opacity, transform" as const),
      };

  return (
    <div ref={ref} className={cn(className)} style={style}>
      {children}
    </div>
  );
}
