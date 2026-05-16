# Core suite upgrade

This upgrade improves the MVP in four important ways:

1. Provider fallbacks: stocks try Yahoo chart first and Stooq second, while crypto tries CryptoCompare first and Coinbase second.
2. Leakage-free live prediction: the suite now predicts from the latest **unlabeled** bar instead of the last already-labeled training row.
3. Simple ensemble: an online logistic learner is blended with a hand-tuned technical-signal heuristic, with adaptive component weighting based on recent loss.
4. Better scoring: predictions are evaluated once the next bar exists, with rolling summary metrics including accuracy, Brier score, and pending-count tracking.

This keeps the package local, cheap, interpretable, and much closer to the daily loop needed for a usable MVP.
