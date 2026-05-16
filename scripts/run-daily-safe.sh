#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
SYMBOL="${1:-AAPL}"
ASSET="${2:-stocks}"
INTERVAL="${3:-1d}"
TARGET_TYPE="${4:-direction}"
LOOKBACK="${5:-250}"
STATE_DIR="${6:-state}"
mkdir -p "$STATE_DIR"
LOG_DIR="$STATE_DIR/logs"
mkdir -p "$LOG_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
node src/cli/index.js run-daily --symbol "$SYMBOL" --asset "$ASSET" --interval "$INTERVAL" --target-type "$TARGET_TYPE" --lookback "$LOOKBACK" --state-dir "$STATE_DIR" | tee "$LOG_DIR/run-${ASSET}-${SYMBOL}-${STAMP}.json"
