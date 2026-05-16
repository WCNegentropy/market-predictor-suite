# EXAMPLES_AND_CONTRACTS

This document provides concrete examples for the most important persisted and returned objects.

## Example prediction ledger record

```json
{
  "schemaVersion": "mps.prediction.v1",
  "recordType": "prediction_created",
  "predictionId": "stocks:AAPL:2026-05-15T13:30:00.000Z:1778943881598",
  "createdAt": "2026-05-16T15:04:41.598Z",
  "asset": "stocks",
  "symbol": "AAPL",
  "provider": "yahoo-chart",
  "baseTimestamp": "2026-05-15T13:30:00.000Z",
  "referenceClose": 300.2300109863281,
  "regime": "bull-high-vol-breakout",
  "horizons": {
    "1d": {
      "horizonDays": 1,
      "probabilityUp": 0.5606703248549876,
      "baseProbabilityUp": 0.5606703248549876,
      "feedbackAdjustedProbabilityUp": 0.5606703248549876,
      "rawProbabilityUp": 0.6135078657191617,
      "probabilityDown": 0.4393296751450124,
      "direction": "up",
      "components": {
        "logisticProbability": 0.39600448609112093,
        "heuristicProbability": 0.929012977044129
      },
      "componentWeights": {
        "logistic": 0.5919326177353209,
        "heuristic": 0.40806738226467903
      },
      "calibrator": {
        "a": 0.41816027550269114,
        "b": 0.05065882090584766,
        "sampleSize": 80
      },
      "feedbackAdjustment": {
        "applied": false,
        "baseProbabilityUp": 0.5606703248549876,
        "adjustedProbabilityUp": 0.5606703248549876,
        "residualShift": 0,
        "confidenceScale": 1,
        "feedbackObservations": 0,
        "regimeFeedbackObservations": 0
      }
    }
  }
}
```

## Example feedback ledger record

```json
{
  "schemaVersion": "mps.feedback.v1",
  "recordType": "prediction_resolved",
  "predictionId": "stocks:AAPL:2026-01-03T00:00:00.000Z:hist-1",
  "scoredAt": "2026-01-04T00:00:00.000Z",
  "asset": "stocks",
  "symbol": "AAPL",
  "provider": "historical-import",
  "baseTimestamp": "2026-01-03T00:00:00.000Z",
  "targetTimestamp": "2026-01-04T00:00:00.000Z",
  "referenceClose": 100,
  "actualClose": 99,
  "regime": "bull-high-vol-breakout",
  "horizon": "1d",
  "horizonDays": 1,
  "probabilityUp": 0.62,
  "baseProbabilityUp": 0.62,
  "direction": "up",
  "actual": 0,
  "actualDirection": "down",
  "correct": false,
  "brier": 0.3844,
  "logLoss": 0.9676,
  "components": {
    "logisticProbability": 0.6
  },
  "componentWeights": {
    "logistic": 1
  },
  "feedbackAdjustment": null
}
```

## Example feedback summary

```json
{
  "schemaVersion": "mps.feedback-summary.v1",
  "recentObservations": 2,
  "byHorizon": {
    "3d": {
      "observations": 1,
      "accuracy": 1,
      "avgBrier": 0.1764,
      "avgLogLoss": 0.5447,
      "avgResidual": 0.42,
      "avgEdge": 0.16,
      "latestScoredAt": "2026-01-06T00:00:00.000Z"
    },
    "1d": {
      "observations": 1,
      "accuracy": 0,
      "avgBrier": 0.3844,
      "avgLogLoss": 0.9676,
      "avgResidual": -0.62,
      "avgEdge": 0.24,
      "latestScoredAt": "2026-01-04T00:00:00.000Z"
    }
  }
}
```

## Example policy output shape

A `policy-predict` response contains:

- top-level provider, regime, base timestamp, reference close
- `config`
- per-horizon objects with `direction`, `probabilityUp`, `edge`, `confidence`, champion alignment, spread, gating status, and reasons
- `consensus` with dominant direction, action, consensus weight, aligned horizon counts, and reasons

## Example risk output shape

A `risk-predict` response contains:

- upstream `policy`
- final `action`
- `tradeAllowed`
- `noTradeConditions`
- `position` with `direction`, `exposureFraction`, `maxRiskFraction`, `positionRiskFraction`
- `risk` with `rewardToRisk`, stop loss fields, take profit fields, and trailing stop fields

## Suggested compatibility rules

When extending outputs:

- prefer adding fields instead of renaming fields
- preserve `schemaVersion` semantics for ledgers
- keep command output top-level keys stable where practical
- treat ledger files as portable contracts
