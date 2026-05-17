#!/bin/bash
# Full daily pipeline execution for all supported tickers.
# Usage: ./scripts/run-all-daily.sh

set -euo pipefail
cd "$(dirname "$0")/.."

# Ticker lists
STOCKS=("AAPL" "MSFT" "GOOGL" "AMZN" "TSLA" "NVDA" "META" "JPM" "V" "JNJ" "WMT" "PG" "BAC" "DIS" "MA" "ADBE" "PYPL" "NFLX" "CMCSA" "CRM" "KO" "PEP" "CVX" "XOM" "CSCO" "INTC" "PFE" "MRK" "T" "ABT" "AMGN" "QCOM" "TMO" "DHR" "ORCL" "HON" "COST" "AVGO" "UPS" "AMAT" "MCD" "BLK" "TXN" "GE" "CAT" "DE" "MMM" "LMT" "BA" "GS")
CRYPTO=("BTCUSD" "ETHUSD" "SOLUSD" "ADAUSD" "DOTUSD" "XRPUSD" "LINKUSD" "UNIUSD" "AVAXUSD" "DOGEUSD" "SHIBUSD" "ALGOUSD" "ATOMUSD" "TRXUSD" "XLMUSD" "ETCUSD" "FILUSD" "NEARUSD" "FTMUSD" "SANDUSD" "MANAUSD" "HBARUSD" "EGLDUSD" "ICPUSD" "VETUSD" "THETAUSD" "LDOUSD" "CRVUSD")

# Settings
LOOKBACK=90
CONCURRENCY=4
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_DIR="logs/daily_run_$TIMESTAMP"
mkdir -p "$LOG_DIR"

run_ticker() {
    local symbol=$1
    local asset=$2
    local log="$LOG_DIR/${asset}_${symbol}.log"
    node src/cli/index.js run-daily --symbol "$symbol" --asset "$asset" --lookback "$LOOKBACK" > "$log" 2>&1
}

export -f run_ticker
export LOG_DIR LOOKBACK

echo "Starting daily batch run for all tickers (concurrency: $CONCURRENCY)..."
printf "%s\n" "${STOCKS[@]}" | xargs -n 1 -P $CONCURRENCY -I {} bash -c 'run_ticker "{}" "stocks"'
printf "%s\n" "${CRYPTO[@]}" | xargs -n 1 -P $CONCURRENCY -I {} bash -c 'run_ticker "{}" "crypto"'

echo "Daily batch processing complete. Logs available in $LOG_DIR"
