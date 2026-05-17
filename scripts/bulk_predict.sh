#!/bin/bash
# Bulk prediction generation for all supported tickers.

set -euo pipefail
cd "$(dirname "$0")/.."

STOCKS=("AAPL" "MSFT" "GOOGL" "AMZN" "TSLA" "NVDA" "META" "JPM" "V" "JNJ" "WMT" "PG" "BAC" "DIS" "MA" "ADBE" "PYPL" "NFLX" "CMCSA" "CRM" "KO" "PEP" "CVX" "XOM" "CSCO" "INTC" "PFE" "MRK" "T" "ABT" "AMGN" "QCOM" "TMO" "DHR" "ORCL" "HON" "COST" "AVGO" "UPS" "AMAT" "MCD" "BLK" "TXN" "GE" "CAT" "DE" "MMM" "LMT" "BA" "GS")
CRYPTO=("BTCUSD" "ETHUSD" "SOLUSD" "ADAUSD" "DOTUSD" "XRPUSD" "LINKUSD" "UNIUSD" "AVAXUSD" "DOGEUSD" "SHIBUSD" "ALGOUSD" "ATOMUSD" "TRXUSD" "XLMUSD" "ETCUSD" "FILUSD" "NEARUSD" "FTMUSD" "SANDUSD" "MANAUSD" "HBARUSD" "EGLDUSD" "ICPUSD" "VETUSD" "THETAUSD" "LDOUSD" "CRVUSD")

LOOKBACK=90
CONCURRENCY=4

get_prediction() {
    local symbol=$1
    local asset=$2
    # Only printing the 'horizons' output to minimize clutter
    echo "--- $asset/$symbol ---"
    node src/cli/index.js predict --symbol "$symbol" --asset "$asset" --lookback "$LOOKBACK" | jq '.horizons'
}

export -f get_prediction

echo "Generating bulk predictions (concurrency: $CONCURRENCY)..."
printf "%s\n" "${STOCKS[@]}" | xargs -n 1 -P $CONCURRENCY -I {} bash -c 'get_prediction "{}" "stocks"'
printf "%s\n" "${CRYPTO[@]}" | xargs -n 1 -P $CONCURRENCY -I {} bash -c 'get_prediction "{}" "crypto"'
