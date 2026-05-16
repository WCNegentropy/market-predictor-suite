# market-predictor-suite

A local-first, free-to-run MVP market prediction suite for stocks or crypto. It uses public JSON endpoints, stores everything on disk, generates daily predictions, scores yesterday's prediction against newly pulled data, and updates model weights before issuing the next prediction.

## Why this shape

This suite is organized as a modular CLI package instead of a server so it stays local, source-agnostic, cron-friendly, and easy to extend. The core split is:

- `data/`: adapters for public data sources.
- `features/`: signal engineering.
- `models/`: lightweight online-learning model.
- `backtest/`: walk-forward simulation.
- `pipeline/`: fetch -> train/update -> predict -> evaluate.
- `state/`: local JSON history, predictions, metrics, and learned weights.

## Data sources

Default source adapters are deliberately vendor-light and free:

- Stocks: Stooq daily candles via CSV over HTTPS.
- Crypto: Coinbase public candles endpoint.

These are simple, free, and require no account for the MVP. The adapter layer is isolated so you can swap in other compatible free endpoints later.

## Signals included

The starter model uses practical baseline signals:

- 1-period, 3-period, 5-period, 10-period momentum.
- SMA spread (5 vs 20, 10 vs 50).
- RSI(14).
- Rolling volatility(10).
- Volume z-score (when volume exists).
- Mean-reversion distance from SMA20.

## Prediction target

The default target is next-period direction (`up` / `down`) with a confidence score derived from a linear score passed through a logistic function. The suite also supports specialized targets via `--target-type` (e.g., `direction`, `pump`, `crash`). This keeps the MVP interpretable and easy to backtest.

## Local workflow

1. Fetch the newest historical bars for a symbol at a specified `--interval` (e.g., `1d`, `1h`, `15m`).
2. Score any outstanding prior prediction against the newest close.
3. Train/update the online model on all available labeled examples.
4. Save a new prediction for the next period.
5. Persist weights, metrics, features, and prediction logs locally.

## Quick start

```bash
npm install
npm run example:stock
npm run example:crypto
```

## CLI examples

```bash
node src/cli/index.js fetch --symbol AAPL --asset stocks --lookback 365
node src/cli/index.js train --symbol AAPL --asset stocks --lookback 365
node src/cli/index.js predict --symbol AAPL --asset stocks --lookback 365
node src/cli/index.js run-daily --symbol BTCUSD --asset crypto --lookback 365
node src/cli/index.js backtest --symbol AAPL --asset stocks --lookback 500
```

## Scheduling

Use cron, launchd, or Windows Task Scheduler. Example cron entry to run each trading day at 6pm local time:

```cron
0 18 * * 1-5 cd /path/to/market-predictor-suite && /usr/bin/node src/cli/index.js run-daily --symbol AAPL --asset stocks --lookback 500 >> state/cron.log 2>&1
```

## Notes

- No ports, databases, or public servers.
- Everything is file-based under `state/`.
- Model updates are intentionally lightweight so the system remains transparent and cheap to run.

## UPG-assisted iteration

This repo now includes a helper for future scaffold experiments:

```bash
./scripts/sweep-upg.sh output/generated-seeds 7 13 21 34
```

That command uses constrained UPG seeds for local `cli` and `library` targets so you can compare multiple boilerplates without drifting into server-first project shapes.

A simple make-based local workflow is also available:

```bash
make stock
make crypto
make report SYMBOL=BTCUSD ASSET=crypto LOOKBACK=500
```

## Strict UPG sweep

For a stricter Node-only scaffold search, use:

```bash
./scripts/sweep-upg-strict.sh output/generated-seeds-strict 7 13 21 34 42 55
```

This version pins both the language and runtime so UPG stays inside JavaScript/TypeScript local package shapes.

## Core upgrade

The suite now includes:

- Provider fallbacks for stocks and crypto.
- Leakage-free live prediction based on the newest unlabeled bar.
- A simple ensemble that blends online logistic learning with a heuristic signal model.
- Daily evaluation metrics with Brier score and pending-prediction tracking.

Example upgraded workflow:

```bash
node src/cli/index.js run-daily --symbol AAPL --asset stocks --lookback 250
node src/cli/index.js run-daily --symbol BTCUSD --asset crypto --lookback 250
node src/cli/index.js report --symbol AAPL --asset stocks
```

## Model quality upgrade

The latest pass improves model quality with:

- Additional standard technical signals, including EMA spread, MACD-style gap, stochastic oscillator, ATR, Bollinger z-score, breakout position, range compression, and short streak features.
- A Platt-style probability calibrator trained on recent walk-forward predictions.
- Stronger validation outputs, including log loss alongside accuracy and Brier score.

Example quality-focused checks:

