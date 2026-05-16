# market-predictor-suite

A local-first market prediction and decision-support CLI for stocks or crypto.

## What this project is

This package is a modular Node.js CLI that pulls free public market data, engineers standard technical features, trains lightweight predictive models, evaluates prior predictions, writes new predictions, and stores all state locally on disk.

It is designed to stay fully local and automation-friendly: no web server, no open ports, no public database, and no required paid API keys for the default setup.

## What it can do

- Fetch daily market bars for stocks or crypto through built-in provider fallback chains.
- Generate feature rows and market regime labels.
- Train a lightweight online model and blend it with heuristic signals.
- Run walk-forward backtests.
- Produce multi-horizon predictions.
- Apply additive tournament ranking, confidence gating, consensus policies, and position-sizing/risk rules.
- Persist standardized prediction and feedback ledgers for self-training.
- Import historical prediction/feedback archives and replay them into the feedback summary.

## Core workflows

### Basic cycle

1. Fetch fresh bars.
2. Evaluate any mature unresolved predictions.
3. Retrain/update the model.
4. Generate fresh predictions.
5. Save metrics, state, and ledger records.

### One-command daily cycle

```bash
node src/cli/index.js run-daily --symbol AAPL --asset stocks --lookback 365
node src/cli/index.js run-daily --symbol BTCUSD --asset crypto --lookback 365
```

## Main commands

```text
fetch
train
predict
evaluate
run-daily
backtest
tournament
tournament-predict
policy-predict
risk-predict
import-predictions
import-feedback
replay-feedback
feedback-report
report
prune-state
doctor
```

## Documentation map

- [ABOUT.md](./ABOUT.md) — plain-language project overview.
- [ARCHITECTURE.md](./ARCHITECTURE.md) — system design and runtime flow.
- [CLI_REFERENCE.md](./CLI_REFERENCE.md) — commands, arguments, and call patterns.
- [FILEMAP.md](./FILEMAP.md) — repo tree plus module-level responsibilities.
- [STATE_AND_LEDGERS.md](./STATE_AND_LEDGERS.md) — local persistence and schema overview.
- [AGENTS.md](./AGENTS.md) — agent/operator handoff notes.
- [CONTRIBUTING_NOTES.md](./CONTRIBUTING_NOTES.md) — safe extension guidance.

## Current repository shape

```text
.
./.gitignore
./Makefile
./README.md
./docs
./docs/confidence-policy.md
./docs/core-upgrade.md
./docs/execution-quality.md
./docs/model-quality-upgrade.md
./docs/multi-horizon-regime.md
./docs/position-sizing-risk.md
./docs/replay-import.md
./docs/seed-evaluation.md
./docs/self-training-feedback.md
./docs/strict-seed-evaluation.md
./docs/tournament-overlay.md
./docs/upg-notes.md
./package-lock.json
./package.json
./scripts
./scripts/cron-example.sh
./scripts/housekeeping.sh
./scripts/run-daily-safe.sh
./scripts/sweep-upg-strict.sh
./scripts/sweep-upg.sh
./src
./src/backtest
./src/backtest/walkForward.js
./src/cli
./src/cli/index.js
./src/config
./src/config/defaults.js
./src/data
./src/data/sources.js
./src/features
./src/features/indicators.js
./src/models
./src/models/ensemble.js
./src/models/heuristicSignals.js
./src/models/onlineLogistic.js
./src/models/policy.js
./src/models/risk.js
./src/models/selfTraining.js
./src/models/tournament.js
./src/pipeline
./src/pipeline/daily.js
./src/pipeline/importReplay.js
./src/pipeline/state.js
./src/utils
./src/utils/fs.js
./src/utils/http.js
./src/utils/lock.js
./src/utils/math.js
./src/utils/regime.js
./src/utils/stateMaintenance.js
./state
./state/crypto
./state/crypto/BTCUSD
./state/logs
./state/logs/run-stocks-AAPL-20260516-143403.json
./state/stocks
./state/stocks/AAPL
./test
./test/fixtures
./test/fixtures/sample-feedback-aapl.jsonl
./test/fixtures/sample-predictions-aapl.jsonl
./test/importReplay.test.js
./test/policy.test.js
./test/risk.test.js
./test/selfTraining.test.js
./test/stateMaintenance.test.js
./test/tournament.test.js
```
