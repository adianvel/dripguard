# DripGuard Frontend

Next.js app — **monochrome ASCII** marketing + Freighter vault console on Stellar testnet.

## Surfaces

| Route | Purpose |
|-------|---------|
| `/` | Landing — ASCII hero, Fund · Drip · Stop, guardrails |
| `/app` | Dashboard (list vaults) |
| `/app/new-vault` | Create vault + deposit |
| `/app/vaults/[id]` | Pause / revoke / drawdown / events |

## Identity

See root [`brand.md`](../brand.md). Tokens in `app/globals.css` (white canvas, black type/CTAs).

## Run

```powershell
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Freighter on **Testnet**.

## Bindings

```powershell
cd packages/dripguard-client
npm install
npm run build
```

## Demo video

Product video lives in [`../demo-video`](../demo-video) — `npm run render` there.
