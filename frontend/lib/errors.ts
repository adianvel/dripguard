import { Errors as ContractErrors } from "dripguard-client";

/** Human-readable copy for DripGuard contract error codes. */
export const CONTRACT_ERROR_MESSAGES: Record<number, string> = {
  1: "Vault is paused. Unpause before drawdown.",
  2: "Payee is not on the allowlist.",
  3: "Amount exceeds the per-call cap.",
  4: "Amount exceeds the currently claimable (vested) balance.",
  5: "Spend velocity limit exceeded for this window. Vault may be auto-paused.",
  6: "Vault not found for this agent.",
  7: "Unauthorized — only the vault admin can do this.",
  8: "Invalid amount (must be greater than zero).",
  9: "A vault already exists for this agent.",
};

/** Known Freighter / network phrases → clearer guidance. */
const PATTERN_MESSAGES: Array<{ test: RegExp; message: string }> = [
  {
    test: /User declined|rejected|denied|cancelled|canceled/i,
    message: "Transaction was rejected in Freighter.",
  },
  {
    test: /network|passphrase|Test SDF|Public Global/i,
    message: "Wallet network mismatch. Switch Freighter to Testnet and try again.",
  },
  {
    test: /insufficient|balance|underfunded/i,
    message: "Insufficient token balance for this transaction (deposit or fees).",
  },
  {
    test: /Freighter|not found|extension/i,
    message: "Freighter wallet not available. Install and unlock Freighter.",
  },
  {
    test: /timeout|timed out|ECONNREFUSED|Failed to fetch|NetworkError/i,
    message: "Network or RPC error. Check your connection and try again.",
  },
];

function extractContractErrorCode(text: string): number | null {
  // Common shapes from SDK / host: Error(Contract, #3), contract error #3, error: 3
  const patterns = [
    /Error\(Contract,\s*#(\d+)\)/i,
    /contract error[#\s:]*(\d+)/i,
    /HostError[^\d]*(\d+)/i,
    /#(\d+)\s*$/m,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const code = Number(m[1]);
      if (Number.isFinite(code) && CONTRACT_ERROR_MESSAGES[code]) return code;
    }
  }

  // Match known error names from generated client
  for (const [code, meta] of Object.entries(ContractErrors)) {
    const name = meta?.message;
    if (name && text.includes(name) && CONTRACT_ERROR_MESSAGES[Number(code)]) {
      return Number(code);
    }
  }
  return null;
}

/**
 * Map any thrown value into a short user-facing message.
 */
export function formatUserError(err: unknown, fallback = "Something went wrong"): string {
  if (err == null) return fallback;

  const raw =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : typeof err === "object" && err !== null && "message" in err
          ? String((err as { message: unknown }).message)
          : String(err);

  const code = extractContractErrorCode(raw);
  if (code != null && CONTRACT_ERROR_MESSAGES[code]) {
    return CONTRACT_ERROR_MESSAGES[code];
  }

  for (const { test, message } of PATTERN_MESSAGES) {
    if (test.test(raw)) return message;
  }

  // Keep short; avoid dumping huge XDR blobs into the UI
  if (raw.length > 220) {
    return `${raw.slice(0, 200)}…`;
  }
  return raw || fallback;
}

export function extractTxHash(sent: unknown): string | null {
  if (!sent || typeof sent !== "object") return null;
  const s = sent as Record<string, unknown>;

  const sendResp = s.sendTransactionResponse as { hash?: string } | undefined;
  if (sendResp?.hash) return sendResp.hash;

  if (typeof s.hash === "string") return s.hash;

  const getResp = s.getTransactionResponse as { txHash?: string } | undefined;
  if (getResp?.txHash) return getResp.txHash;

  // AssembledTransaction sometimes nests under result
  const nested = s.result as Record<string, unknown> | undefined;
  if (nested) {
    const h = extractTxHash(nested);
    if (h) return h;
  }

  return null;
}
