# About market-predictor-suite

## Purpose

market-predictor-suite is a local-first market prediction package intended to support daily market research, prediction generation, evaluation, and iterative improvement for either stocks or crypto.

The package focuses on being runnable on a single machine with public data, simple operational requirements, and transparent file-based state.

## Functional scope

The system is no longer just a predictor. It now behaves as a layered local decision engine:

- Data ingestion with fallback providers and custom intervals (`1d`, `1h`, `15m`).
- Technical feature generation.
- Multi-horizon model training for multiple target types (`direction`, `pump`, `crash`).
- Ensemble prediction.
- Tournament-style meta selection.
- Confidence gating and consensus policy.
- Position sizing and risk translation.
- Self-training from resolved prior predictions.
- Historical replay/import for bootstrapping the feedback loop.

## Design philosophy

The project is intentionally modular. Each major capability lives in its own source area so operators or agents can inspect, replace, or extend the system without rewriting the entire package.

The package is also intentionally conservative operationally: it persists to local files, uses locking for target runs, and exposes diagnostic/maintenance commands for inspection and cleanup.

## Intended users

This repo is suitable for:

- Solo developers building local market tooling.
- Researchers experimenting with interpretable market workflows.
- Agents that need an auditable file-based system instead of a hosted service.
- Operators who want prediction, evaluation, and feedback capture in one local package.
