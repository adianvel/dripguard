import type { VaultView } from "@/lib/stellar";

export type VaultStatus = "Active" | "Paused" | "Review";

export type Vault = VaultView;

export const navLinks = [
  { label: "How it works", href: "#how" },
  { label: "Guardrails", href: "#guardrails" },
  { label: "App", href: "/app" },
];

export const steps = [
  {
    code: "01",
    title: "Fund",
    description: "Deposit tokens into a vault for an agent address.",
  },
  {
    code: "02",
    title: "Drip",
    description: "Budget unlocks on a schedule. Agents only spend what vested.",
  },
  {
    code: "03",
    title: "Stop",
    description: "Pause, revoke, or let velocity limits auto-freeze spend spikes.",
  },
];

export const guardrails = [
  {
    code: "VEST",
    title: "Linear drip",
    description: "Funds unlock over time — never the full budget at once.",
  },
  {
    code: "CAP",
    title: "Per-call max",
    description: "Every payment is bounded, even when more has vested.",
  },
  {
    code: "ALLOW",
    title: "Payee allowlist",
    description: "Only pre-approved addresses can receive funds.",
  },
  {
    code: "VEL",
    title: "Velocity breaker",
    description: "Spend spikes in a window auto-pause the vault.",
  },
];

export const appNav = [
  { label: "Dashboard", href: "/app" },
  { label: "New vault", href: "/app/new-vault" },
];

export function formatCurrency(value: number, token = "XLM") {
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 7,
  }).format(value)} ${token}`;
}

export function budgetProgress(vault: Pick<Vault, "claimed" | "totalBudget">) {
  if (vault.totalBudget <= 0) return 0;
  return Math.min(100, Math.round((vault.claimed / vault.totalBudget) * 100));
}
