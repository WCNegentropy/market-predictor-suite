# Tournament and additive meta-ensemble overlay

This pass adds tournament-style ranking and a live meta-ensemble overlay without replacing the core workflow, dependencies, or model stack.

## Added

- A tournament module that ranks four entrants per horizon: online logistic, heuristic signals, raw ensemble, and calibrated ensemble.
- Horizon-level champions and regime-specific champions based on walk-forward performance.
- Normalized meta weights derived from tournament scores.
- A `tournament` CLI command for inspecting rankings.
- A `tournament-predict` CLI command for producing an additive live overlay that combines entrant probabilities into a meta probability.

## Non-breaking design

The existing `fetch`, `train`, `predict`, `evaluate`, `run-daily`, `backtest`, and `report` flows still exist. Tournament functionality is additive and uses the current trained models and walk-forward outputs.
