# Confidence gating and consensus policies

This pass adds a decision layer on top of the tournament overlay without changing the base data, training, prediction, or evaluation workflow.

## Added

- Per-horizon confidence scoring from edge, champion agreement, regime-champion agreement, and entrant spread.
- Horizon-level gating that can downgrade weak signals to hold.
- Cross-horizon consensus logic that requires enough aligned horizons and enough weighted agreement before emitting a long or short action.
- Configurable thresholds through `policy-predict` command flags.

## Default behavior

The default policy is intentionally conservative. It prefers `hold` when entrant disagreement is high or when not enough horizons align.
