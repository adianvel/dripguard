"use client";

import { useEffect, useState } from "react";
import { cn } from "@/components/ui";
import { NumberTicker } from "@/components/number-ticker";
import { AsciiTexture } from "@/components/ascii-texture";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

/**
 * Phantom-style product frame (image.png):
 * lavender canvas · big headline · dark phone · toast · huge amount · sparkles
 *
 * Storyboard (ms from mount / in-view):
 *   0     phone fade+lift
 *  280    amount ticks in
 *  520    toast slides down + sparkles
 *  900    bottom bar settles
 */

function Sparkle({ className, delay = 0 }: { className?: string; delay?: number }) {
  return (
    <span
      className={cn("phone-sparkle absolute text-white/90", className)}
      style={{ animationDelay: `${delay}ms` }}
      aria-hidden
    >
      ✦
    </span>
  );
}

export function PhoneShowcase({ className }: { className?: string }) {
  const reduced = useReducedMotion();
  const [stage, setStage] = useState(reduced ? 3 : 0);
  // 0 mount · 1 phone · 2 amount · 3 toast

  useEffect(() => {
    if (reduced) {
      setStage(3);
      return;
    }
    const t1 = window.setTimeout(() => setStage(1), 80);
    const t2 = window.setTimeout(() => setStage(2), 320);
    const t3 = window.setTimeout(() => setStage(3), 560);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [reduced]);

  return (
    <div className={cn("relative mx-auto w-full max-w-[280px] sm:max-w-[300px]", className)}>
      {/* Phone shell */}
      <div
        className={cn(
          "phone-shell relative overflow-hidden rounded-[2.25rem] border-[3px] border-[#1a1a1a] bg-[#0c0c0c] shadow-[0_32px_80px_-20px_rgba(0,0,0,0.45)]",
          stage >= 1 && "phone-shell-in",
        )}
      >
        {/* Notch / status bar */}
        <div className="flex items-center justify-between px-6 pt-3.5 pb-1">
          <span className="text-[10px] font-medium tabular-nums text-white/50">9:41</span>
          <div className="h-5 w-24 rounded-full bg-black" aria-hidden />
          <span className="text-[10px] text-white/50">●●●</span>
        </div>

        {/* Toast — same energy as “Bought 1.40 of SOL” */}
        <div className="relative z-20 px-4 pt-3">
          {stage >= 3 ? (
            <>
              <Sparkle className="right-3 top-0 text-xs text-white" delay={0} />
              <Sparkle className="left-4 top-12 text-[9px] text-white" delay={200} />
            </>
          ) : null}
          <div
            className={cn(
              "phone-toast relative mx-auto flex max-w-[94%] items-center gap-2.5 rounded-2xl border border-white/10 bg-[#2c2c2e]/95 px-3.5 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-md",
              stage >= 3 && "phone-toast-in",
            )}
          >
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#30d158] text-[12px] font-bold leading-none text-[#0a0a0a]"
              aria-hidden
            >
              ✓
            </span>
            <p className="min-w-0 text-[13px] font-medium leading-snug tracking-tight text-white">
              Drew down 250 of XLM
            </p>
            {stage >= 3 ? (
              <>
                <Sparkle className="-right-1.5 -top-2.5 text-[10px] text-white" delay={100} />
                <Sparkle className="-left-2.5 bottom-0 text-[8px] text-white" delay={280} />
              </>
            ) : null}
          </div>
        </div>

        {/* Main amount — huge centered like $200 */}
        <div
          className={cn(
            "phone-amount flex flex-col items-center justify-center px-6 pb-12 pt-16",
            stage >= 2 && "phone-amount-in",
          )}
        >
          <p className="flex items-baseline justify-center text-[3.75rem] font-semibold leading-none tracking-tight text-white sm:text-[4rem]">
            <span className="mr-0.5 text-[2.5rem] font-semibold opacity-95">$</span>
            {stage >= 2 ? (
              <NumberTicker value={200} durationMs={700} maximumFractionDigits={0} />
            ) : (
              <span>0</span>
            )}
          </p>
          <p className="mt-3.5 text-[15px] text-white/40">~ 250 XLM claimable</p>
        </div>

        {/* Bottom bar */}
        <div className="mt-auto border-t border-white/[0.06] px-5 pb-8 pt-4">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              tabIndex={-1}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[13px] font-medium text-white"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#f5c518] text-[9px] font-bold text-[#14120b]">
                X
              </span>
              Pay XLM
              <span className="text-white/40">▾</span>
            </button>
            <p className="text-[13px] tabular-nums text-white/40">12,000 XLM</p>
          </div>
        </div>

        {/* Home indicator */}
        <div className="flex justify-center pb-2.5 pt-1" aria-hidden>
          <div className="h-1 w-28 rounded-full bg-white/25" />
        </div>
      </div>
    </div>
  );
}

/** Full Phantom-style feature band: soft lavender + headline + phone */
export function PhantomFeatureBand() {
  const reduced = useReducedMotion();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (reduced) {
      setReady(true);
      return;
    }
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, [reduced]);

  return (
    <section
      className="band-lavender relative overflow-hidden"
      aria-labelledby="hero-title"
    >
      {/* Soft depth — bold gold canvas */}
      <div
        className="pointer-events-none absolute inset-0 z-[1] opacity-50"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 100%, rgba(255,255,255,0.5), transparent 70%), radial-gradient(ellipse 45% 35% at 85% 8%, rgba(255,204,0,0.55), transparent 55%)",
        }}
        aria-hidden
      />

      {/* Extra live ASCII glyph field (pixel density) */}
      <div
        className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center overflow-hidden opacity-[0.22]"
        aria-hidden
      >
        <AsciiTexture
          cols={96}
          rows={40}
          density={0.7}
          seed={7}
          tone="ink"
          className="scale-110"
        />
      </div>

      <div className="page relative z-[2] flex flex-col items-center px-5 pb-16 pt-14 text-center md:pb-24 md:pt-20">
        <h1
          id="hero-title"
          className={cn(
            "max-w-[18ch] text-[2rem] font-semibold leading-[1.12] tracking-tight text-[#0a0a0a] sm:text-4xl md:text-[2.75rem] md:leading-[1.1]",
            "transition-[opacity,transform] duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
            ready ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0",
          )}
        >
          Fund agents. Cap every drawdown in an instant.
        </h1>

        <p
          className={cn(
            "mt-4 max-w-md text-[15px] leading-relaxed text-[#0a0a0a]/75 md:text-base",
            "transition-[opacity,transform] duration-[800ms] delay-100 ease-[cubic-bezier(0.22,1,0.36,1)]",
            ready ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
          )}
        >
          Rate-limited spend on Stellar. Vest, allowlist, pause — policy holds the keys.
        </p>

        <div
          className={cn(
            "mt-10 w-full md:mt-14",
            "transition-[opacity,transform] duration-[900ms] delay-150 ease-[cubic-bezier(0.22,1,0.36,1)]",
            ready ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0",
          )}
        >
          <PhoneShowcase />
        </div>
      </div>
    </section>
  );
}
