---
title: Fuzzy time series (Rust)
sidebar_label: Fuzzy time series
description: 'Chen (1996) first- and high-order fuzzy time series forecasting in Rust: FuzzyTimeSeries, Partition, Flrg and equal_width_partitions.'
keywords: ['fuzzy time series rust', 'forecasting']
---

# Fuzzy time series

`ferrifuzz::fts` implements Chen's (1996) fuzzy time series model, first-order (FOFTS) and
high-order (HOFTS). In outline:

1. Split the universe into $n$ evenly spaced, overlapping fuzzy sets $A_1 … A_n$.
2. Map each value to its best-matching set.
3. Learn **fuzzy logical relationship groups** (FLRGs): for each window of `order` consecutive
   sets, record which sets followed it.
4. Forecast by averaging the centers of those follow-up sets.

The method is explained step by step in
[Concepts → Fuzzy time series](../concepts/fuzzy-time-series.md).

```rust
use ferrifuzz::prelude::*;

fn main() -> Result<(), Error> {
    let series = [10.0, 12.0, 13.0, 12.0, 15.0, 16.0, 18.0, 17.0, 19.0, 21.0];

    let mut model = FuzzyTimeSeries::new(7, 1)?;   // 7 partitions, first order
    model.fit(&series)?;

    println!("{}", model.summary()?);
    let next = model.predict(&series, 3)?;         // 3 steps past the end
    let one_step = model.forecast(&series)?;       // aligned with series[1..]
    let scores = model.evaluate(&series)?;         // RMSE / MAE / MAPE of one_step
    println!("{next:?} {:.3}", scores.rmse);
    Ok(())
}
```

```text
FuzzyTimeSeries(n_partitions=7, order=1, mf_type='triangle', fitted, 6 FLRGs)
  Universe    : [8.9000, 22.1000]
  Partitions  : 7  (triangle)
  FLRGs found : 6
```

## `FuzzyTimeSeries`

### Configuration

| Method | Description |
|---|---|
| `FuzzyTimeSeries::new(n_partitions, order) -> Result<Self>` | `n_partitions ≥ 2`, `order ≥ 1`; otherwise `InvalidParameter`. `order == 1` is FOFTS, `order ≥ 2` is HOFTS. |
| `with_shape(self, PartitionShape) -> Self` | `Triangle` (default) or `Gaussian`. |
| `with_margin(self, margin) -> Self` | Fraction of the data range added on each side of the universe (default `0.1`). Ignored when a universe is set. |
| `with_universe(self, lo, hi) -> Self` | Partition exactly `[lo, hi]` instead of the data range plus margin. For example, Chen's enrollment study uses $U = [13000, 20000]$. `fit` errors unless `lo < hi`. |

`PartitionShape` is an alias of [`ferrifuzz::Shape`](./membership.md). Chen's method assigns
each value to its highest-membership partition, and both shapes peak at the same evenly spaced
centers. Triangle and gaussian partitions therefore produce the **same model**. The shape only
matters when you plot or inspect the partitions.

### Fitting and forecasting

| Method | Returns | Notes |
|---|---|---|
| `fit(&mut self, series: &[f64])` | `Result<&mut Self>` | Needs `series.len() > order`. A NaN or infinite value is an `InvalidInput` error (`series[3] is NaN; remove or fill missing values before fit()`). Refitting replaces the old model. |
| `predict(&self, history, steps)` | `Result<Vec<f64>>` | Forecasts `steps` values past the end of `history` (needs `≥ order` values). Each forecast is fed back in as the next input. |
| `forecast(&self, series)` | `Result<Vec<f64>>` | One-step-ahead forecast at every point, with no look-ahead. The result has `series.len() - order` values, aligned with `series[order..]`. |
| `evaluate(&self, series)` | `Result<Scores>` | `metrics::score(&series[order..], &forecast(series))`, i.e. RMSE / MAE / MAPE on the aligned window. |
| `fuzzify(&self, x)` | `usize` | Index of the partition with the highest membership (the first one on ties). |

Using a model before `fit` gives `Error::NotFitted`.

**Values outside the universe** (for example, test data above the training range) map to the
partition with the **nearest center**, so they are treated as "the highest known level" and
not as garbage. If your test data will go well beyond the training range, widen the universe
with `with_margin` or `with_universe`.

**Unseen patterns.** If a window was never seen during training, the forecast falls back to
the center of the window's last partition (a persistence forecast).

To forecast the first test value as well, prepend the last `order` training values:

```rust
use ferrifuzz::fts::FuzzyTimeSeries;

let series = [
    13055.0, 13563.0, 13867.0, 14696.0, 15460.0, 15311.0, 15603.0, 15861.0, 16807.0, 16919.0,
    16388.0, 15433.0, 15497.0, 15145.0, 15163.0, 15984.0, 16859.0, 18150.0, 18970.0, 19328.0,
    19337.0, 18876.0,
];
let (train, test) = series.split_at(17);
let order = 2;
let mut model = FuzzyTimeSeries::new(7, order)?;
model.fit(train)?;

// prepend the last `order` training values so every test value gets a forecast
let mut input = train[train.len() - order..].to_vec();
input.extend_from_slice(test);
let pred = model.forecast(&input)?;
assert_eq!(pred.len(), test.len());
```

### Inspection

| Method | Returns |
|---|---|
| `partitions()` | `&[Partition]`, ordered low to high |
| `flrgs()` | `&[Flrg]`, in order of first appearance |
| `universe()` | `(f64, f64)`, the partitioned range after `fit` |
| `is_fitted()`, `n_partitions()`, `order()`, `shape()`, `margin()` | settings and state |
| `summary()` | `Result<String>`, the multi-line text shown above |
| `Display` | `FuzzyTimeSeries(n_partitions=7, order=1, mf_type='triangle', fitted, 6 FLRGs)` |

## `Partition`

```rust
pub struct Partition {
    pub label: String,   // "A1", "A2", ...
    pub mf: Type1MF,
    pub center: f64,
}
```

`partition.membership(x)` evaluates its MF.

## `Flrg`

```rust
pub struct Flrg {
    pub antecedent: Vec<usize>,   // window of `order` partition indices
    pub consequents: Vec<usize>,  // every partition that followed it, without duplicates
}
```

`Display` prints `FLRG(A1 -> A2)`; the fields hold 0-based indices into `partitions()` (`A1` is index 0).

## `equal_width_partitions`

<!-- skip-check -->
```rust
pub fn equal_width_partitions(lo: f64, hi: f64, n: usize, shape: PartitionShape) -> Result<Vec<Partition>>
```

Returns `n` evenly spaced partitions over `[lo, hi]`, labelled `A1..An`. The first is centered
on `lo` and the last on `hi`. It uses [`mf::evenly_spaced`](./membership.md).

## See also

- [Metrics](./metrics.md): `Scores`, RMSE / MAE / MAPE
- [Tutorial: enrollment forecasting](../tutorials/enrollment-forecasting.md)
- [Python FTS](../python-api/fts.md)
