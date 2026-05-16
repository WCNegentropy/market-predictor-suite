# Position sizing and risk rules

This pass adds a final execution layer on top of tournament and policy gating without changing the underlying data pipeline or models.

## Added

- Suggested normalized exposure fraction for allowed signals.
- Stop-loss, take-profit, and trailing-stop outputs derived from consensus quality.
- No-trade conditions that explicitly explain why a signal was blocked.
- A `risk-predict` CLI command with configurable risk and sizing thresholds.

## Default behavior

The default rules are conservative and will emit `hold` whenever the upstream gated policy is weak, consensus spread is too wide on average, or the risk/reward profile fails the configured minimum.
