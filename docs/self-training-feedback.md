# Self-training feedback loop

This pass makes the suite persist standardized prediction outputs and feed resolved outcomes back into future predictions.

## Added

- `prediction-ledger.jsonl` with normalized prediction records.
- `feedback-records.jsonl` with normalized resolved prediction records.
- `feedback.json` summary state derived from the standardized feedback ledger.
- Automatic self-training adjustments that shift and scale live probabilities by horizon and regime based on resolved prior prediction quality.
- `feedback-report` command for inspecting the ledgers and current self-training summary.

## Workflow

1. `predict` or `run-daily` writes standardized prediction records.
2. `evaluate` resolves matured predictions against the same live data source family and appends standardized feedback records.
3. `train`, `predict`, `tournament-predict`, `policy-predict`, and `risk-predict` consume the feedback summary to adjust future probabilities.
