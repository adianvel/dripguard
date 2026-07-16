import { Buffer } from "buffer";
import {
  Client,
  networks,
  type VaultInfo,
} from "dripguard-client";
import {
  isConnected,
  isAllowed,
  requestAccess,
  getAddress,
  signTransaction,
} from "@stellar/freighter-api";
import { NETWORK } from "@/lib/config";
import { assertFreighterNetwork } from "@/lib/network";
import { formatUserError } from "@/lib/errors";

if (typeof window !== "undefined") {
  (window as unknown as { Buffer: typeof Buffer }).Buffer =
    (window as unknown as { Buffer?: typeof Buffer }).Buffer || Buffer;
}

export type { VaultInfo };

export type VaultView = {
  id: string;
  name: string;
  agent: string;
  admin: string;
  token: string;
  tokenLabel: string;
  totalBudget: number;
  vested: number;
  claimed: number;
  claimable: number;
  releaseRatePerSec: number;
  releaseRate: string;
  maxPerCall: number;
  cliffSeconds: number;
  cliff: string;
  status: "Active" | "Paused";
  payees: string[];
  startTime: number;
  velocityWindowSeconds: number;
  velocityMax: number;
  windowSpent: number;
  velocityEnabled: boolean;
};

function toBigInt(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  if (typeof value === "string") return BigInt(value);
  if (value && typeof value === "object" && "toString" in value) {
    return BigInt(String(value));
  }
  return BigInt(0);
}

/** Human units → stroops (7 decimals for XLM / SAC). */
export function toStroops(amount: string | number, decimals = NETWORK.tokenDecimals): bigint {
  const raw = String(amount).trim();
  if (!raw) return BigInt(0);
  const negative = raw.startsWith("-");
  const normalized = negative ? raw.slice(1) : raw;
  const [wholePart, fracPart = ""] = normalized.split(".");
  const whole = wholePart === "" ? "0" : wholePart;
  const frac = (fracPart + "0".repeat(decimals)).slice(0, decimals);
  const base = BigInt(10) ** BigInt(decimals);
  const stroops = BigInt(whole) * base + BigInt(frac || "0");
  return negative ? -stroops : stroops;
}

/** Stroops → human number for display. */
export function fromStroops(amount: unknown, decimals = NETWORK.tokenDecimals): number {
  const value = toBigInt(amount);
  const base = BigInt(10) ** BigInt(decimals);
  const whole = value / base;
  const frac = value % base;
  return Number(whole) + Number(frac) / Number(base);
}

export function formatTokenAmount(amount: unknown, symbol = "XLM") {
  const n = fromStroops(amount);
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 7,
  }).format(n)} ${symbol}`;
}

function formatDuration(seconds: number) {
  if (seconds <= 0) return "0 hours";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} hours`;
  return `${Math.round(seconds / 86400)} days`;
}

function tokenLabel(token: string) {
  if (token === NETWORK.nativeTokenContractId) return "XLM";
  return shortToken(token);
}

function shortToken(token: string) {
  return `${token.slice(0, 4)}…${token.slice(-4)}`;
}

export function vaultInfoToView(
  info: VaultInfo,
  vested: unknown,
  claimable: unknown,
): VaultView {
  const total = fromStroops(info.total_deposited);
  const claimed = fromStroops(info.claimed);
  const vestedN = fromStroops(vested);
  const claimableN = fromStroops(claimable);
  const rate = fromStroops(info.release_rate_per_sec);
  const symbol = tokenLabel(info.token);
  const cliff = Number(toBigInt(info.cliff_seconds));

  const velocityMax = fromStroops(info.velocity_max);
  const windowSpent = fromStroops(info.window_spent);
  const velocityWindowSeconds = Number(toBigInt(info.velocity_window_seconds));

  return {
    id: info.agent,
    name: `Agent ${info.agent.slice(0, 6)}…${info.agent.slice(-4)}`,
    agent: info.agent,
    admin: info.admin,
    token: info.token,
    tokenLabel: symbol,
    totalBudget: total,
    vested: vestedN,
    claimed,
    claimable: claimableN,
    releaseRatePerSec: rate,
    releaseRate: `${rate} ${symbol} / sec`,
    maxPerCall: fromStroops(info.max_per_call),
    cliffSeconds: cliff,
    cliff: formatDuration(cliff),
    status: info.paused ? "Paused" : "Active",
    payees: info.allowlist,
    startTime: Number(toBigInt(info.start_time)),
    velocityWindowSeconds,
    velocityMax,
    windowSpent,
    velocityEnabled: velocityMax > 0,
  };
}

