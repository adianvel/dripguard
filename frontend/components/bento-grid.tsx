"use client";

import { useEffect, useRef, useState } from "react";
import Lottie from "lottie-react";
import { cn } from "@/components/ui";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

type BentoItem = {
  id: string;
  title: string;
  body: string;
  code: string;
  lottie: string;
  className?: string;
};

const ITEMS: BentoItem[] = [
  {
    id: "fund",
    code: "01",
    title: "Fund",
    body: "Deposit XLM into a vault. Policy holds custody—not a hot wallet.",
    lottie: "/lottie/fund.json",
    className: "md:col-span-2 md:row-span-2",
  },
  {
    id: "drip",
    code: "02",
    title: "Drip",
    body: "Budget unlocks on a schedule. Agents only spend what vested.",
    lottie: "/lottie/drip.json",
    className: "md:col-span-1",
  },
  {
    id: "stop",
    code: "03",
    title: "Stop",
    body: "Pause or revoke anytime. Unclaimed funds return to admin.",
    lottie: "/lottie/stop.json",
    className: "md:col-span-1",
  },
  {
    id: "velocity",
    code: "VEL",
    title: "Velocity",
    body: "Spend spikes in a window auto-pause the vault.",
    lottie: "/lottie/velocity.json",
    className: "md:col-span-2",
  },
];

function useLottieData(src: string) {
  const [data, setData] = useState<object | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch(src)
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled) setData(j);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      });
    return () => {
      cancelled = true;
    };
  }, [src]);
  return data;
}

function BentoCard({ item }: { item: BentoItem }) {
  const reduced = useReducedMotion();
  const data = useLottieData(item.lottie);
  const large = item.className?.includes("row-span-2");
  const cardRef = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (reduced) return;
    const el = cardRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);

  const play = !reduced && inView;

  return (
    <article
      ref={cardRef as never}
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-line bg-surface p-6 transition-colors duration-200 hover:border-fg/25",
        large ? "min-h-[280px] md:min-h-[340px]" : "min-h-[200px]",
        item.className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <p className="mono-meta text-fg">{item.code}</p>
      </div>

      <div
        className={cn(
          "pointer-events-none mx-auto my-4 flex items-center justify-center",
          large ? "h-36 w-36 md:h-44 md:w-44" : "h-24 w-24",
        )}
        aria-hidden
      >
        {data ? (
          <Lottie
            animationData={data}
            loop={!reduced}
            autoplay={play}
            className="h-full w-full"
          />
        ) : (
          <div className="h-full w-full animate-pulse rounded-full bg-line/60" />
        )}
      </div>

      <div className="space-y-1.5">
        <h3 className="text-lg font-medium tracking-tight text-fg md:text-xl">
          {item.title}
        </h3>
        <p className="max-w-sm text-sm leading-relaxed text-muted">{item.body}</p>
      </div>
    </article>
  );
}

export function BentoGrid() {
  return (
    <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
      {ITEMS.map((item) => (
        <BentoCard key={item.id} item={item} />
      ))}
    </div>
  );
}
