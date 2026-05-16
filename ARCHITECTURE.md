# Architecture

## System layers

The package is organized into clear layers:

1. **CLI layer** — command surface and argument handling.
2. **Pipeline layer** — fetch, evaluate, train, predict, report, import, replay.
3. **Model layer** — heuristic signals, online logistic learner, ensemble, tournament, policy, risk, self-training.
4. **Feature layer** — technical indicators and regime classification.
5. **Data layer** — public-source adapters and normalization.
6. **Utility/state layer** — filesystem I/O, locking, math helpers, state maintenance.

## Runtime flow

### Standard daily flow

1. Pull the most recent historical bars.
2. Build the newest feature state.
3. Resolve any predictions whose target bars now exist.
4. Append resolved outcomes to feedback ledgers.
5. Rebuild feedback summary state.
6. Train/update horizon models and quality metadata.
7. Produce live predictions from the newest unlabeled feature row.
8. Persist prediction ledgers, metrics, and local JSON state.

### Decision overlay flow

After base prediction, the package can optionally pass output through higher-order decision layers:

1. **Tournament overlay** ranks entrants and forms a meta-ensemble.
2. **Policy layer** gates weak signals and requires consensus.
3. **Risk layer** converts allowed signals into exposure and stop/target rules.

### Target types

The system supports multiple target types via `--target-type`:
- `direction`: standard next-period up/down.
- `pump`: identification of significant upward moves.
- `crash`: identification of significant downward moves.

### Self-training flow

1. Predictions are written to a standardized prediction ledger.
2. Mature predictions are resolved into standardized feedback records.
3. Feedback records are summarized by horizon and regime.
4. Future probabilities are shifted/scaled by recent residual and error behavior.

## Primary source modules

### CLI

```text
./src/cli/index.js
```

Defines all end-user commands and common options.

### Pipelines

```text
./src/pipeline/daily.js
./src/pipeline/importReplay.js
./src/pipeline/state.js
```

These modules orchestrate operational flow, historical replay/import, and persistent state layout.

### Models

```text
./src/models/heuristicSignals.js
./src/models/onlineLogistic.js
./src/models/ensemble.js
./src/models/tournament.js
./src/models/policy.js
./src/models/risk.js
./src/models/selfTraining.js
```

These modules implement the predictive and decision logic in additive layers.

### Data and features

```text
./src/data/sources.js
./src/features/indicators.js
./src/utils/regime.js
```

These modules define how raw bars become engineered features and regime-aware rows.
