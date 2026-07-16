"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/components/ui";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

type NumberTickerProps = {
  value: number;
  /** Appended after formatted number, e.g. " XLM" */
  suffix?: string;
  className?: string;
  durationMs?: number;
  maximumFractionDigits?: number;
};

/**
 * Ease-out number ticker. Snaps instantly under prefers-reduced-motion.
 */
export function NumberTicker({
  value,
  suffix = "",
  className,
  durationMs = 480,
  maximumFractionDigits = 7,
}: NumberTickerProps) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      fromRef.current = value;
      return;
    }

    const from = fromRef.current;
    const to = value;
    if (from === to) return;

    const start = performance.now();
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // ease-out cubic-bezier-ish: 1 - (1-t)^3
      const eased = 1 - (1 - t) ** 3;
      setDisplay(from + (to - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
        setDisplay(to);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, durationMs, reduced]);

  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
  }).format(display);

  return (
    <span className={cn("tabular-nums", className)}>
      {formatted}
      {suffix}
    </span>
  );
}
