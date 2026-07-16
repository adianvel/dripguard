import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type ButtonLinkProps = ComponentPropsWithoutRef<typeof Link> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "outline" | "danger";
  className?: string;
};

const baseButton =
  "pressable inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium tracking-normal transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-40";

const variants = {
  primary: "bg-fg text-surface hover:bg-fg/90",
  secondary: "bg-fg text-surface hover:bg-fg/90",
  ghost: "text-fg hover:bg-fg/5",
  outline: "border border-line bg-surface text-fg hover:bg-fg hover:text-surface",
  danger:
    "border border-danger/40 bg-surface text-danger hover:bg-danger hover:text-surface",
};

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function ButtonLink({
  children,
  variant = "primary",
  className,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={cn(baseButton, variants[variant], className)} {...props}>
      {children}
    </Link>
  );
}

export function Button({
  children,
  variant = "primary",
  className,
  ...props
}: ComponentPropsWithoutRef<"button"> & {
  variant?: keyof typeof variants;
}) {
  return (
    <button
      className={cn(baseButton, variants[variant], className)}
      {...props}
    >
      {children}
    </button>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mono-meta font-medium uppercase tracking-wider text-muted">
      {children}
    </p>
  );
}

export function Panel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("panel", className)}>{children}</div>;
}

export function Stat({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="mono-meta uppercase tracking-wider">{label}</p>
      <p className="font-mono text-2xl font-medium tabular-nums tracking-tight text-fg md:text-3xl">
        {value}
      </p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  prompt,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  /** Optional mono idle prompt, e.g. "> connect freighter" */
  prompt?: string;
}) {
  return (
    <div className="panel flex min-h-48 flex-col items-center justify-center gap-4 p-10 text-center">
      {prompt ? (
        <p className="mono-meta text-fg">
          {prompt}
          <span className="ascii-cursor-blink ml-0.5 inline-block w-[0.5em] bg-fg align-middle">
            ▌
          </span>
        </p>
      ) : null}
      <div>
        <p className="text-base font-medium text-fg">{title}</p>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function AsciiMark({ className }: { className?: string }) {
  return (
    <span className={cn("ascii-mark select-none", className)} aria-hidden>
      {`+----+
| DG |
+----+`}
    </span>
  );
}

export function BrandMark({
  href = "/",
  /** "full" = circular peak mark + wordmark; "mark" = icon only */
  variant = "full",
}: {
  href?: string;
  variant?: "full" | "mark";
}) {
  return (
    <Link
      href={href}
      className="focus-ring flex min-h-10 items-center gap-2.5 rounded-md"
      aria-label="DripGuard home"
    >
      {/* Peak mark — matches browser tab favicon style */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/brand/logo-mark.svg"
        alt=""
        width={32}
        height={32}
        className="h-8 w-8 shrink-0"
      />
      {variant === "full" ? (
        <span className="text-[15px] font-semibold tracking-tight text-fg sm:text-base">
          DripGuard
        </span>
      ) : null}
    </Link>
  );
}

export function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-xl bg-line/70" />
      ))}
    </div>
  );
}
