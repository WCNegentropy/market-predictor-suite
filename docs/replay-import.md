# Replay and import

This pass adds bulk historical import and replay commands for the standardized ledgers.

## Commands

- `import-predictions --input file1.jsonl[,file2.jsonl]` imports `mps.prediction.v1` records.
- `import-feedback --input file1.jsonl[,file2.jsonl]` imports `mps.feedback.v1` records.
- `replay-feedback` rebuilds `feedback.json` from the existing local ledgers.

## Accepted formats

Each input file can be either JSONL/NDJSON or a JSON array of records.

## Purpose

This lets you backfill the self-training loop from older prediction archives instead of waiting for live accumulation one day at a time.
