import Link from "next/link";
import { guardrails, navLinks, steps } from "@/lib/data";
import { BrandMark, ButtonLink, SectionLabel } from "@/components/ui";
import { MobileMenu } from "@/components/mobile-menu";
import { AsciiScene } from "@/components/ascii-scene";
import { NETWORK, shortAddress } from "@/lib/config";

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-bg/90 backdrop-blur-md">
      <div className="page relative flex h-16 items-center justify-between">
        <BrandMark />
        <nav className="hidden items-center gap-8 lg:flex" aria-label="Primary">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="focus-ring text-sm text-muted transition-colors hover:text-fg"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="hidden lg:block">
          <ButtonLink href="/app">Open app</ButtonLink>
        </div>
        <MobileMenu />
      </div>
    </header>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-bg text-fg">
      <Header />

      <section className="section" aria-labelledby="hero-title">
        <div className="page grid items-start gap-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
          <div className="max-w-xl space-y-8">
            <p className="mono-meta uppercase tracking-wider">
              Stellar · Soroban · Agents
            </p>
            <h1
              id="hero-title"
              className="text-4xl font-medium leading-[1.08] tracking-tight text-fg md:text-6xl lg:text-[4.25rem]"
            >
              Agent budgets that cannot run away.
            </h1>
            <p className="max-w-md text-lg leading-relaxed text-muted md:text-xl">
              Rate-limited spend for autonomous agents. Vest funds, cap each call,
              allowlist payees, stop anything instantly.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <ButtonLink href="/app">Open app</ButtonLink>
              <ButtonLink href="#how" variant="outline">
                How it works
              </ButtonLink>
            </div>
          </div>

          <AsciiScene />
        </div>
      </section>

      <section id="how" className="section border-t border-line">
        <div className="page">
          <SectionLabel>How it works</SectionLabel>
          <h2 className="mt-4 max-w-lg text-3xl font-medium tracking-tight md:text-4xl">
            Fund. Drip. Stop.
          </h2>
          <ol className="mt-14 grid gap-6 md:grid-cols-3 md:gap-8">
            {steps.map((step) => (
              <li
                key={step.code}
                className="flex flex-col gap-3 border border-line bg-surface p-6 rounded-2xl"
              >
                <span className="mono-meta text-fg">{step.code}</span>
                <h3 className="text-xl font-medium tracking-tight text-fg">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted md:text-base">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="guardrails" className="section border-t border-line">
        <div className="page">
          <SectionLabel>Guardrails</SectionLabel>
          <h2 className="mt-4 max-w-lg text-3xl font-medium tracking-tight md:text-4xl">
            Policy on-chain, not hope.
          </h2>
          <ul className="mt-14 divide-y divide-line border-y border-line">
            {guardrails.map((item) => (
              <li
                key={item.code}
                className="grid gap-2 py-8 md:grid-cols-[7rem_12rem_1fr] md:items-baseline md:gap-8"
              >
                <span className="mono-meta text-fg">{item.code}</span>
                <span className="font-medium text-fg">{item.title}</span>
                <span className="text-sm leading-relaxed text-muted md:text-base">
                  {item.description}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section border-t border-line">
        <div className="page flex flex-col items-start gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-md space-y-3">
            <h2 className="text-3xl font-medium tracking-tight md:text-4xl">
              Open the treasury console.
            </h2>
            <p className="text-muted">
              Connect Freighter on testnet. Create a vault. Govern an agent wallet.
            </p>
          </div>
          <ButtonLink href="/app">Launch app</ButtonLink>
        </div>
      </section>

      <footer className="border-t border-line py-10">
        <div className="page flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium">DripGuard</p>
            <p className="mono-meta">
              {NETWORK.name} · {shortAddress(NETWORK.contractId, 6)}
            </p>
          </div>
          <p className="max-w-sm text-xs leading-relaxed text-muted">
            Hackathon prototype. Not audited. Do not use real mainnet funds.
          </p>
        </div>
      </footer>
    </div>
  );
}
