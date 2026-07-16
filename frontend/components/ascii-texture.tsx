"use client";

/**
 * Pixelated ASCII texture layers.
 * Gold-friendly: ink glyphs on cream / dark glyphs on gold.
 */

import { useMemo } from "react";
import { cn } from "@/components/ui";

const RAMP = " .'`^\":,;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";

/** Deterministic pseudo-noise so SSR + client match */
function hash(n: number) {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function buildField(cols: number, rows: number, density = 0.55, seed = 1) {
  const lines: string[] = [];
  for (let y = 0; y < rows; y++) {
    let row = "";
    for (let x = 0; x < cols; x++) {
      const n = hash(x * 17.3 + y * 31.7 + seed * 9.1);
      if (n > density) {
        row += " ";
      } else {
        const i = Math.floor(hash(x * 3.1 + y * 7.9 + seed) * (RAMP.length - 1));
        row += RAMP[i] ?? ".";
      }
    }
    lines.push(row);
  }
  return lines.join("\n");
}

type AsciiTextureProps = {
  className?: string;
  /** "field" = live mono glyph cloud · "pixel" = CSS tile only (parent handles) */
  variant?: "field" | "overlay";
  cols?: number;
  rows?: number;
  density?: number;
  seed?: number;
  /** ink on light gold · gold-ink on dark */
  tone?: "ink" | "gold" | "soft";
  ariaHidden?: boolean;
};

export function AsciiTexture({
  className,
  variant = "field",
  cols = 72,
  rows = 28,
  density = 0.62,
  seed = 3,
  tone = "ink",
  ariaHidden = true,
}: AsciiTextureProps) {
  const field = useMemo(
    () => buildField(cols, rows, density, seed),
    [cols, rows, density, seed],
  );

  if (variant === "overlay") {
    return (
      <div
        className={cn("ascii-texture-layer pointer-events-none absolute inset-0", className)}
        aria-hidden={ariaHidden}
      />
    );
  }

  return (
    <pre
      className={cn(
        "ascii-pixel-field pointer-events-none select-none overflow-hidden",
        tone === "ink" && "text-fg/20",
        tone === "gold" && "text-gold-bold/35",
        tone === "soft" && "text-accent-deep/25",
        className,
      )}
      aria-hidden={ariaHidden}
    >
      {field}
    </pre>
  );
}

/** Full-bleed fixed page grain (pixel + ascii SVG tiles) */
export function AsciiPageGrain({ className }: { className?: string }) {
  return (
    <div
      className={cn("ascii-page-grain pointer-events-none fixed inset-0 z-0", className)}
      aria-hidden
    />
  );
}
