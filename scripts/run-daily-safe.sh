#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
SYMBOL="${1:-AAPL}"
ASSET="${2:-stocks}"
LOOKBACK="${3:-250}"
STATE_DIR="${4:-state}"
mkdir -p "$STATE_DIR"
LOG_DIR="$STATE_DIR/logs"
mkdir -p "$LOG_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
node src/cli/index.js run-daily --symbol "$SYMBOL" --asset "$ASSET" --lookback "$LOOKBACK" --state-dir "$STATE_DIR" | tee "$LOG_DIR/run-${ASSET}-${SYMBOL}-${STAMP}.json"