```bash
node src/cli/index.js train --symbol AAPL --asset stocks --lookback 250
node src/cli/index.js backtest --symbol BTCUSD --asset crypto --lookback 250
node src/cli/index.js report --symbol AAPL --asset stocks
```

## Execution quality pass

The suite now includes execution hardening for unattended local runs:

- Per-target lock files to avoid overlapping executions.
- `doctor` for quick state inspection.
- `prune-state` for retention-based cleanup.
- `scripts/run-daily-safe.sh` for cron-friendly JSON-logged runs.
- `scripts/housekeeping.sh` for cleanup plus diagnostics.
- Built-in `node --test` coverage for core state-maintenance behavior.

Example operations:

```bash
node src/cli/index.js doctor --symbol AAPL --asset stocks
node src/cli/index.js prune-state --symbol AAPL --asset stocks --retention-days 120 --max-predictions 200 --dry-run
bash scripts/run-daily-safe.sh AAPL stocks 250 state
npm test
```


## Multi-horizon and regime pass

The suite now predicts across multiple horizons and tracks market regime context:

- Multi-horizon targets for 1-period, 3-period, and 5-period direction (`1p`, `3p`, `5p`).
- Regime labeling from trend, volatility, breakout state, and extremes (`spike-up`, `crash-down`).
- Horizon-specific walk-forward metrics, including regime-sliced accuracy, Brier score, and log loss.
- Live predictions that return a regime plus calibrated probabilities for each horizon.

Example commands:

```bash
node src/cli/index.js train --symbol AAPL --asset stocks --lookback 260
node src/cli/index.js backtest --symbol BTCUSD --asset crypto --lookback 260
node src/cli/index.js run-daily --symbol AAPL --asset stocks --lookback 260
```


## Tournament overlay

An additive tournament layer is now available without changing the core workflow:

- `tournament` ranks logistic, heuristic, raw ensemble, and calibrated ensemble entrants for each horizon.
- `tournament-predict` produces a live meta-ensemble overlay using tournament-derived weights.
- Existing commands still work the same way; this is an additional decision layer rather than a replacement.

Example commands:

```bash
node src/cli/index.js tournament --symbol AAPL --asset stocks --lookback 260
node src/cli/index.js tournament-predict --symbol BTCUSD --asset crypto --lookback 260
```


## Confidence gating and consensus policies

A new additive policy layer now sits on top of the tournament overlay:

- `policy-predict` computes per-horizon confidence and a final `long`, `short`, or `hold` action.
- The defaults are conservative and can be tuned with CLI flags.
- Core commands still behave the same; this is an extra decision layer.

Example commands:

```bash
node src/cli/index.js policy-predict --symbol AAPL --asset stocks --lookback 260
node src/cli/index.js policy-predict --symbol BTCUSD --asset crypto --lookback 260 --min-consensus-weight 0.6
```


## Position sizing and risk rules

A new additive risk layer now sits on top of policy gating:

- `risk-predict` outputs a final `long`, `short`, or `hold` plus exposure, stop loss, take profit, trailing stop, and no-trade reasons.
- This layer is still local and additive; it does not replace the underlying prediction, tournament, or policy commands.

Example commands:

```bash
node src/cli/index.js risk-predict --symbol AAPL --asset stocks --lookback 260
node src/cli/index.js risk-predict --symbol BTCUSD --asset crypto --lookback 260 --max-risk-fraction 0.008
```


## Self-training feedback loop

The suite now saves standardized prediction and resolved-feedback records so it can update itself from its own prior calls:

- `prediction-ledger.jsonl` stores normalized prediction outputs.
- `feedback-records.jsonl` stores normalized resolved outcomes after evaluation.
- `feedback-report` inspects the ledgers and self-training summary.
- `train`, `predict`, `tournament-predict`, `policy-predict`, and `risk-predict` now consume the feedback summary automatically.

Example commands:

```bash
node src/cli/index.js predict --symbol AAPL --asset stocks --lookback 260
node src/cli/index.js evaluate --symbol AAPL --asset stocks --lookback 260
node src/cli/index.js feedback-report --symbol AAPL --asset stocks
```


## Replay and import

You can now bulk load historical standardized records into the local ledgers:

- `import-predictions --input path/to/predictions.jsonl`
- `import-feedback --input path/to/feedback.jsonl`
- `replay-feedback` to rebuild the self-training summary from the imported ledgers

Example:

```bash
node src/cli/index.js import-predictions --symbol AAPL --asset stocks --input test/fixtures/sample-predictions-aapl.jsonl
node src/cli/index.js import-feedback --symbol AAPL --asset stocks --input test/fixtures/sample-feedback-aapl.jsonl
node src/cli/index.js replay-feedback --symbol AAPL --asset stocks
```
