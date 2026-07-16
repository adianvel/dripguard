"use client";

import Link from "next/link";
import { useState } from "react";
import { navLinks } from "@/lib/data";
import { ButtonLink } from "@/components/ui";

export function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="focus-ring mono-meta rounded-md px-3 py-2 uppercase tracking-wider text-fg"
      >
        {open ? "[ close ]" : "[ menu ]"}
      </button>
      {open ? (
        <div className="absolute inset-x-0 top-full border-b border-line bg-surface px-5 py-6 shadow-sm">
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-3 text-base text-fg hover:bg-bg"
              >
                {link.label}
              </Link>
            ))}
            <ButtonLink href="/app" className="mt-3 w-full" onClick={() => setOpen(false)}>
              Open app
            </ButtonLink>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
