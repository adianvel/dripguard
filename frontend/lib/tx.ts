import { assertFreighterNetwork } from "@/lib/network";
import { extractTxHash, formatUserError } from "@/lib/errors";
import type { TxStatusState } from "@/components/tx-status";

/**
 * Run a signing flow with network check + normalized errors/hashes.
 */
export async function runSignedTx(
  label: string,
  fn: () => Promise<unknown>,
): Promise<{ hash: string | null; raw: unknown }> {
  await assertFreighterNetwork();
  try {
    const raw = await fn();
    return { hash: extractTxHash(raw), raw };
  } catch (err) {
    throw new Error(formatUserError(err, `${label} failed`));
  }
}

export function pendingStatus(label: string): TxStatusState {
  return {
    kind: "pending",
    title: `${label}…`,
    message: "Confirm in Freighter if prompted.",
  };
}

export function successStatus(label: string, hash: string | null): TxStatusState {
  return {
    kind: "success",
    title: `${label} succeeded`,
    message: hash ? "Transaction confirmed on testnet." : "Transaction submitted.",
    hash,
  };
}

export function errorStatus(label: string, err: unknown): TxStatusState {
  return {
    kind: "error",
    title: `${label} failed`,
    message: formatUserError(err, `${label} failed`),
  };
}
