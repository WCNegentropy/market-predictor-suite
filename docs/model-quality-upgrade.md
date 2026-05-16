# Model quality upgrade

This pass upgrades model quality without leaving the local-first MVP design.

## Improvements

- Richer standard signals: EMA spread, MACD gap, stochastic oscillator, ATR percent, Bollinger z-score, breakout position, range compression, volume trend, and short streak features were added on top of the earlier momentum and moving-average set.
- Probability calibration: the ensemble now learns a simple Platt-style calibrator from recent walk-forward predictions so confidence scores are less raw and more usable.
- Better validation: walk-forward backtests now report accuracy, Brier score, and log loss.
- Better introspection: live predictions now store both raw and calibrated probabilities, component weights, and calibrator parameters.

## Why this matters

The original model could rank direction, but its probabilities were still rough. Calibration and a richer signal basis improve the odds that score magnitudes mean something operationally, not just the sign.
