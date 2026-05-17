#!/bin/bash

# Configuration
LOG_FILE="logs/batch_run_$(date +%Y%m%d_%H%M%S).log"
ERROR_FILE="logs/batch_errors_$(date +%Y%m%d_%H%M%S).log"
LOOKBACK=90
CONCURRENCY=4

mkdir -p logs

STOCKS=("AAPL" "MSFT" "GOOGL" "AMZN" "TSLA" "NVDA" "META" "JPM" "V" "JNJ" "WMT" "PG" "BAC" "DIS" "MA" "ADBE" "PYPL" "NFLX" "CMCSA" "CRM" "KO" "PEP" "CVX" "XOM" "CSCO" "INTC" "PFE" "MRK" "T" "ABT" "AMGN" "QCOM" "TMO" "DHR" "ORCL" "HON" "COST" "AVGO" "UPS" "AMAT" "MCD" "BLK" "TXN" "GE" "CAT" "DE" "MMM" "LMT" "BA" "GS")
CRYPTO=("BTCUSD" "ETHUSD" "SOLUSD" "ADAUSD" "DOTUSD" "XRPUSD" "LINKUSD" "MATICUSD" "UNIUSD" "AVAXUSD" "DOGEUSD" "SHIBUSD" "ALGOUSD" "ATOMUSD" "TRXUSD" "XLMUSD" "ETCUSD" "FILUSD" "NEARUSD" "FTMUSD" "SANDUSD" "MANAUSD" "HBARUSD" "EGLDUSD" "ICPUSD" "VETUSD" "THETAUSD" "XMRUSD" "LDOUSD" "CRVUSD")

run_task() {
    local symbol=$1
    local asset_type=$2
    
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] Starting $symbol ($asset_type)..." >> "$LOG_FILE"
    
    # Run the daily task
    if node src/cli/index.js run-daily --symbol "$symbol" --asset "$asset_type" --lookback $LOOKBACK >> "$LOG_FILE" 2>&1; then
        echo "[$(date +'%Y-%m-%d %H:%M:%S')] Successfully processed $symbol" >> "$LOG_FILE"
    else
        echo "[$(date +'%Y-%m-%d %H:%M:%S')] FAILED: $symbol" | tee -a "$ERROR_FILE" >> "$LOG_FILE"
        return 1
    fi
}

export -f run_task
export LOG_FILE ERROR_FILE LOOKBACK

# Process lists with xargs for concurrency
echo "Starting batch processing (concurrency: $CONCURRENCY)..."
printf "%s\n" "${STOCKS[@]}" | xargs -n 1 -P $CONCURRENCY -I {} bash -c 'run_task "{}" "stocks"'
printf "%s\n" "${CRYPTO[@]}" | xargs -n 1 -P $CONCURRENCY -I {} bash -c 'run_task "{}" "crypto"'

echo "Batch processing complete. Check $LOG_FILE for details."
if [ -s "$ERROR_FILE" ]; then
    echo "Errors encountered. Check $ERROR_FILE for details."
    exit 1
fi
