# State and Ledgers

## Local state model

The package stores state by asset and symbol under the configured state directory. The current persistent layout includes:

- `bars.json`
- `features.json`
- `model.json`
- `predictions.json`
- `metrics.json`
- `feedback.json`
- `prediction-ledger.jsonl`
- `feedback-records.jsonl`

## Purpose of each file

- **bars.json** — normalized market bars.
- **features.json** — generated feature rows, horizons, latest feature row, provider, and update metadata.
- **model.json** — trained horizon models, tournament metadata, and self-training summary snapshot.
- **predictions.json** — operational prediction history in local working form.
- **metrics.json** — evaluations, backtests, and summary statistics.
- **feedback.json** — derived summary built from resolved feedback records.
- **prediction-ledger.jsonl** — standardized prediction records using `mps.prediction.v1`.
- **feedback-records.jsonl** — standardized resolved-outcome records using `mps.feedback.v1`.

## Why two record styles exist

The package keeps both operational JSON state and standardized ledgers.

- Operational JSON files are convenient for local pipeline execution.
- Standardized JSONL ledgers are designed for portability, import/export, replay, and long-term self-training continuity.

## Import and replay behavior

Imported archives are validated, deduplicated, merged into the appropriate ledger, and then used to rebuild `feedback.json`.

This allows the package to bootstrap self-training from historical records instead of waiting for fresh live accumulation.
