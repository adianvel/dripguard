# DripGuard

**Vesting-based spending governor for autonomous AI agents on Stellar.**

DripGuard is a Soroban smart contract that sits between a human treasury and an AI agent's spending wallet. Instead of handing an agent a full budget upfront, a human deposits funds into a DripGuard vault with a release schedule. The agent can only spend what has already "vested" — so even if the agent misbehaves, gets compromised, or loops out of control, the maximum possible loss is capped by design, not by luck.

---

## Why this exists

Payment rails for AI agents already exist on Stellar — **x402** and **MPP** let agents pay per request or pre-authorize a spending session. But neither protocol controls *how fast* funds can be drained once authorized. A single bad loop, a leaked key, or a prompt-injection attack can burn through an entire pre-authorized balance in seconds.

DripGuard adds the missing layer: **rate-limited, revocable, policy-gated spending**, built on the same linear-vesting logic used in token vesting contracts — just applied to agent budgets instead of employee grants.

| Vesting concept | DripGuard equivalent |
|---|---|
| Beneficiary | AI agent's wallet address |
| Cliff period | Warm-up delay before any spending is allowed |
| Linear vesting rate | Budget unlocked per second/hour/day |
| Claim function | `drawdown()` — agent pulls unlocked funds to pay a service |
| Admin revoke | `revoke()` / `pause()` — human can stop the agent instantly |
| Total grant | Total vault budget |

---

## Core guardrails

- **Linear drip** — funds unlock gradually over time, never all at once.
- **Per-call cap** — no single payment can exceed a configured maximum, even from unlocked funds.
- **Payee allowlist** — the agent can only pay pre-approved addresses.
- **Pause / Revoke** — the human admin can freeze a vault or reclaim unvested funds at any time.
- **Cliff (optional)** — delay before any funds become spendable, useful for review periods.

---

## Project structure

```
contracts/
└── dripguard/
    ├── src/
    │   ├── lib.rs       # contract logic
    │   └── test.rs      # test suite
    ├── Cargo.toml
    └── Makefile
Cargo.toml               # workspace root
Cargo.lock
```

---

## Contract interface

```rust
create_vault(admin, agent, token, amount, cliff_seconds, release_rate_per_sec, max_per_call, allowlist)
drawdown(agent, payee, amount)
vested_amount(agent) -> i128
pause(admin, agent)
revoke(admin, agent) -> i128   // returns unvested amount returned to admin
```

### `create_vault`
Called by the admin (human/treasury) to fund a new vault for a specific agent address. Sets the total budget, unlock rate, cliff, per-call cap, and allowlist of payees.

### `drawdown`
Called by the agent to pay a payee. Reverts if:
- the vault is paused,
- the payee isn't on the allowlist,
- the amount exceeds the per-call cap, or
- the amount exceeds what has currently vested.

### `vested_amount`
Read-only helper — returns how much budget has unlocked so far (regardless of how much has been claimed).

### `pause`
Admin-only emergency stop. Freezes all further `drawdown()` calls without destroying vault state.

### `revoke`
Admin-only. Permanently closes the vault and returns any unclaimed (unvested or vested-but-unclaimed) funds to the admin.

---

## Building & testing

```bash
# build the contract to WASM
make build

# run the test suite
make test
```

(Or via Soroban CLI directly: `soroban contract build` / `cargo test`)

---

## Roadmap

- [ ] Wire up real token transfers via the Soroban token client (`token::Client`)
- [ ] Velocity-based circuit breaker (auto-pause if spend rate spikes in a short window)
- [ ] Event emissions for dashboard/monitoring integration
- [ ] Integration with x402 / MPP payment flows
- [ ] Multi-agent vault management UI

---

## Status

🚧 Hackathon prototype — built for the Rise In x Stellar APAC Hackathon. Not audited. Do not use with real funds on Mainnet.