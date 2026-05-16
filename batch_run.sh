#!/bin/bash

LOOKBACK=90
STOCKS=("AAPL" "TSLA" "NVDA" "MSFT" "SPY" "QQQ")
CRYPTO=("BTCUSD" "ETHUSD" "SOLUSD")

echo "=== Processing Stocks ==="
for symbol in "${STOCKS[@]}"; do
    echo "Processing $symbol..."
    node src/cli/index.js run-daily --symbol $symbol --asset stocks --lookback $LOOKBACK > /dev/null
    node src/cli/index.js risk-predict --symbol $symbol --asset stocks --lookback $LOOKBACK
done

echo "=== Processing Crypto ==="
for symbol in "${CRYPTO[@]}"; do
    echo "Processing $symbol..."
    node src/cli/index.js run-daily --symbol $symbol --asset crypto --lookback $LOOKBACK > /dev/null
    node src/cli/index.js risk-predict --symbol $symbol --asset crypto --lookback $LOOKBACK
done
