# CLI Reference

## Common options

Most commands support these options:

- `--symbol <symbol>`
- `--asset <asset>` where asset is typically `stocks` or `crypto`
- `--lookback <days>`
- `--state-dir <dir>`

## Command catalog

### Core operations

- `fetch` — pull market data and persist feature-ready local state.
- `train` — train/update models and expose quality plus feedback-aware metadata.
- `predict` — issue live multi-horizon predictions and write prediction ledger records.
- `evaluate` — score mature predictions and write feedback records.
- `run-daily` — run the normal daily end-to-end cycle.
- `backtest` — run walk-forward tests on stored/generated rows.
- `report` — inspect current local state, model, metrics, predictions, and feedback summary.

### Meta-decision operations

- `tournament` — rank internal entrants and compute meta weights.
- `tournament-predict` — produce live tournament/meta overlay output.
- `policy-predict` — apply confidence gating and consensus policies.
- `risk-predict` — convert gated signals into suggested exposure and risk framing.

### Self-training and historical import

- `feedback-report` — inspect prediction/feedback ledgers plus derived summary state.
- `import-predictions --input <file[,file2]>` — import `mps.prediction.v1` archives.
- `import-feedback --input <file[,file2]>` — import `mps.feedback.v1` archives.
- `replay-feedback` — rebuild feedback summary from imported/existing ledgers.

### Maintenance and diagnostics

- `prune-state` — trim old predictions and metrics.
- `doctor` — inspect state files and sizes for a target.

## Example invocations

```bash
node src/cli/index.js fetch --symbol AAPL --asset stocks --lookback 365
node src/cli/index.js train --symbol AAPL --asset stocks --lookback 365
node src/cli/index.js predict --symbol BTCUSD --asset crypto --lookback 365
node src/cli/index.js policy-predict --symbol AAPL --asset stocks --lookback 260
node src/cli/index.js risk-predict --symbol BTCUSD --asset crypto --lookback 260
node src/cli/index.js import-feedback --symbol AAPL --asset stocks --input historical-feedback.jsonl
node src/cli/index.js replay-feedback --symbol AAPL --asset stocks
```
