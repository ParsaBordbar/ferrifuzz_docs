---
title: Metrics (Rust)
sidebar_label: Metrics
description: RMSE, MAE and MAPE forecasting metrics in Rust, plus the Scores struct.
---

# Metrics

`ferrifuzz::metrics` contains the standard error metrics for scoring forecasts. It works with
[fuzzy time series](./fts.md) output or with any pair of observed and predicted slices. The
module and `Scores` are in the prelude.

```rust
use ferrifuzz::prelude::*;

let y_true = [1.0, 2.0, 4.0];
let y_pred = [1.0, 3.0, 2.0];

let s: Scores = metrics::score(&y_true, &y_pred);
assert!((s.rmse - (5.0f64 / 3.0).sqrt()).abs() < 1e-12);
assert_eq!(s.mae, 1.0);
assert!((s.mape - 100.0 / 3.0).abs() < 1e-12);
```

| Function | Formula | Notes |
|---|---|---|
| `rmse(y_true, y_pred) -> f64` | $\sqrt{\frac{1}{n}\sum (y_i - \hat y_i)^2}$ | Penalizes large errors most. |
| `mae(y_true, y_pred) -> f64` | $\frac{1}{n}\sum \lvert y_i - \hat y_i \rvert$ | Average error size, in the data's units. |
| `mape(y_true, y_pred) -> f64` | $\frac{100}{n}\sum \left\lvert \frac{y_i - \hat y_i}{y_i} \right\rvert$ | In percent and scale-free. Pairs with $y_i = 0$ are skipped. |
| `score(y_true, y_pred) -> Scores` | all three | |

```rust
pub struct Scores {
    pub rmse: f64,
    pub mae: f64,
    pub mape: f64,
}
```

`Scores` is `Copy`, `Debug` and `PartialEq`. `FuzzyTimeSeries::evaluate` returns one.

## Edge cases

- **Different lengths.** The slices are zipped, so the longer one is truncated silently.
  `mae(&[1.0, 2.0, 3.0], &[1.0])` compares only the first pair and returns `0.0`. Align
  your data first. For FTS, compare `forecast(series)` with `series[order..]`.
- **Empty input.** All three metrics return `NaN`.
- **All-zero truths.** `mape` returns `NaN`, because every pair is skipped.

Lower is better for all three.
