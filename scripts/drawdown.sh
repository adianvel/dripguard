#!/usr/bin/env bash
# Agent drawdown helper for DripGuard on Stellar testnet.
# Usage: ./scripts/drawdown.sh --agent G... --payee G... --amount 0.5 --source agent-key

set -euo pipefail

AGENT=""
PAYEE=""
AMOUNT=""
SOURCE="dripguard-deployer"
NETWORK="testnet"
CONTRACT_ID="CBUGXL76MTPFKXB5ONRLHB34QHL76J2CL6RBFBRS53HH3TZ5TX53Z3ML"
DECIMALS=7

while [[ $# -gt 0 ]]; do
  case "$1" in
    --agent) AGENT="$2"; shift 2 ;;
    --payee) PAYEE="$2"; shift 2 ;;
    --amount) AMOUNT="$2"; shift 2 ;;
    --source) SOURCE="$2"; shift 2 ;;
    --network) NETWORK="$2"; shift 2 ;;
    --contract) CONTRACT_ID="$2"; shift 2 ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$AGENT" || -z "$PAYEE" || -z "$AMOUNT" ]]; then
  echo "Usage: $0 --agent G... --payee G... --amount 0.5 [--source key] [--network testnet]" >&2
  exit 1
fi

to_stroops() {
  local human="$1"
  local dec="$2"
  python3 - <<PY
human = "${human}".strip()
dec = ${dec}
neg = human.startswith("-")
if neg:
    human = human[1:]
whole, _, frac = human.partition(".")
whole = whole or "0"
frac = (frac + "0" * dec)[:dec]
value = int(whole) * (10 ** dec) + int(frac or "0")
print(-value if neg else value)
PY
}

STROOPS="$(to_stroops "$AMOUNT" "$DECIMALS")"

echo "DripGuard drawdown"
echo "  contract : $CONTRACT_ID"
echo "  network  : $NETWORK"
echo "  agent    : $AGENT"
echo "  payee    : $PAYEE"
echo "  amount   : $AMOUNT ($STROOPS stroops)"
echo "  source   : $SOURCE"
echo

stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source-account "$SOURCE" \
  --network "$NETWORK" \
  -- \
  drawdown \
  --agent "$AGENT" \
  --payee "$PAYEE" \
  --amount "$STROOPS"
