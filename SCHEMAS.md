# SCHEMAS

This document describes the main persisted JSON and JSONL shapes used by `market-predictor-suite` as of the current package state.

## Ledger schemas

### `mps.prediction.v1`

Used in `prediction-ledger.jsonl`.

#### Required top-level fields

- `schemaVersion`: always `mps.prediction.v1`
- `recordType`: `prediction_created`
- `predictionId`: stable unique identifier for the prediction event
- `createdAt`: ISO timestamp for record creation
- `asset`: `stocks` or `crypto`
- `symbol`: uppercase market symbol
- `provider`: data provider name used for the prediction context
- `baseTimestamp`: ISO timestamp of the feature row / reference bar
- `referenceClose`: close price used as the prediction reference
- `regime`: latest classified market regime
- `horizons`: object keyed by horizon labels such as `1d`, `3d`, `5d`

#### Horizon object fields

A horizon record may contain:

- `horizonDays`
- `probabilityUp`
- `baseProbabilityUp`
- `feedbackAdjustedProbabilityUp`
- `rawProbabilityUp`
- `probabilityDown`
- `direction`
- `components`
- `componentWeights`
- `calibrator`
- `feedbackAdjustment`
- later evaluation fields such as `targetTimestamp`, `actualClose`, `actualDirection`, `correct`, `brier`, `logLoss`, `scoredAt`

### `mps.feedback.v1`

Used in `feedback-records.jsonl`.

#### Required top-level fields

- `schemaVersion`: always `mps.feedback.v1`
- `recordType`: `prediction_resolved`
- `predictionId`
- `scoredAt`
- `asset`
- `symbol`
- `provider`
- `baseTimestamp`
- `targetTimestamp`
- `referenceClose`
- `actualClose`
- `regime`
- `horizon`
- `horizonDays`
- `probabilityUp`
- `baseProbabilityUp`
- `direction`
- `actual`
- `actualDirection`
- `correct`
- `brier`
- `logLoss`
- `components`
- `componentWeights`
- `feedbackAdjustment`

## Local JSON state files

### `bars.json`

Array of normalized bars:

```json
{
  "timestamp": "2026-05-15T13:30:00.000Z",
  "open": 298.1,
  "high": 301.0,
  "low": 297.4,
  "close": 300.23,
  "volume": 48521000
}
```

### `features.json`

Object containing:

- `trainingRowsByHorizon`
- `latestFeature`
- `provider`
- `updatedAt`
- `horizons`

The `latestFeature` shape typically includes:

- `timestamp`
- `close`
- `regime`
- `features` (engineered indicator object)

### `model.json`

Top-level object containing:

- `version`
- `horizons`
- `tournaments`
- `feedback`
- `selfTraining`
- `latestRegime`
- `lastTrainedAt`

#### `model.horizons[<label>]`

Each horizon model may include:

- logistic weights / bias internals
- `componentWeights`
- `calibrator`
- `quality`
- `feedback`
- `lastTrainedAt`
- training example counters

### `predictions.json`

Array of operational prediction objects. These are similar to ledger prediction records but may be enriched later with evaluation fields and working snapshots.

### `metrics.json`

Object with:

- `evaluations`
- `backtests`
- `summary`

### `feedback.json`

Derived summary object with:

- `schemaVersion` (`mps.feedback-summary.v1`)
- `recentObservations`
- `byHorizon`
- `byHorizonRegime`
- `updatedAt`
- `predictionLedgerCount`
- `feedbackLedgerCount`

## Command outputs

The public CLI currently exposes these commands:

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

The most important output families are:

- raw data/feature/model/report JSON from `fetch`, `train`, `report`
- live prediction JSON from `predict` and `tournament-predict`
- action/gating JSON from `policy-predict`
- execution/risk JSON from `risk-predict`
- ledger and feedback summary JSON from `feedback-report`, `import-predictions`, `import-feedback`, `replay-feedback`
