"use client";

import {
  Children,
  type CSSProperties,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/components/ui";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

/**
 * Phantom-style motion
 * ease: cubic-bezier(0.22, 1, 0.36, 1)
 * type: clip line rise · scroll: soft y + opacity · hover: 0.4s transform
 */

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Stagger index (0-based) for multi-element groups */
  delay?: number;
  /** Extra delay in ms before this element starts */
  delayMs?: number;
  /** y offset in px when hidden */
  y?: number;
  /** Once visible, stay visible */
  once?: boolean;
  as?: "div" | "span" | "li" | "section" | "p" | "h1" | "h2" | "h3";
};

export function Reveal({
  children,
  className,
  delay = 0,
  delayMs,
  y = 20,
  once = true,
  as: Tag = "div",
}: RevealProps) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (reduced) {
      setShown(true);
      return;
    }
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShown(true);
          if (once) io.disconnect();
        } else if (!once) {
          setShown(false);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced, once]);

  const ms = delayMs ?? delay * 80;

  return (
    <Tag
      ref={ref as never}
      className={cn("reveal", shown && "reveal-in", className)}
      style={
        {
          "--reveal-y": `${y}px`,
          "--reveal-delay": reduced ? "0ms" : `${ms}ms`,
        } as CSSProperties
      }
    >
      {children}
    </Tag>
  );
}

type TypeRevealProps = {
  /** One string per visual line */
  lines: string[];
  className?: string;
  lineClassName?: string;
  /** Stagger between lines (ms) — Phantom ~70–100 */
  staggerMs?: number;
  /** Play on mount (hero) vs wait for scroll */
  eager?: boolean;
  as?: "h1" | "h2" | "h3" | "p" | "div";
  id?: string;
};

/**
 * Phantom-style type: each line clipped, rises with long ease.
 * Not a typewriter — a soft line-by-line lift.
 */
export function TypeReveal({
  lines,
  className,
  lineClassName,
  staggerMs = 90,
  eager = false,
  as: Tag = "h1",
  id,
}: TypeRevealProps) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (reduced) {
      setShown(true);
      return;
    }
    if (eager) {
      // Next frame so CSS transition runs
      const t = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(t);
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.2, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced, eager]);

  return (
    <Tag
      id={id}
      ref={ref as never}
      className={cn("type-reveal", shown && "type-reveal-in", className)}
      aria-label={lines.join(" ")}
    >
      {lines.map((line, i) => (
        <span key={`${i}-${line}`} className={cn("type-reveal-line", lineClassName)}>
          <span
            className="type-reveal-inner"
            style={
              {
                "--type-delay": reduced ? "0ms" : `${i * staggerMs}ms`,
              } as CSSProperties
            }
          >
            {line}
          </span>
        </span>
      ))}
    </Tag>
  );
}

/** Stagger children that each wrap in Reveal */
export function RevealGroup({
  children,
  className,
  stagger = 80,
  y = 16,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  y?: number;
}) {
  return (
    <div className={className}>
      {Children.map(children, (child, i) => (
        <Reveal delayMs={i * stagger} y={y}>
          {child}
        </Reveal>
      ))}
    </div>
  );
}
