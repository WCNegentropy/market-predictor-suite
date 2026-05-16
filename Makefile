NPM := npm
NODE := node
CLI := src/cli/index.js
SYMBOL ?= AAPL
ASSET ?= stocks
INTERVAL ?= 1d
TARGET_TYPE ?= direction
LOOKBACK ?= 365

.PHONY: install fetch train predict evaluate daily backtest report crypto stock clean-state

install:
	$(NPM) install

fetch:
	$(NODE) $(CLI) fetch --symbol $(SYMBOL) --asset $(ASSET) --interval $(INTERVAL) --lookback $(LOOKBACK)

train:
	$(NODE) $(CLI) train --symbol $(SYMBOL) --asset $(ASSET) --interval $(INTERVAL) --target-type $(TARGET_TYPE) --lookback $(LOOKBACK)

predict:
	$(NODE) $(CLI) predict --symbol $(SYMBOL) --asset $(ASSET) --interval $(INTERVAL) --target-type $(TARGET_TYPE) --lookback $(LOOKBACK)

evaluate:
	$(NODE) $(CLI) evaluate --symbol $(SYMBOL) --asset $(ASSET) --interval $(INTERVAL) --lookback $(LOOKBACK)

daily:
	$(NODE) $(CLI) run-daily --symbol $(SYMBOL) --asset $(ASSET) --interval $(INTERVAL) --target-type $(TARGET_TYPE) --lookback $(LOOKBACK)

backtest:
	$(NODE) $(CLI) backtest --symbol $(SYMBOL) --asset $(ASSET) --interval $(INTERVAL) --target-type $(TARGET_TYPE) --lookback $(LOOKBACK)

report:
	$(NODE) $(CLI) report --symbol $(SYMBOL) --asset $(ASSET) --interval $(INTERVAL) --lookback $(LOOKBACK)

stock:
	$(MAKE) daily SYMBOL=AAPL ASSET=stocks LOOKBACK=500

crypto:
	$(MAKE) daily SYMBOL=BTCUSD ASSET=crypto LOOKBACK=500

clean-state:
	rm -rf state/*
