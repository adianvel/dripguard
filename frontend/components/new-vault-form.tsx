"use client";

import { useMemo, useState } from "react";
import { Button, ButtonLink } from "@/components/ui";
import { TxStatusBanner, type TxStatusState } from "@/components/tx-status";
import { useWallet } from "@/lib/wallet";
import { createVaultTx } from "@/lib/stellar";
import { NETWORK, shortAddress } from "@/lib/config";
import { extractTxHash } from "@/lib/errors";
import { errorStatus, pendingStatus, successStatus } from "@/lib/tx";

type FormState = {
  agent: string;
  amount: string;
  dailyRate: string;
  maxPerCall: string;
  allowlist: string;
  cliff: string;
  velocityMax: string;
  velocityWindowHours: string;
};

/** Empty form — no demo numbers. Submit-time fallbacks only for advanced/system fields. */
const emptyForm: FormState = {
  agent: "",
  amount: "",
  dailyRate: "",
  maxPerCall: "",
  allowlist: "",
  cliff: "",
  velocityMax: "",
  velocityWindowHours: "",
};

function numericError(label: string, value: string, allowZero = false) {
  if (!value.trim()) return `${label} is required.`;
  const n = Number(value);
  if (Number.isNaN(n) || (allowZero ? n < 0 : n <= 0)) {
    return allowZero
      ? `${label} must be zero or greater.`
      : `${label} must be greater than zero.`;
  }
  return "";
}

