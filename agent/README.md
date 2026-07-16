# DripGuard Agent Helper

CLI for autonomous agents that spend under a DripGuard vault policy.

## Setup

```bash
cd agent
npm install
```

Ensure `frontend/packages/dripguard-client` is built (`npm run build` in that package).

## Status (read-only)

```bash
npm run status -- --agent GAGENT...
```

## Drawdown

```bash
# Dry-run: policy check only
npm run drawdown -- --agent GAGENT... --payee GPAYEE... --amount 0.5 --dry-run

# Live (agent secret must match --agent)
set DRIPGUARD_SECRET=S...
npm run drawdown -- --agent GAGENT... --payee GPAYEE... --amount 0.5
```

Omit `--amount` to spend the largest safe amount:

`min(claimable, max_per_call, velocity_remaining)`.

## Environment

| Var | Purpose |
|---|---|
| `DRIPGUARD_SECRET` / `AGENT_SECRET` | Agent secret seed for signing |
| `--rpc` | Soroban RPC URL (default testnet) |
| `--contract` | Override contract ID |

## Policy the agent respects

1. Vault not paused  
2. Payee on allowlist  
3. Amount ≤ claimable  
4. Amount ≤ max per call  
5. Amount ≤ remaining velocity window (if enabled)  
