# Contributing Notes

## Development posture

This repository favors clear modular code, small explicit files, and operational transparency over framework-heavy abstraction.

## When editing core modules

- Keep command names stable unless there is a strong reason to change them.
- Prefer adding fields over renaming/removing fields in persisted outputs.
- Preserve import/replay compatibility for ledger schemas.
- Keep new dependencies minimal.
- Add tests for regressions whenever state shape or scoring logic changes.

## Recommended verification steps

Run at least:

```bash
npm test
node src/cli/index.js doctor --symbol AAPL --asset stocks
node src/cli/index.js feedback-report --symbol AAPL --asset stocks
```

For behavior changes, also run one or more of:

```bash
node src/cli/index.js run-daily --symbol AAPL --asset stocks --lookback 365
node src/cli/index.js risk-predict --symbol BTCUSD --asset crypto --lookback 260
node src/cli/index.js replay-feedback --symbol AAPL --asset stocks
```

## Versioning guidance

Changes that alter ledger schemas, CLI contracts, or state expectations should be documented clearly and reflected in a schemaVersion or model version bump when appropriate.
