#!/usr/bin/env node
/**
 * Read claimable / vault status for an agent (no signing).
 *
 * Usage:
 *   node bin/status.mjs --agent G...
 */
import { Client, networks } from "dripguard-client";

const args = parseArgs(process.argv.slice(2));
const agent = required(args, "agent");
const rpcUrl = args.rpc || "https://soroban-testnet.stellar.org";
const contractId = args.contract || networks.testnet.contractId;

const client = new Client({
  contractId,
  networkPassphrase: networks.testnet.networkPassphrase,
  rpcUrl,
});

try {
  const vaultTx = await client.get_vault({ agent });
  assertSimOk(vaultTx, "get_vault");
  const vestedTx = await client.vested_amount({ agent });
  assertSimOk(vestedTx, "vested_amount");
  const claimableTx = await client.claimable_amount({ agent });
  assertSimOk(claimableTx, "claimable_amount");

  const v = readResult(vaultTx);
  const vested = readResult(vestedTx);
  const claimable = readResult(claimableTx);

  console.log(
    JSON.stringify(
      {
        ok: true,
        contractId,
        agent: v.agent,
        admin: v.admin,
        paused: v.paused,
        total_deposited: str(v.total_deposited),
        claimed: str(v.claimed),
        vested: str(vested),
        claimable: str(claimable),
        max_per_call: str(v.max_per_call),
        velocity_max: str(v.velocity_max),
        velocity_window_seconds: str(v.velocity_window_seconds),
        window_spent: str(v.window_spent),
        allowlist: v.allowlist,
      },
      null,
      2,
    ),
  );
} catch (err) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: err?.message || String(err),
        hint: "Vault may not exist on this contract. Create one from the app or scripts/create-vault.ps1.",
        contractId,
        agent,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

function assertSimOk(tx, label) {
  const sim = tx?.simulation;
  if (sim?.error) {
    throw new Error(`${label} simulation failed: ${sim.error}`);
  }
}

function readResult(tx) {
  // Accessing .result throws if simulation failed
  const r = tx.result;
  if (r && typeof r === "object" && "error" in r && !("admin" in r) && !("toString" in r && typeof r === "bigint")) {
    // Err-like box from SDK
    if (r.error) throw new Error(r.error.message || "Contract error");
  }
  return r;
}

function str(v) {
  if (v == null) return null;
  if (typeof v === "bigint") return v.toString();
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return v;
  if (typeof v === "object" && typeof v.toString === "function") {
    const s = v.toString();
    if (s !== "[object Object]") return s;
  }
  return String(v);
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
      out[key] = val;
    }
  }
  return out;
}

function required(args, key) {
  if (!args[key] || args[key] === true) {
    console.error(`Missing --${key}`);
    process.exit(1);
  }
  return args[key];
}