async function freighterSign(
  xdr: string,
  opts?: {
    networkPassphrase?: string;
    address?: string;
  },
) {
  const result = await signTransaction(xdr, {
    networkPassphrase: opts?.networkPassphrase ?? NETWORK.networkPassphrase,
    address: opts?.address,
  });
  if (result.error) {
    throw new Error(result.error.message || "Freighter rejected the transaction");
  }
  return {
    signedTxXdr: result.signedTxXdr,
    signerAddress: result.signerAddress,
  };
}

export function createDripGuardClient(publicKey?: string) {
  return new Client({
    contractId: NETWORK.contractId,
    networkPassphrase: NETWORK.networkPassphrase,
    rpcUrl: NETWORK.rpcUrl,
    publicKey,
    signTransaction: publicKey
      ? async (xdr, opts) => freighterSign(xdr, opts)
      : undefined,
  });
}

export async function freighterAvailable() {
  try {
    const connected = await isConnected();
    return Boolean(connected.isConnected && !connected.error);
  } catch {
    return false;
  }
}

export async function connectFreighter(): Promise<string> {
  const available = await freighterAvailable();
  if (!available) {
    throw new Error("Freighter wallet not found. Install Freighter and unlock it.");
  }

  await assertFreighterNetwork();

  const allowed = await isAllowed();
  if (!allowed.isAllowed) {
    const access = await requestAccess();
    if (access.error || !access.address) {
      throw new Error(
        formatUserError(access.error?.message || "Freighter access was denied."),
      );
    }
    return access.address;
  }

  const addr = await getAddress();
  if (addr.error || !addr.address) {
    const access = await requestAccess();
    if (access.error || !access.address) {
      throw new Error(
        formatUserError(access.error?.message || "Could not read Freighter address."),
      );
    }
    return access.address;
  }
  return addr.address;
}

export async function fetchVaultView(agent: string): Promise<VaultView> {
  const client = createDripGuardClient();
  const [vaultTx, vestedTx, claimableTx] = await Promise.all([
    client.get_vault({ agent }),
    client.vested_amount({ agent }),
    client.claimable_amount({ agent }),
  ]);
  return vaultInfoToView(vaultTx.result, vestedTx.result, claimableTx.result);
}

export async function fetchAdminVaults(admin: string): Promise<VaultView[]> {
  const client = createDripGuardClient();
  const listTx = await client.list_vaults({ admin });
  const agents = listTx.result ?? [];
  if (agents.length === 0) return [];

  const views = await Promise.all(
    agents.map(async (agent) => {
      try {
        return await fetchVaultView(agent);
      } catch {
        return null;
      }
    }),
  );
  return views.filter((v): v is VaultView => v !== null);
}

export async function createVaultTx(params: {
  admin: string;
  agent: string;
  token: string;
  amount: string;
  cliffSeconds: string;
  releaseRate: string;
  maxPerCall: string;
  allowlist: string[];
  /** Max total spend inside the velocity window (human units). 0 = disabled. */
  velocityMax?: string;
  /** Velocity window length in seconds. */
  velocityWindowSeconds?: string;
}) {
  await assertFreighterNetwork();
  const client = createDripGuardClient(params.admin);
  const tx = await client.create_vault({
    admin: params.admin,
    agent: params.agent,
    token: params.token,
    amount: toStroops(params.amount),
    cliff_seconds: BigInt(params.cliffSeconds || "0"),
    release_rate_per_sec: toStroops(params.releaseRate),
    max_per_call: toStroops(params.maxPerCall),
    allowlist: params.allowlist,
    velocity_window_seconds: BigInt(params.velocityWindowSeconds || "3600"),
    velocity_max: toStroops(params.velocityMax || "0"),
  });
  const sent = await tx.signAndSend();
  return sent;
}

export async function pauseVaultTx(admin: string, agent: string) {
  await assertFreighterNetwork();
  const client = createDripGuardClient(admin);
  const tx = await client.pause({ admin, agent });
  return tx.signAndSend();
}

export async function unpauseVaultTx(admin: string, agent: string) {
  await assertFreighterNetwork();
  const client = createDripGuardClient(admin);
  const tx = await client.unpause({ admin, agent });
  return tx.signAndSend();
}

export async function revokeVaultTx(admin: string, agent: string) {
  await assertFreighterNetwork();
  const client = createDripGuardClient(admin);
  const tx = await client.revoke({ admin, agent });
  return tx.signAndSend();
}

export async function drawdownTx(params: {
  agent: string;
  payee: string;
  amount: string;
}) {
  await assertFreighterNetwork();
  const client = createDripGuardClient(params.agent);
  const tx = await client.drawdown({
    agent: params.agent,
    payee: params.payee,
    amount: toStroops(params.amount),
  });
  const sent = await tx.signAndSend();
  return sent;
}

// Re-export network constants used by UI
export { networks };
