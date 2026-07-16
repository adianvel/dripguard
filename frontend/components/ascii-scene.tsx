"use client";

/**
 * Image → live ASCII (asciilab style).
 * No panel/outline — soft edge falloff so the glyph cloud sits on the page.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/components/ui";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const RAMP = " .:-=+*#%@";

export const ASCII_SOURCE = "/assets/hero/ascii-source.png";
export const ASCII_SOURCE_FALLBACK = "/assets/hero/ascii-source-vector.png";

type AsciiSceneProps = {
  className?: string;
  cols?: number;
  rows?: number;
  src?: string;
};

export function AsciiScene({
  className,
  cols = 58,
  rows = 30,
  src = ASCII_SOURCE,
}: AsciiSceneProps) {
  const reduced = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const pointer = useRef({ x: 0.5, y: 0.45, active: false });
  const rafRef = useRef<number | null>(null);
  const [ready, setReady] = useState(false);
  const [frozen, setFrozen] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      if (!cancelled) {
        imageRef.current = img;
        setReady(true);
      }
    };
    img.onerror = () => {
      if (cancelled) return;
      const fb = new Image();
      fb.onload = () => {
        if (!cancelled) {
          imageRef.current = fb;
          setReady(true);
        }
      };
      fb.src = ASCII_SOURCE_FALLBACK;
    };
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);

  const paintScene = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => {
      const img = imageRef.current;
      // Pure black = spaces after sample (no gray “box” of noise)
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, w, h);

      const px = pointer.current.x;
      const py = pointer.current.y;
      const breathe = reduced ? 0 : Math.sin(t * 0.0011) * 0.5 + 0.5;

      if (img) {
        const iw = img.naturalWidth || img.width;
        const ih = img.naturalHeight || img.height;
        // contain — leave margins so the form floats, not a full rect fill
        const pad = 0.12;
        const scale =
          Math.min((w * (1 - pad * 2)) / iw, (h * (1 - pad * 2)) / ih) *
          (1.02 + breathe * 0.03 + (pointer.current.active ? 0.02 : 0));
        const dw = iw * scale;
        const dh = ih * scale;
        const ox = (w - dw) / 2 + (px - 0.5) * 18;
        const oy = (h - dh) / 2 + (py - 0.5) * 14;
        ctx.drawImage(img, ox, oy, dw, dh);
      }

      // Soft drips only over the bright form (additive light)
      if (!reduced) {
        ctx.globalCompositeOperation = "screen";
        for (let i = 0; i < 5; i++) {
          const phase = t * 0.00065 + i * 1.4;
          const x = w * (0.3 + (i / 4) * 0.4) + (px - 0.5) * 8;
          const dropY = ((phase % 1) * 0.9 + 0.15) * h;
          const len = h * 0.08;
          const g = ctx.createLinearGradient(x, dropY - len, x, dropY);
          g.addColorStop(0, "rgba(255,255,255,0)");
          g.addColorStop(1, `rgba(255,255,255,${0.35 + breathe * 0.25})`);
          ctx.strokeStyle = g;
          ctx.lineWidth = 2;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(x, dropY - len);
          ctx.lineTo(x, dropY);
          ctx.stroke();
          ctx.beginPath();
          ctx.fillStyle = "rgba(255,255,255,0.75)";
          ctx.ellipse(x, dropY + 2, 2.5, 4, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalCompositeOperation = "source-over";
      }

      // Pointer light — soft, no hard vignette ring
      const light = ctx.createRadialGradient(
        w * px,
        h * py,
        0,
        w * px,
        h * py,
        w * 0.55,
      );
      light.addColorStop(0, `rgba(255,255,255,${0.22 + breathe * 0.1})`);
      light.addColorStop(0.55, "rgba(255,255,255,0.04)");
      light.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = light;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over";
    },
    [reduced],
  );

  const sampleToAscii = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const image = ctx.getImageData(0, 0, w, h);
      const data = image.data;
      const cellW = w / cols;
      const cellH = h / rows;
      const cx = (cols - 1) / 2;
      const cy = (rows - 1) / 2;
      // Soft oval falloff — kills rectangular block silhouette
      const rx = cols * 0.48;
      const ry = rows * 0.46;
      let out = "";

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const nx = (col - cx) / rx;
          const ny = (row - cy) / ry;
          const r2 = nx * nx + ny * ny;
          // outside soft ellipse → space
          if (r2 > 1.05) {
            out += " ";
            continue;
          }
          const edge = r2 > 0.72 ? 1 - (r2 - 0.72) / 0.33 : 1;

          const x0 = Math.floor(col * cellW);
          const y0 = Math.floor(row * cellH);
          const x1 = Math.min(w, Math.floor((col + 1) * cellW));
          const y1 = Math.min(h, Math.floor((row + 1) * cellH));

          let sum = 0;
          let n = 0;
          for (let y = y0; y < y1; y += 2) {
            for (let x = x0; x < x1; x += 2) {
              const i = (y * w + x) * 4;
              sum +=
                0.299 * (data[i] ?? 0) +
                0.587 * (data[i + 1] ?? 0) +
                0.114 * (data[i + 2] ?? 0);
              n++;
            }
          }
          let lum = n ? sum / n / 255 : 0;
          lum *= Math.max(0, edge);
          // Crush noise so empty areas stay clean space (no dotted box)
          if (lum < 0.14) {
            out += " ";
            continue;
          }
          const boosted = Math.min(1, (lum - 0.14) / 0.72);
          const idx = Math.min(
            RAMP.length - 1,
            Math.floor(boosted * (RAMP.length - 1)),
          );
          out += RAMP[idx] ?? " ";
        }
        if (row < rows - 1) out += "\n";
      }
      return out;
    },
    [cols, rows],
  );

  useEffect(() => {
    if (!ready) return;
    const canvas = canvasRef.current;
    const pre = preRef.current;
    if (!canvas || !pre) return;

    const w = 360;
    const h = 220;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    if (reduced) {
      paintScene(ctx, w, h, 0);
      const frame = sampleToAscii(ctx, w, h);
      setFrozen(frame);
      pre.textContent = frame;
      return;
    }

    const loop = (now: number) => {
      paintScene(ctx, w, h, now);
      pre.textContent = sampleToAscii(ctx, w, h);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [paintScene, ready, reduced, sampleToAscii]);

  function onPointerMove(e: React.PointerEvent) {
    if (reduced) return;
    const rect = e.currentTarget.getBoundingClientRect();
    pointer.current = {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
      active: true,
    };
  }

  function onPointerLeave() {
    pointer.current = { x: 0.5, y: 0.45, active: false };
  }

  return (
    <div
      className={cn(
        "relative select-none touch-none",
        // Soft dissolve into page — no hard rect
        "ascii-scene-mask",
        className,
      )}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onPointerDown={(e) => e.preventDefault()}
    >
      <canvas ref={canvasRef} className="hidden" aria-hidden />
      <pre
        ref={preRef}
        className="cursor-crosshair overflow-visible whitespace-pre font-mono text-[8px] leading-[1.08] tracking-[0.02em] text-fg/90 select-none sm:text-[9px] md:text-[10.5px]"
        aria-label="Animated ASCII art of DripGuard logo"
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
      >
        {frozen ?? (ready ? "" : "")}
      </pre>
    </div>
  );
}
