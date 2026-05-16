# File Map

## Source tree

```text
./src/backtest/walkForward.js
./src/cli/index.js
./src/config/defaults.js
./src/data/sources.js
./src/features/indicators.js
./src/models/ensemble.js
./src/models/heuristicSignals.js
./src/models/onlineLogistic.js
./src/models/policy.js
./src/models/risk.js
./src/models/selfTraining.js
./src/models/tournament.js
./src/pipeline/daily.js
./src/pipeline/importReplay.js
./src/pipeline/state.js
./src/utils/fs.js
./src/utils/http.js
./src/utils/lock.js
./src/utils/math.js
./src/utils/regime.js
./src/utils/stateMaintenance.js
```

## Documentation tree

```text
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
```

## Module responsibilities

### src/backtest

- **walkForward.js** — leakage-aware historical validation and model-quality tracking.

### src/cli

- **index.js** — executable command surface for all user and automation entry points.

### src/config

- **defaults.js** — default lookback/state settings.

### src/data

- **sources.js** — public-source adapters and fallback logic for stocks and crypto.

### src/features

- **indicators.js** — engineered technical features and training rows.

### src/models

- **heuristicSignals.js** — heuristic baseline signal engine.
- **onlineLogistic.js** — lightweight online logistic learner.
- **ensemble.js** — model blending and probability handling.
- **tournament.js** — entrant ranking and meta weighting.
- **policy.js** — confidence gating and consensus policy logic.
- **risk.js** — exposure sizing and stop/target logic.
- **selfTraining.js** — ledger helpers, feedback summaries, and probability adjustment.

### src/pipeline

- **daily.js** — main operational orchestration.
- **importReplay.js** — historical import and replay support.
- **state.js** — state path definitions and load/save logic.

### src/utils

- **fs.js** — filesystem helpers.
- **http.js** — HTTP helpers for public data pulls.
- **lock.js** — target-level lock file coordination.
- **math.js** — math/stat helpers.
- **regime.js** — period-agnostic horizon labels and regime classification.
- **stateMaintenance.js** — pruning and diagnostic helpers.
