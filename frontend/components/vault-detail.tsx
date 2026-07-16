"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { budgetProgress, formatCurrency } from "@/lib/data";
import { Button, ButtonLink, Stat, cn } from "@/components/ui";
import { TxStatusBanner, type TxStatusState } from "@/components/tx-status";
import { NumberTicker } from "@/components/number-ticker";
import { useWallet } from "@/lib/wallet";
import {
  drawdownTx,
  fetchVaultView,
  pauseVaultTx,
  revokeVaultTx,
  unpauseVaultTx,
  type VaultView,
} from "@/lib/stellar";
import { shortAddress } from "@/lib/config";
import { extractTxHash, formatUserError } from "@/lib/errors";
import { errorStatus, pendingStatus, successStatus } from "@/lib/tx";

function statusClass(status: string) {
  if (status === "Active") return "text-success";
  if (status === "Paused") return "text-danger";
  return "text-warning";
}

export function VaultDetail({ agentId }: { agentId: string }) {
  const wallet = useWallet();
  const [vault, setVault] = useState<VaultView | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<TxStatusState | null>(null);
  const [drawdownAmount, setDrawdownAmount] = useState("0.1");
  const [drawdownPayee, setDrawdownPayee] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const view = await fetchVaultView(agentId);
      setVault(view);
      setDrawdownPayee((prev) => prev || view.payees[0] || "");
    } catch (err) {
      setLoadError(formatUserError(err, "Failed to load vault"));
      setVault(null);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!vault) return;
    const id = window.setInterval(() => {
      void fetchVaultView(agentId)
        .then(setVault)
        .catch(() => undefined);
    }, 15_000);
    return () => window.clearInterval(id);
  }, [agentId, vault?.agent]);

  async function runAction(label: string, fn: () => Promise<unknown>) {
    if (!wallet.networkOk) {
      setTxStatus({
        kind: "warning",
        title: "Wrong network",
        message: wallet.network?.message || "Switch Freighter to Testnet.",
      });
      return;
    }
    setBusy(label);
    setTxStatus(pendingStatus(label));
    try {
      const raw = await fn();
      const hash = extractTxHash(raw);
      setTxStatus(successStatus(label, hash));
      await load();
    } catch (err) {
      setTxStatus(errorStatus(label, err));
    } finally {
      setBusy(null);
    }
  }

  if (loading && !vault) {
    return <p className="mono-meta">Loading vault…</p>;
  }

  if (!vault) {
    return (
      <div className="space-y-6">
        <Link href="/app" className="text-sm text-muted hover:text-fg">
          ← Dashboard
        </Link>
        <TxStatusBanner
          status={{
            kind: "error",
            title: "Vault not found",
            message: loadError ?? "No vault for this agent on the current contract.",
          }}
        />
      </div>
    );
  }

  const isAdmin = wallet.address === vault.admin;
  const isAgent = wallet.address === vault.agent;
  const velocityPct =
    vault.velocityEnabled && vault.velocityMax > 0
      ? Math.min(100, Math.round((vault.windowSpent / vault.velocityMax) * 100))
      : 0;

  return (
    <div className="space-y-12">
      <div className="space-y-4">
        <Link href="/app" className="text-sm text-muted hover:text-fg">
          ← Dashboard
        </Link>
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-medium tracking-tight md:text-4xl">{vault.name}</h1>
              <span className={cn("font-mono text-xs font-medium", statusClass(vault.status))}>
                {vault.status.toUpperCase()}
              </span>
            </div>
            <p className="mono-meta">
              agent {shortAddress(vault.agent, 6)} · admin {shortAddress(vault.admin, 6)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {vault.status === "Active" ? (
              <Button
                type="button"
                variant="outline"
                disabled={!isAdmin || busy !== null || !wallet.networkOk}
                onClick={() =>
                  void runAction("Pause", () => pauseVaultTx(wallet.address!, vault.agent))
                }
              >
                {busy === "Pause" ? "…" : "Pause"}
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                disabled={!isAdmin || busy !== null || !wallet.networkOk}
                onClick={() =>
                  void runAction("Unpause", () => unpauseVaultTx(wallet.address!, vault.agent))
                }
              >
                {busy === "Unpause" ? "…" : "Unpause"}
              </Button>
            )}
            <Button
              type="button"
              variant="danger"
              disabled={!isAdmin || busy !== null || !wallet.networkOk}
              onClick={() => {
                if (!window.confirm("Revoke vault and refund remaining funds to admin?")) return;
                void runAction("Revoke", () => revokeVaultTx(wallet.address!, vault.agent));
              }}
            >
              {busy === "Revoke" ? "…" : "Revoke"}
            </Button>
          </div>
        </div>
      </div>

      <TxStatusBanner status={txStatus} />

      <section className="grid gap-10 border-y border-line py-10 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Total budget"
          value={
            <NumberTicker value={vault.totalBudget} suffix={` ${vault.tokenLabel}`} />
          }
        />
        <Stat
          label="Vested"
          value={<NumberTicker value={vault.vested} suffix={` ${vault.tokenLabel}`} />}
        />
        <Stat
          label="Claimed"
          value={<NumberTicker value={vault.claimed} suffix={` ${vault.tokenLabel}`} />}
        />
        <Stat
          label="Claimable"
          value={
            <NumberTicker value={vault.claimable} suffix={` ${vault.tokenLabel}`} />
          }
        />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Claimed progress</span>
          <span className="font-mono tabular-nums">
            <NumberTicker
              value={budgetProgress(vault)}
              suffix="%"
              maximumFractionDigits={0}
              durationMs={400}
            />
          </span>
        </div>
        <div className="h-1 rounded-full bg-line">
          <div
            className="progress-fill h-1 rounded-full bg-success"
            style={{ width: `${budgetProgress(vault)}%` }}
          />
        </div>
      </section>

      {vault.velocityEnabled ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">Velocity window ({vault.velocityWindowSeconds}s)</span>
            <span className="font-mono tabular-nums">
              <NumberTicker value={vault.windowSpent} maximumFractionDigits={4} />
              {" / "}
              {formatCurrency(vault.velocityMax, vault.tokenLabel)}
            </span>
          </div>
          <div className="h-1 rounded-full bg-line">
            <div
              className={cn(
                "progress-fill h-1 rounded-full",
                velocityPct >= 90 ? "bg-danger" : "bg-fg",
              )}
              style={{ width: `${velocityPct}%` }}
            />
          </div>
        </section>
      ) : null}

      <div className="grid gap-12 lg:grid-cols-2">
        <section className="space-y-6">
          <h2 className="text-lg font-medium">Policy</h2>
          <dl className="divide-y divide-line border-y border-line text-sm">
            {[
              ["Release rate", vault.releaseRate],
              ["Max per call", formatCurrency(vault.maxPerCall, vault.tokenLabel)],
              ["Cliff", vault.cliff],
              [
                "Velocity",
                vault.velocityEnabled
                  ? `${formatCurrency(vault.velocityMax, vault.tokenLabel)} / ${vault.velocityWindowSeconds}s`
                  : "Disabled",
              ],
              ["Token", shortAddress(vault.token, 6)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-4">
                <dt className="text-muted">{k}</dt>
                <dd className="font-mono text-right text-xs sm:text-sm">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Allowed payees</h2>
            <ButtonLink href="/app/new-vault" variant="outline" className="min-h-9 px-3 text-xs">
              New vault
            </ButtonLink>
          </div>
          <ul className="divide-y divide-line border-y border-line">
            {vault.payees.map((payee) => (
              <li key={payee} className="flex items-center justify-between py-4">
                <span className="font-mono text-xs sm:text-sm">{shortAddress(payee, 8)}</span>
                <button
                  type="button"
                  className="text-xs text-muted hover:text-fg"
                  onClick={() => void navigator.clipboard.writeText(payee)}
                >
                  Copy
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="space-y-6 border-t border-line pt-12">
        <div>
          <h2 className="text-lg font-medium">Agent drawdown</h2>
          <p className="mt-1 text-sm text-muted">
            Requires the agent key. Automation: use the CLI in <code className="font-mono text-xs">agent/</code>.
          </p>
        </div>
        <div className="grid max-w-2xl gap-4 md:grid-cols-3">
          <label className="block space-y-2 text-sm">
            <span className="font-medium">Payee</span>
            <select
              value={drawdownPayee}
              onChange={(e) => setDrawdownPayee(e.target.value)}
              className="min-h-11 w-full rounded-xl border border-line bg-surface px-3 font-mono text-sm"
            >
              {vault.payees.map((p) => (
                <option key={p} value={p}>
                  {shortAddress(p, 8)}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-2 text-sm">
            <span className="font-medium">Amount ({vault.tokenLabel})</span>
            <input
              value={drawdownAmount}
              onChange={(e) => setDrawdownAmount(e.target.value)}
              className="min-h-11 w-full rounded-xl border border-line bg-surface px-3 font-mono text-sm"
            />
          </label>
          <div className="flex items-end">
            <Button
              type="button"
              className="w-full"
              disabled={!isAgent || busy !== null || vault.status === "Paused" || !wallet.networkOk}
              onClick={() =>
                void runAction("Drawdown", () =>
                  drawdownTx({
                    agent: vault.agent,
                    payee: drawdownPayee,
                    amount: drawdownAmount,
                  }),
                )
              }
            >
              {busy === "Drawdown" ? "Signing…" : isAgent ? "Drawdown" : "Connect agent"}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
