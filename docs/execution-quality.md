# Execution quality pass

This pass hardens the local suite for repeated unattended operation.

## Additions

- File locking per asset/symbol target to prevent overlapping runs from corrupting local state.
- `prune-state` command to trim old scored predictions and stale metrics.
- `doctor` command to inspect state files, sizes, and modification times.
- `scripts/run-daily-safe.sh` for cron-friendly execution with JSON log capture.
- `scripts/housekeeping.sh` for state cleanup and quick diagnostics.
- Built-in Node tests for state maintenance behavior.

## Recommended local ops pattern

Run prediction on a schedule, then run housekeeping periodically:

```bash
bash scripts/run-daily-safe.sh AAPL stocks 250 state
bash scripts/run-daily-safe.sh BTCUSD crypto 250 state
bash scripts/housekeeping.sh AAPL stocks state 120 200
bash scripts/housekeeping.sh BTCUSD crypto state 120 200
```
