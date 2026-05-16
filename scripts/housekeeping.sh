#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
SYMBOL="${1:-AAPL}"
ASSET="${2:-stocks}"
STATE_DIR="${3:-state}"
RETENTION_DAYS="${4:-120}"
MAX_PREDICTIONS="${5:-200}"
node src/cli/index.js prune-state --symbol "$SYMBOL" --asset "$ASSET" --state-dir "$STATE_DIR" --retention-days "$RETENTION_DAYS" --max-predictions "$MAX_PREDICTIONS"
node src/cli/index.js doctor --symbol "$SYMBOL" --asset "$ASSET" --state-dir "$STATE_DIR"
