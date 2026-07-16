"use client";

import { useEffect, useState } from "react";
import { explorerTxUrl } from "@/lib/config";
import { cn } from "@/components/ui";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

export type TxStatusKind = "idle" | "pending" | "success" | "error" | "warning";

export type TxStatusState = {
  kind: TxStatusKind;
  title?: string;
  message?: string | null;
  hash?: string | null;
};

function prefixFor(kind: Exclude<TxStatusKind, "idle">) {
  if (kind === "pending") return "…";
  if (kind === "success") return "ok";
  if (kind === "warning") return "!!";
  return "err";
}

export function TxStatusBanner({
  status,
  className,
}: {
  status: TxStatusState | null;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [shownPrefix, setShownPrefix] = useState("");

  useEffect(() => {
    if (!status || status.kind === "idle") {
      setShownPrefix("");
      return;
    }
    const target = prefixFor(status.kind);
    if (reduced) {
      setShownPrefix(target);
      return;
    }
    // Stepped typewriter for short mono prefix
    setShownPrefix("");
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setShownPrefix(target.slice(0, i));
      if (i >= target.length) window.clearInterval(id);
    }, 40);
    return () => window.clearInterval(id);
  }, [status, reduced]);

  if (!status || status.kind === "idle") return null;

  const styles: Record<Exclude<TxStatusKind, "idle">, string> = {
    pending: "border-line bg-surface text-fg",
    success: "border-success/30 bg-success/5 text-fg",
    error: "border-danger/30 bg-danger/5 text-fg",
    warning: "border-warning/30 bg-warning/5 text-fg",
  };

  return (
    <div
      role="status"
      className={cn(
        "rounded-xl border px-4 py-3 text-sm tx-enter",
        styles[status.kind],
        className,
      )}
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
        <span className="mono-meta shrink-0 min-w-[2.5rem] text-fg">
          [{shownPrefix}
          {status.kind === "pending" && shownPrefix.length < 1 ? (
            <span className="ascii-cursor-blink inline-block w-[0.45em] bg-fg align-middle">
              ▌
            </span>
          ) : null}
          ]
        </span>
        <div className="min-w-0 flex-1">
          {status.title ? <p className="font-medium text-fg">{status.title}</p> : null}
          {status.message ? (
            <p className={cn(status.title ? "mt-0.5" : "", "text-muted")}>{status.message}</p>
          ) : null}
          {status.hash ? (
            <a
              href={explorerTxUrl(status.hash)}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block font-mono text-xs text-fg underline-offset-2 hover:underline"
            >
              view tx ↗
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
