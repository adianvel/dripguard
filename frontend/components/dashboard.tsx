"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { budgetProgress, formatCurrency } from "@/lib/data";
import { Button, ButtonLink, EmptyState, Stat, cn } from "@/components/ui";
import { TxStatusBanner } from "@/components/tx-status";
import { NumberTicker } from "@/components/number-ticker";
import { useWallet } from "@/lib/wallet";
import { fetchAdminVaults, type VaultView } from "@/lib/stellar";
import { fetchContractActivity, type ChainActivity } from "@/lib/events";
import { explorerContractUrl, explorerTxUrl, shortAddress } from "@/lib/config";
import { formatUserError } from "@/lib/errors";

function statusLabel(status: string) {
  return status.toUpperCase();
}

function statusClass(status: string) {
  if (status === "Active") return "text-success";
  if (status === "Paused") return "text-danger";
  return "text-warning";
}

export function DashboardPage() {
  const wallet = useWallet();
  const [vaults, setVaults] = useState<VaultView[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chainActivity, setChainActivity] = useState<ChainActivity[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);

  const loadVaults = useCallback(async () => {
    if (!wallet.address) {
      setVaults([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminVaults(wallet.address);
      setVaults(data);
    } catch (err) {
      setError(formatUserError(err, "Failed to load vaults"));
    } finally {
      setLoading(false);
    }
  }, [wallet.address]);

  const loadActivity = useCallback(async () => {
    setActivityLoading(true);
    setActivityError(null);
    try {
      const events = await fetchContractActivity(24);
      setChainActivity(events);
    } catch (err) {
      setActivityError(formatUserError(err, "Failed to load chain events"));
    } finally {
      setActivityLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadVaults();
  }, [loadVaults]);

  useEffect(() => {
    void loadActivity();
    const id = window.setInterval(() => void loadActivity(), 60_000);
    return () => window.clearInterval(id);
  }, [loadActivity]);

  const totalBudget = vaults.reduce((sum, vault) => sum + vault.totalBudget, 0);
  const vested = vaults.reduce((sum, vault) => sum + vault.vested, 0);
  const claimed = vaults.reduce((sum, vault) => sum + vault.claimed, 0);
  const claimable = vaults.reduce((sum, vault) => sum + vault.claimable, 0);

  return (
    <div className="space-y-14">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-xl space-y-3">
          <p className="mono-meta uppercase tracking-wider">Console</p>
          <h1 className="text-3xl font-medium tracking-tight md:text-4xl">Agent vaults</h1>
          <p className="text-sm leading-relaxed text-muted md:text-base">
            Live reads from DripGuard on Stellar testnet. Connect Freighter as vault admin.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/app/new-vault">New vault</ButtonLink>
          <Button
            type="button"
            variant="outline"
            disabled={loading || !wallet.address}
            onClick={() => {
              void loadVaults();
              void loadActivity();
            }}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </div>

      {!wallet.address ? (
        <EmptyState
          prompt="> connect freighter"
          title="Connect Freighter"
          description="Your address is used as admin to list vaults via list_vaults()."
          action={
            <Button type="button" disabled={wallet.connecting} onClick={() => void wallet.connect()}>
              {wallet.connecting ? "Connecting…" : "Connect wallet"}
            </Button>
          }
        />
      ) : null}

      {wallet.address && !wallet.networkOk ? (
        <TxStatusBanner
          status={{
            kind: "warning",
            title: "Wrong network",
            message: wallet.network?.message || "Switch Freighter to Testnet.",
          }}
        />
      ) : null}

      {error ? (
        <TxStatusBanner status={{ kind: "error", title: "Load failed", message: error }} />
      ) : null}

      <section
        className="grid gap-10 border-y border-line py-10 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Vault metrics"
      >
        <Stat
          label="Total budget"
          value={<NumberTicker value={totalBudget} suffix=" XLM" />}
        />
        <Stat label="Vested" value={<NumberTicker value={vested} suffix=" XLM" />} />
        <Stat label="Claimed" value={<NumberTicker value={claimed} suffix=" XLM" />} />
        <Stat
          label="Claimable"
          value={<NumberTicker value={claimable} suffix=" XLM" />}
        />
      </section>

      <section id="vaults" className="space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-medium">Vaults</h2>
            <p className="mt-1 text-sm text-muted">
              Admin {wallet.short ?? "—"} · {loading ? "…" : `${vaults.length} total`}
            </p>
          </div>
        </div>

        {vaults.length === 0 ? (
          <EmptyState
            prompt={wallet.address ? "> no vaults" : "> wallet required"}
            title={wallet.address ? "No vaults yet" : "Wallet required"}
            description={
              wallet.address
                ? "Create a vault to deposit XLM and govern an agent wallet."
                : "Connect Freighter to load vaults."
            }
            action={<ButtonLink href="/app/new-vault">Create vault</ButtonLink>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-line mono-meta uppercase tracking-wider">
                  <th className="pb-3 pr-4 font-medium">Vault</th>
                  <th className="pb-3 pr-4 font-medium">Agent</th>
                  <th className="pb-3 pr-4 font-medium">Claimable</th>
                  <th className="pb-3 pr-4 font-medium">Progress</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {vaults.map((vault) => (
                  <tr key={vault.id} className="align-middle">
                    <td className="py-5 pr-4">
                      <p className="font-medium">{vault.name}</p>
                      <p className="mt-0.5 font-mono text-xs text-muted">
                        {formatCurrency(vault.totalBudget, vault.tokenLabel)}
                        {vault.velocityEnabled
                          ? ` · vel ${formatCurrency(vault.windowSpent, vault.tokenLabel)}/${formatCurrency(vault.velocityMax, vault.tokenLabel)}`
                          : ""}
                      </p>
                    </td>
                    <td className="py-5 pr-4 font-mono text-xs">
                      {shortAddress(vault.agent, 6)}
                    </td>
                    <td className="py-5 pr-4 font-mono tabular-nums">
                      {formatCurrency(vault.claimable, vault.tokenLabel)}
                    </td>
                    <td className="py-5 pr-4">
                      <div className="h-1 w-28 rounded-full bg-line">
                        <div
                          className="progress-fill h-1 rounded-full bg-success"
                          style={{ width: `${budgetProgress(vault)}%` }}
                        />
                      </div>
                      <p className="mt-1 font-mono text-[11px] text-muted">
                        <NumberTicker
                          value={budgetProgress(vault)}
                          suffix="%"
                          maximumFractionDigits={0}
                          durationMs={400}
                        />
                      </p>
                    </td>
                    <td className="py-5 pr-4">
                      <span className={cn("font-mono text-xs font-medium", statusClass(vault.status))}>
                        {statusLabel(vault.status)}
                      </span>
                    </td>
                    <td className="py-5 text-right">
                      <Link
                        href={`/app/vaults/${encodeURIComponent(vault.agent)}`}
                        className="text-sm font-medium text-fg underline-offset-4 hover:underline"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section id="activity" className="space-y-6 border-t border-line pt-14">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-medium">On-chain activity</h2>
            <p className="mt-1 text-sm text-muted">Recent contract events from Soroban RPC.</p>
          </div>
          <button
            type="button"
            className="text-sm text-muted underline-offset-4 hover:text-fg hover:underline"
            onClick={() => void loadActivity()}
          >
            {activityLoading ? "Loading…" : "Refresh"}
          </button>
        </div>

        {activityError ? <p className="text-sm text-danger">{activityError}</p> : null}

        {chainActivity.length === 0 && !activityLoading ? (
          <p className="text-sm text-muted">
            No recent events.{" "}
            <a
              className="underline-offset-4 hover:underline"
              href={explorerContractUrl()}
              target="_blank"
              rel="noreferrer"
            >
              View contract
            </a>
          </p>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {chainActivity.map((item) => (
              <li key={item.id} className="flex flex-col gap-1 py-5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                <div className="min-w-0">
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-0.5 text-sm text-muted">{item.detail}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3 font-mono text-[11px] text-muted">
                  <span>{item.time}</span>
                  {item.txHash ? (
                    <a
                      href={explorerTxUrl(item.txHash)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-fg hover:underline"
                    >
                      tx ↗
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
