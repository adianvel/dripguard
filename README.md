# DripGuard

**Rate-limited spend for autonomous AI agents on Stellar.**

DripGuard is a Soroban vesting vault that sits between a human treasury and an agent wallet. Deposit XLM with a drip schedule, per-call cap, payee allowlist, velocity breaker, and instant pause/revoke — so a runaway agent can only burn what has already unlocked.

```
+----+     Fund → Drip → Stop
| DG |     Policy on-chain, not hope.
+----+
```

**Demo video:** [`demo-video/out/dripguard-demo.mp4`](demo-video/out/dripguard-demo.mp4)  
**Brand:** [`brand.md`](brand.md) — monochrome ASCII, whitespace, black CTAs

---

## Status

| Layer | State |
|---|---|
| Soroban contract (policy + real SEP-41 transfers) | Done + unit tests |
| Testnet deploy | `CBUGXL76MTPFKXB5ONRLHB34QHL76J2CL6RBFBRS53HH3TZ5TX53Z3ML` |
| Next.js UI (landing + Freighter console) | Done |
| Agent CLI (`status` / `drawdown`) | Done |
| Velocity circuit breaker | Done (auto-pause, no panic-rollback) |
| Mainnet / audit | **Not ready** — hackathon prototype only |

Network constants: [`deployments/testnet.json`](deployments/testnet.json).

---

## Why this exists

Agents can already pay on Stellar (x402, MPP, etc.). Once funds are authorized, nothing rate-limits drain speed. One bad loop, leaked key, or prompt injection can empty a budget in seconds.

DripGuard is the missing governor:

| Vesting idea | DripGuard |
|---|---|
| Beneficiary | Agent address |
| Cliff | Optional warm-up before any spend |
| Linear unlock | Budget per second |
| Claim | `drawdown(agent, payee, amount)` |
| Admin kill switch | `pause` / `revoke` |
| Total grant | Vault budget in custody |

---

## Core guardrails

1. **Fund** — admin deposits tokens into a vault for an agent.
2. **Drip** — budget unlocks on a schedule; agent only spends vested claimable.
3. **Stop** — pause, revoke, or velocity auto-freeze on spend spikes.

Also: **per-call max**, **payee allowlist**, optional **cliff**.

---

## Product surfaces

| Path | What |
|---|---|
| `/` | Marketing — monochrome ASCII hero, Fund · Drip · Stop, guardrails |
| `/app` | Dashboard — list vaults (Freighter admin) |
| `/app/new-vault` | Create vault + deposit XLM |
| `/app/vaults/[id]` | Detail — claimable, pause/unpause/revoke, drawdown, events |
| `agent/` | Headless CLI for autonomous drawdown under policy |

---

## Project layout

```
contracts/dripguard/          # Soroban contract (Rust)
frontend/                     # Next.js 16 + Freighter + TS bindings
frontend/packages/dripguard-client/
deployments/testnet.json      # Contract + SAC IDs
scripts/                      # PowerShell create / query / drawdown
agent/                        # npm CLI (status, drawdown)
demo-video/                   # Remotion demo (this repo’s product video)
brand.md                      # Visual identity
```

---

## Contract interface

```rust
create_vault(admin, agent, token, amount, cliff_seconds, release_rate_per_sec, max_per_call, allowlist)
drawdown(agent, payee, amount)
vested_amount(agent) -> i128
claimable_amount(agent) -> i128
get_vault(agent) -> VaultInfo
list_vaults(admin) -> Vec<Address>
pause(admin, agent)
unpause(admin, agent)
revoke(admin, agent) -> i128   // remaining tokens → admin
```

Amounts are **stroops** (1 XLM = 10_000_000). The UI converts human XLM amounts.

### Token flow

1. `create_vault` — `token.transfer(admin → contract, amount)` + store vault  
2. `drawdown` — policy checks, then `token.transfer(contract → payee, amount)`  
3. `revoke` — remove vault, `token.transfer(contract → admin, remaining)`

---

## Quick start

### 1. Contract build & test

```bash
# repo root
stellar contract build
cargo test --package dripguard
```

### 2. Frontend (live testnet)

```powershell
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

1. [Freighter](https://www.freighter.app/) → **Testnet**  
2. Fund via friendbot  
3. Connect in the app → **New vault** → create  
4. Dashboard / vault detail for pause, revoke, drawdown  

Optional env (`frontend/.env.local`):

```env
NEXT_PUBLIC_DRIPGUARD_CONTRACT_ID=CBUGXL76MTPFKXB5ONRLHB34QHL76J2CL6RBFBRS53HH3TZ5TX53Z3ML
NEXT_PUBLIC_NATIVE_TOKEN_CONTRACT_ID=CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
```

### 3. Agent CLI

```bash
cd agent
npm install
npm run status -- --agent GAGENT...
npm run drawdown -- --agent GAGENT... --payee GPAYEE... --amount 0.5 --dry-run
```

See [`agent/README.md`](agent/README.md).

### 4. Scripts (PowerShell)

```powershell
.\scripts\query-vault.ps1 -Agent GAGENT...
.\scripts\create-vault.ps1 -Admin GADMIN... -Agent GAGENT... -Payee GPAYEE... -Amount 10 -Source your-admin-key
.\scripts\drawdown.ps1 -Agent GAGENT... -Payee GPAYEE... -Amount 0.5 -Source your-agent-key
```

---

## Demo video

~30s monochrome product spot: problem → Fund · Drip · Stop → CTA.

```powershell
cd demo-video
npm install
npm run render
# output: demo-video/out/dripguard-demo.mp4
```

Preview studio: `npm run studio`.

---

## Deploy (testnet already live)

```bash
stellar keys generate dripguard-deployer --network testnet --fund
stellar contract deploy \
  --wasm target/wasm32v1-none/release/dripguard.wasm \
  --source dripguard-deployer \
  --network testnet
```

Record ID in `deployments/testnet.json`.  
Native XLM SAC (testnet): `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`

Explorer: [stellar.expert testnet contract](https://stellar.expert/explorer/testnet/contract/CBUGXL76MTPFKXB5ONRLHB34QHL76J2CL6RBFBRS53HH3TZ5TX53Z3ML)

---

## Roadmap

- [x] Real token transfers via Soroban `token::Client`
- [x] Testnet deploy + recorded IDs
- [x] Freighter wallet + live reads/txs
- [x] Agent CLI drawdown
- [x] Velocity circuit breaker
- [x] On-chain event feed (RPC)
- [x] Tx feedback + error mapping + network checks
- [x] Marketing landing (ASCII) + demo video scaffold
- [ ] Durable event indexer
- [ ] x402 / MPP integration
- [ ] Mainnet hardening + audit

---

## Disclaimer

Hackathon prototype (Rise In × Stellar APAC). **Not audited. Do not use real mainnet funds.**
