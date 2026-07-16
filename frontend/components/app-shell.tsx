"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { appNav } from "@/lib/data";
import { BrandMark, Button, cn } from "@/components/ui";
import { useWallet } from "@/lib/wallet";
import { NETWORK, shortAddress } from "@/lib/config";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const wallet = useWallet();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur-md">
        <div className="page flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <BrandMark href="/app" />
            <nav className="hidden items-center gap-6 md:flex" aria-label="App">
              {appNav.map((item) => {
                const active =
                  item.href === "/app"
                    ? pathname === "/app"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "text-sm transition-colors",
                      active ? "font-medium text-fg" : "text-muted hover:text-fg",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span
              className={cn(
                "hidden rounded-full border px-3 py-1 font-mono text-[11px] sm:inline-flex",
                wallet.networkOk
                  ? "border-line text-muted"
                  : "border-warning/40 text-warning",
              )}
            >
              {NETWORK.name}
              {wallet.network && !wallet.networkOk ? " · mismatch" : ""}
            </span>

            {wallet.address ? (
              <div className="flex items-center gap-2">
                <span className="hidden font-mono text-xs text-fg sm:inline">
                  {wallet.short}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-9 px-3 text-xs"
                  onClick={wallet.disconnect}
                >
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                className="min-h-9 px-4 text-xs"
                disabled={wallet.connecting}
                onClick={() => void wallet.connect()}
              >
                {wallet.connecting ? "Connecting…" : "Connect"}
              </Button>
            )}

            <button
              type="button"
              className="mono-meta rounded-md px-2 py-1 uppercase md:hidden"
              aria-label="Menu"
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? "[x]" : "[=]"}
            </button>
          </div>
        </div>

        {menuOpen ? (
          <div className="border-t border-line px-5 py-4 md:hidden">
            <nav className="flex flex-col gap-1">
              {appNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-md px-3 py-3 text-sm hover:bg-surface"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/"
                onClick={() => setMenuOpen(false)}
                className="rounded-md px-3 py-3 text-sm text-muted"
              >
                Marketing site
              </Link>
            </nav>
          </div>
        ) : null}
      </header>

      {wallet.error ? (
        <div className="border-b border-danger/20 bg-danger/5 px-4 py-2 text-center text-sm text-danger">
          {wallet.error}
        </div>
      ) : null}

      <main className="page py-10 md:py-14">{children}</main>

      <footer className="border-t border-line py-8">
        <div className="page flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="mono-meta">
            {shortAddress(NETWORK.contractId, 6)} · testnet
          </p>
          <Link href="/" className="text-sm text-muted hover:text-fg">
            ← DripGuard
          </Link>
        </div>
      </footer>
    </div>
  );
}
