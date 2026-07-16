#!/usr/bin/env node
/**
 * Agent drawdown helper for DripGuard.
 *
 * Checks claimable balance, clamps to max_per_call / velocity remaining,
 * then signs drawdown via a secret key (or prints the planned action in --dry-run).
 *
 * Usage:
 *   DRIPGUARD_SECRET=S... node bin/drawdown.mjs --agent G... --payee G... --amount 0.5
 *   node bin/drawdown.mjs --agent G... --payee G... --amount 0.5 --secret S... --dry-run
 *
 * Amount is human XLM (7 decimals). Omitting --amount spends min(claimable, max_per_call, velocity_left).
 */
import { Keypair, TransactionBuilder } from "@stellar/stellar-sdk";
import { Client, networks } from "dripguard-client";

const DECIMALS = 7;
const args = parseArgs(process.argv.slice(2));

const agent = required(args, "agent");
const payee = required(args, "payee");
const rpcUrl = args.rpc || "https://soroban-testnet.stellar.org";
const contractId = args.contract || networks.testnet.contractId;
const networkPassphrase = networks.testnet.networkPassphrase;
const dryRun = Boolean(args["dry-run"]);
const secret = args.secret || process.env.DRIPGUARD_SECRET || process.env.AGENT_SECRET;

const client = new Client({
  contractId,
  networkPassphrase,
  rpcUrl,
});

let vault;
let claimable;
try {
  const vaultTx = await client.get_vault({ agent });
  const claimableTx = await client.claimable_amount({ agent });
  vault = vaultTx.result;
  claimable = BigInt(claimableTx.result.toString());
} catch (err) {
  fail(err?.message || String(err));
}

if (vault.paused) {
  fail("Vault is paused — cannot drawdown.");
}
if (!vault.allowlist.includes(payee)) {
  fail(`Payee ${payee} is not on the allowlist.`);
}

const maxPerCall = BigInt(vault.max_per_call);
let velocityLeft = null;
if (BigInt(vault.velocity_max) > 0n) {
  velocityLeft = BigInt(vault.velocity_max) - BigInt(vault.window_spent);
  if (velocityLeft < 0n) velocityLeft = 0n;
}

let amount;
if (args.amount && args.amount !== true) {
  amount = toStroops(args.amount);
} else {
  amount = claimable;
  if (amount > maxPerCall) amount = maxPerCall;
  if (velocityLeft != null && amount > velocityLeft) amount = velocityLeft;
}

if (amount <= 0n) {
  fail("Nothing to drawdown (claimable/velocity/cap is zero).");
}
if (amount > claimable) fail(`Amount ${amount} exceeds claimable ${claimable}.`);
if (amount > maxPerCall) fail(`Amount exceeds max_per_call ${maxPerCall}.`);
if (velocityLeft != null && amount > velocityLeft) {
  fail(`Amount exceeds remaining velocity window ${velocityLeft}.`);
}

console.log(
  JSON.stringify(
    {
      action: "drawdown",
      agent,
      payee,
      amount_stroops: amount.toString(),
      amount_xlm: fromStroops(amount),
      claimable: claimable.toString(),
      max_per_call: maxPerCall.toString(),
      velocity_left: velocityLeft?.toString() ?? null,
      dry_run: dryRun,
    },
    null,
    2,
  ),
);

if (dryRun) {
  process.exit(0);
}

if (!secret) {
  fail("Provide --secret S... or DRIPGUARD_SECRET for signing (or pass --dry-run).");
}

const kp = Keypair.fromSecret(secret);
if (kp.publicKey() !== agent) {
  fail(`Secret key public ${kp.publicKey()} does not match --agent ${agent}.`);
}

// Use generated client with local signer
const signingClient = new Client({
  contractId,
  networkPassphrase,
  rpcUrl,
  publicKey: agent,
  signTransaction: async (xdrStr) => {
    const tx = TransactionBuilder.fromXDR(xdrStr, networkPassphrase);
    tx.sign(kp);
    return {
      signedTxXdr: tx.toXDR(),
      signerAddress: agent,
    };
  },
});

const assembled = await signingClient.drawdown({
  agent,
  payee,
  amount,
});
const sent = await assembled.signAndSend();
const hash =
  sent?.sendTransactionResponse?.hash ||
  sent?.hash ||
  null;

console.log(
  JSON.stringify(
    {
      ok: true,
      hash,
      explorer: hash
        ? `https://stellar.expert/explorer/testnet/tx/${hash}`
        : null,
    },
    null,
    2,
  ),
);

function fail(msg) {
  console.error(JSON.stringify({ ok: false, error: msg }));
  process.exit(1);
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

function toStroops(human) {
  const raw = String(human).trim();
  const [w, f = ""] = raw.split(".");
  const frac = (f + "0".repeat(DECIMALS)).slice(0, DECIMALS);
  return BigInt(w || "0") * 10n ** BigInt(DECIMALS) + BigInt(frac || "0");
}

function fromStroops(v) {
  const base = 10n ** BigInt(DECIMALS);
  const whole = v / base;
  const frac = v % base;
  return `${whole}.${frac.toString().padStart(DECIMALS, "0")}`.replace(/\.?0+$/, (m) =>
    m.startsWith(".") ? "" : m,
  );
}
