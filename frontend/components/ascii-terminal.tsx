"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/components/ui";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const DEFAULT_LINES = [
  "DG//drip  ─────────────────────────",
  "vault     research-agent",
  "status    ACTIVE",
  "token     XLM",
  "budget    12,000.00",
  "vested    7,200.00",
  "claimable 2,100.00",
  "rate      150 / day",
  "max/call  500",
  "velocity  1,200 / 3,600s",
  "payees    [3 allowlisted]",
  "",
  "> drawdown 250 → api.service",
  "  ok · claimable 1,850.00",
  "",
  "> vel_check window",
  "  ok · under cap",
];

type AsciiTerminalProps = {
  lines?: string[];
  className?: string;
  /** ms between characters when typing a line */
  charMs?: number;
  /** pause after each finished line */
  linePauseMs?: number;
  /** allow click to replay */
  interactive?: boolean;
};

/**
 * Typewriter + stepped lines + blink cursor.
 * Reduced motion: full text immediately, solid cursor.
 */
export function AsciiTerminal({
  lines = DEFAULT_LINES,
  className,
  charMs = 12,
  linePauseMs = 70,
  interactive = true,
}: AsciiTerminalProps) {
  const reduced = useReducedMotion();
  const [runId, setRunId] = useState(0);
  const [visible, setVisible] = useState("");
  const [done, setDone] = useState(false);
  const cancelRef = useRef(false);

  const fullText = useMemo(() => lines.join("\n"), [lines]);

  const play = useCallback(async () => {
    cancelRef.current = false;
    setDone(false);

    if (reduced) {
      setVisible(fullText);
      setDone(true);
      return;
    }

    setVisible("");
    let out = "";

    for (let li = 0; li < lines.length; li++) {
      if (cancelRef.current) return;
      const line = lines[li] ?? "";
      for (let ci = 0; ci < line.length; ci++) {
        if (cancelRef.current) return;
        out += line[ci];
        setVisible(out);
        await sleep(charMs);
      }
      if (li < lines.length - 1) {
        out += "\n";
        setVisible(out);
        await sleep(linePauseMs);
      }
    }

    if (!cancelRef.current) setDone(true);
  }, [charMs, fullText, linePauseMs, lines, reduced]);

  useEffect(() => {
    cancelRef.current = false;
    void play();
    return () => {
      cancelRef.current = true;
    };
  }, [play, runId]);

  function replay() {
    if (!interactive) return;
    cancelRef.current = true;
    setRunId((n) => n + 1);
  }

  return (
    <div
      className={cn(
        "panel relative overflow-hidden p-6 md:p-8",
        interactive && "cursor-pointer select-none",
        className,
      )}
      role="img"
      aria-label="DripGuard terminal demo"
      onClick={interactive ? replay : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                replay();
              }
            }
          : undefined
      }
      tabIndex={interactive ? 0 : undefined}
    >
      <pre className="font-mono text-[11px] leading-relaxed text-muted md:text-xs">
        {visible}
        <span
          className={cn(
            "inline-block w-[0.55em] translate-y-px bg-fg align-baseline",
            done && !reduced && "ascii-cursor-blink",
            reduced && done && "opacity-70",
            !done && "opacity-90",
          )}
          aria-hidden
        >
          ▌
        </span>
      </pre>
      {interactive ? (
        <p className="mono-meta mt-4 text-[10px] text-muted/70">click to replay</p>
      ) : null}
    </div>
  );
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
