#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node src/cli/index.js run-daily --symbol "${1:-AAPL}" --asset "${2:-stocks}" --lookback "${3:-500}"
