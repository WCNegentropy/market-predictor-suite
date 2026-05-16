# Multi-horizon and regime-aware pass

This pass upgrades the suite from a single next-bar classifier into a small local forecasting stack.

## Added

- Separate training rows and models for 1-day, 3-day, and 5-day directional targets.
- Regime classification from trend, volatility, and breakout posture.
- Walk-forward backtests that summarize performance by both horizon and regime.
- Live predictions that package all horizons together under the current detected regime.

## Why it matters

A short-horizon signal can work while a swing-horizon signal fails, and vice versa. Splitting horizons helps the suite avoid hiding that difference inside one blended score.
