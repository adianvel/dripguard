import { rpc, xdr, scValToNative } from "@stellar/stellar-sdk";
import { NETWORK, shortAddress } from "@/lib/config";
import { fromStroops } from "@/lib/stellar";

export type ChainActivity = {
  id: string;
  kind: "create" | "drawdown" | "pause" | "unpause" | "revoke" | "vel_trip" | "unknown";
  title: string;
  detail: string;
  time: string;
  ledger: number;
  txHash?: string;
};

function scValToString(val: xdr.ScVal | undefined | null): string | null {
  if (!val) return null;
  try {
    const native = scValToNative(val);
    if (typeof native === "string") return native;
    if (typeof native === "symbol" || typeof native === "bigint") return String(native);
  } catch {
    /* fall through */
  }
  try {
    if (val.switch().name === "scvSymbol") {
      return val.sym().toString();
    }
  } catch {
    /* ignore */
  }
  return null;
}

function formatKind(
  kind: string,
  agent: string | null,
  value: unknown,
): { title: string; detail: string; kind: ChainActivity["kind"] } {
  const agentShort = agent ? shortAddress(agent, 4) : "agent";
  switch (kind) {
    case "create": {
      let amount = "";
      if (Array.isArray(value) && value.length >= 2) {
        amount = ` ${fromStroops(value[1])} XLM`;
      }
      return {
        kind: "create",
        title: "Vault created",
        detail: `Agent ${agentShort} funded${amount}.`,
      };
    }
    case "drawdown": {
      let amount = "";
      let payee = "";
      if (Array.isArray(value) && value.length >= 2) {
        payee = typeof value[0] === "string" ? shortAddress(value[0], 4) : "";
        amount = ` ${fromStroops(value[1])} XLM`;
      }
      return {
        kind: "drawdown",
        title: "Drawdown",
        detail: `${agentShort} paid${amount}${payee ? ` → ${payee}` : ""}.`,
      };
    }
    case "pause":
      return { kind: "pause", title: "Vault paused", detail: `Admin paused ${agentShort}.` };
    case "unpause":
      return { kind: "unpause", title: "Vault unpaused", detail: `Admin unpaused ${agentShort}.` };
    case "revoke": {
      let remaining = "";
      if (Array.isArray(value) && value.length >= 2) {
        remaining = ` Refunded ${fromStroops(value[1])} XLM.`;
      }
      return {
        kind: "revoke",
        title: "Vault revoked",
        detail: `Vault for ${agentShort} closed.${remaining}`,
      };
    }
    case "vel_trip":
      return {
        kind: "vel_trip",
        title: "Velocity trip",
        detail: `Spend spike auto-paused ${agentShort}.`,
      };
    default:
      return {
        kind: "unknown",
        title: kind || "Contract event",
        detail: agent ? `Agent ${agentShort}` : "On-chain event",
      };
  }
}

/**
 * Fetch recent DripGuard contract events from Soroban RPC.
 */
export async function fetchContractActivity(limit = 20): Promise<ChainActivity[]> {
  const server = new rpc.Server(NETWORK.rpcUrl, { allowHttp: false });
  const latest = await server.getLatestLedger();
  const startLedger = Math.max(1, latest.sequence - 50_000);

  const page = await server.getEvents({
    startLedger,
    filters: [
      {
        type: "contract",
        contractIds: [NETWORK.contractId],
      },
    ],
    limit: Math.min(limit, 100),
  });

  const items: ChainActivity[] = [];

  for (const ev of page.events ?? []) {
    try {
      const topics = (ev.topic ?? []) as xdr.ScVal[];
      const kindSym = scValToString(topics[0]) ?? "unknown";
      const agent = scValToString(topics[1]);
      let value: unknown = null;
      try {
        value = ev.value ? scValToNative(ev.value as xdr.ScVal) : null;
      } catch {
        value = null;
      }

      const { title, detail, kind } = formatKind(kindSym, agent, value);
      const ledger = ev.ledger ?? 0;
      const id = `${ev.txHash ?? "tx"}-${ledger}-${kind}-${items.length}`;

      items.push({
        id,
        kind,
        title,
        detail,
        time: ev.ledgerClosedAt
          ? new Date(ev.ledgerClosedAt).toLocaleString()
          : `ledger ${ledger}`,
        ledger,
        txHash: ev.txHash,
      });
    } catch {
      // skip malformed events
    }
  }

  return items.reverse();
}