function parsePayees(raw: string) {
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** XLM/day → XLM/sec for the contract. */
function dailyToPerSec(daily: string): string {
  const n = Number(daily);
  if (!Number.isFinite(n) || n <= 0) return "0";
  return (n / 86_400).toFixed(12).replace(/\.?0+$/, "") || "0";
}

export function NewVaultForm() {
  const wallet = useWallet();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [submittedHash, setSubmittedHash] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<TxStatusState | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const errors = useMemo(() => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.agent.trim() || !form.agent.startsWith("G")) {
      next.agent = "Paste the agent’s G… wallet address.";
    }
    const amount = numericError("Budget", form.amount);
    if (amount) next.amount = amount;
    const daily = numericError("Daily unlock", form.dailyRate);
    if (daily) next.dailyRate = daily;
    const maxPerCall = numericError("Max payment", form.maxPerCall);
    if (maxPerCall) next.maxPerCall = maxPerCall;

    const payees = parsePayees(form.allowlist);
    if (payees.length === 0) next.allowlist = "Add at least one payee address.";
    else if (payees.some((p) => !p.startsWith("G"))) {
      next.allowlist = "Payees must be G… addresses.";
    }

    if (showAdvanced) {
      if (form.cliff.trim()) {
        const cliff = numericError("Cliff", form.cliff, true);
        if (cliff) next.cliff = cliff;
      }
      if (form.velocityMax.trim()) {
        const velMax = numericError("Hourly spend cap", form.velocityMax, true);
        if (velMax) next.velocityMax = velMax;
      }
      if (form.velocityWindowHours.trim()) {
        const velWin = numericError("Window hours", form.velocityWindowHours, true);
        if (velWin) next.velocityWindowHours = velWin;
      }
      const velMaxN = Number(form.velocityMax);
      const velWinN = Number(form.velocityWindowHours);
      if (form.velocityMax.trim() && velMaxN > 0 && (!form.velocityWindowHours.trim() || velWinN <= 0)) {
        next.velocityWindowHours = "Set hours greater than zero, or set cap to 0.";
      }
    }
    return next;
  }, [form, showAdvanced]);

  const hasErrors = Object.keys(errors).length > 0;
  const submitting = txStatus?.kind === "pending";

  const summary = useMemo(() => {
    const budget = form.amount.trim() || "—";
    const day = form.dailyRate.trim() || "—";
    const max = form.maxPerCall.trim() || "—";
    const payees = parsePayees(form.allowlist).length;
    return `${budget} XLM · ~${day}/day · max ${max}/pay · ${payees} payee${payees === 1 ? "" : "s"}`;
  }, [form]);

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function touchCore() {
    setTouched({
      agent: true,
      amount: true,
      dailyRate: true,
      maxPerCall: true,
      allowlist: true,
      cliff: showAdvanced,
      velocityMax: showAdvanced,
      velocityWindowHours: showAdvanced,
    });
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    touchCore();
    if (hasErrors) return;
    if (!wallet.address) {
      setTxStatus({
        kind: "error",
        title: "Wallet required",
        message: "Connect Freighter as admin first.",
      });
      return;
    }
    if (!wallet.networkOk) {
      setTxStatus({
        kind: "warning",
        title: "Wrong network",
        message: wallet.network?.message || "Switch Freighter to Testnet.",
      });
      return;
    }

    setTxStatus(pendingStatus("Create vault"));
    try {
      const allowlist = parsePayees(form.allowlist);

      // System defaults only when user left advanced empty
      const cliffSeconds = form.cliff.trim() || "0";
      const velocityMax = form.velocityMax.trim() || "0";
      const hoursRaw = form.velocityWindowHours.trim();
      const hours = hoursRaw === "" ? 1 : Number(hoursRaw);
      const windowSeconds =
        velocityMax === "0"
          ? "0"
          : String(Math.max(1, Math.round((Number.isFinite(hours) ? hours : 1) * 3600)));

      const sent = await createVaultTx({
        admin: wallet.address,
        agent: form.agent.trim(),
        token: NETWORK.nativeTokenContractId,
        amount: form.amount.trim(),
        cliffSeconds,
        releaseRate: dailyToPerSec(form.dailyRate.trim()),
        maxPerCall: form.maxPerCall.trim(),
        allowlist,
        velocityMax,
        velocityWindowSeconds: windowSeconds,
      });

      const hash = extractTxHash(sent);
      setSubmittedHash(hash ?? "submitted");
      setTxStatus(successStatus("Create vault", hash));
    } catch (err) {
      setTxStatus(errorStatus("Create vault", err));
    }
  }

  if (submittedHash) {
    return (
      <div className="success-enter mx-auto max-w-md space-y-8">
        <div className="space-y-3">
          <p className="mono-meta text-success">
            {"> vault created"}
            <span className="ascii-cursor-blink ml-0.5 inline-block w-[0.45em] bg-success align-middle">
              ▌
            </span>
          </p>
          <h1 className="text-3xl font-medium tracking-tight">Vault created</h1>
          <p className="text-sm leading-relaxed text-muted">
            {form.amount} XLM reserved for agent {shortAddress(form.agent)}.
          </p>
        </div>
        <TxStatusBanner status={txStatus} />
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/app">Back to dashboard</ButtonLink>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setForm(emptyForm);
              setTouched({});
              setSubmittedHash(null);
              setTxStatus(null);
              setShowAdvanced(false);
            }}
          >
            Create another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-md space-y-8">
      <div className="space-y-2">
        <p className="mono-meta uppercase tracking-wider">New vault</p>
        <h1 className="text-3xl font-medium tracking-tight">Fund an agent</h1>
        <p className="text-sm leading-relaxed text-muted">
          Deposit XLM from your connected wallet. Funds unlock daily; the agent can only pay
          allowlisted addresses.
        </p>
      </div>

      {!wallet.address ? (
        <TxStatusBanner
          status={{
            kind: "warning",
            title: "Connect Freighter",
            message: "You sign as admin and fund the vault.",
          }}
        />
      ) : !wallet.networkOk ? (
        <TxStatusBanner
          status={{
            kind: "warning",
            title: "Wrong network",
            message: wallet.network?.message || "Switch Freighter to Testnet.",
          }}
        />
      ) : (
        <p className="mono-meta" title={wallet.address}>
          admin · {shortAddress(wallet.address, 6)} · pays in XLM
        </p>
      )}

      <TxStatusBanner status={txStatus} />

      <div className="space-y-5">
        <Field
          label="Agent wallet"
          value={form.agent}
          error={touched.agent ? errors.agent : ""}
          placeholder="G…"
          onChange={(v) => updateField("agent", v)}
          onBlur={() => setTouched((t) => ({ ...t, agent: true }))}
        />

        <Field
          label="Budget"
          value={form.amount}
          error={touched.amount ? errors.amount : ""}
          placeholder="e.g. 10"
          suffix="XLM"
          onChange={(v) => updateField("amount", v)}
          onBlur={() => setTouched((t) => ({ ...t, amount: true }))}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Unlocks per day"
            value={form.dailyRate}
            error={touched.dailyRate ? errors.dailyRate : ""}
            placeholder="e.g. 5"
            suffix="XLM"
            onChange={(v) => updateField("dailyRate", v)}
            onBlur={() => setTouched((t) => ({ ...t, dailyRate: true }))}
          />
          <Field
            label="Max per payment"
            value={form.maxPerCall}
            error={touched.maxPerCall ? errors.maxPerCall : ""}
            placeholder="e.g. 1"
            suffix="XLM"
            onChange={(v) => updateField("maxPerCall", v)}
            onBlur={() => setTouched((t) => ({ ...t, maxPerCall: true }))}
          />
        </div>

        <Field
          label="Allowed payees"
          value={form.allowlist}
          error={touched.allowlist ? errors.allowlist : ""}
          placeholder="G… (comma or new line)"
          multiline
          onChange={(v) => updateField("allowlist", v)}
          onBlur={() => setTouched((t) => ({ ...t, allowlist: true }))}
          hint="Wallets or service accounts this agent may pay."
        />

        <div className="rounded-xl border border-line bg-surface px-4 py-3">
          <p className="mono-meta text-muted">policy</p>
          <p className="mt-1 font-mono text-xs text-fg sm:text-sm">{summary}</p>
        </div>

        <button
          type="button"
          className="mono-meta text-muted underline-offset-2 hover:text-fg hover:underline"
          onClick={() => setShowAdvanced((v) => !v)}
        >
          {showAdvanced ? "[ hide advanced ]" : "[ advanced ]"}
        </button>

        {showAdvanced ? (
          <div className="space-y-5 border-t border-line pt-5">
            <Field
              label="Cliff (seconds before any unlock)"
              value={form.cliff}
              error={touched.cliff ? errors.cliff : ""}
              placeholder="0"
              onChange={(v) => updateField("cliff", v)}
              onBlur={() => setTouched((t) => ({ ...t, cliff: true }))}
              hint="Leave empty for no cliff."
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Spend cap per window"
                value={form.velocityMax}
                error={touched.velocityMax ? errors.velocityMax : ""}
                placeholder="0 = off"
                suffix="XLM"
                onChange={(v) => updateField("velocityMax", v)}
                onBlur={() => setTouched((t) => ({ ...t, velocityMax: true }))}
              />
              <Field
                label="Window length"
                value={form.velocityWindowHours}
                error={touched.velocityWindowHours ? errors.velocityWindowHours : ""}
                placeholder="1"
                suffix="hours"
                onChange={(v) => updateField("velocityWindowHours", v)}
                onBlur={() => setTouched((t) => ({ ...t, velocityWindowHours: true }))}
              />
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          type="submit"
          disabled={submitting || hasErrors || !wallet.address || !wallet.networkOk}
        >
          {submitting ? "Signing…" : "Create vault"}
        </Button>
        <ButtonLink href="/app" variant="outline">
          Cancel
        </ButtonLink>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  onBlur,
  error,
  placeholder,
  hint,
  suffix,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  error?: string;
  placeholder: string;
  hint?: string;
  suffix?: string;
  multiline?: boolean;
}) {
  const inputClass =
    "min-h-11 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted/60 focus:border-fg " +
    (suffix ? "pr-14 font-mono" : "font-mono");

  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-fg">{label}</span>
      <span className="relative block">
        {multiline ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            placeholder={placeholder}
            rows={2}
            className={inputClass + " resize-y"}
          />
        ) : (
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            placeholder={placeholder}
            className={inputClass}
            inputMode={suffix ? "decimal" : undefined}
          />
        )}
        {suffix && !multiline ? (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted">
            {suffix}
          </span>
        ) : null}
      </span>
      {hint ? <span className="block text-xs text-muted">{hint}</span> : null}
      {error ? <span className="block text-xs text-danger">{error}</span> : null}
    </label>
  );
}
