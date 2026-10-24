---
title: 'Fuzzy time series (Python)'
sidebar_label: 'Fuzzy time series'
description: 'Python API for ferrifuzz.fts.FuzzyTimeSeries: Chen (1996) first- and high-order fuzzy time series forecasting with fit, forecast, predict and evaluate, plus Partition and FLRG.'
keywords: ['fuzzy time series python', 'FuzzyTimeSeries', 'forecasting python']
---

# `ferrifuzz.fts`

Chen (1996) fuzzy time series: partition the value range into fuzzy sets, learn which set
follows which, forecast by averaging. First order (FOFTS) and high order (HOFTS). The
method is explained step by step in [Fuzzy time series](../concepts/fuzzy-time-series.md);
the [enrollment forecasting tutorial](../tutorials/enrollment-forecasting.md) is a full
worked example.

```python
from ferrifuzz.fts import FuzzyTimeSeries
```

## `FuzzyTimeSeries`

```python
FuzzyTimeSeries(
    n_partitions=7,
    order=1,
    mf_type="triangle",
    partitioner="equal_width",
    margin=0.1,
    universe=None,
)
```

| Parameter | Default | Description |
|---|---|---|
| `n_partitions` | `7` | number of fuzzy sets $A_1 … A_n$ over the universe; must be ≥ 2 |
| `order` | `1` | how many past steps form a rule antecedent. `1` = first order, `≥ 2` = high order; must be ≥ 1 |
| `mf_type` | `"triangle"` | partition shape: `"triangle"` or `"gaussian"`; anything else raises `ValueError` |
| `partitioner` | `"equal_width"` | partitioning strategy; `"equal_width"` is the only one implemented |
| `margin` | `0.1` | when `universe` is not given: fraction of the data range added below the minimum and above the maximum |
| `universe` | `None` | explicit `(lo, hi)` universe of discourse; overrides the data range and `margin` |

Invalid arguments (`n_partitions < 2`, `order < 1`, an unknown `mf_type` or
`partitioner`, a `universe` with `lo ≥ hi`) raise `ValueError`.

Because every value is assigned to its highest‑membership partition and both shapes peak
at the same centers, `mf_type` does not change the forecasts; it only changes how the
partitions look when plotted.

Partitions are equal width: centers $c_i = lo + (i-1)\,\text{step}$ with
$\text{step} = (hi - lo)/(n - 1)$. Triangles reach from one neighbour's center to the
next; Gaussians use $\sigma = \text{step}/2$. Labels are `A1 … An`, low to high.

### `fit(series)`

Learns the universe, the partitions and the fuzzy logical relationship groups (FLRGs).
Returns `self`, so it chains. The series must be longer than `order`; a NaN or infinite
value in the training series raises `ValueError` (fill or drop missing values first).

```python
DATA = [13055, 13563, 13867, 14696, 15460, 15311, 15603, 15861, 16807, 16919, 16388,
        15433, 15497, 15145, 15163, 15984, 16859, 18150, 18970, 19328, 19337, 18876]

model = FuzzyTimeSeries(n_partitions=7, order=1).fit(DATA)
print(model.summary())
# FuzzyTimeSeries(n_partitions=7, order=1, mf_type='triangle', fitted, 5 FLRGs)
#   Universe    : [12426.8000, 19965.2000]
#   Partitions  : 7  (triangle)
#   FLRGs found : 5
```

### `forecast(series)`: one step ahead

<!-- skip-check -->
```python
model.forecast(series) -> list[float]
```

For each $t \ge \text{order}$, forecasts `series[t]` from `series[t-order:t]` only (no
look‑ahead). The result has `len(series) - order` values, aligned with `series[order:]`:

```python
y_pred = model.forecast(DATA)
y_true = DATA[model.order:]
```

### `predict(history, steps=1)`: multi step

<!-- skip-check -->
```python
model.predict(history, steps=1) -> list[float]
```

Forecasts `steps` values past the end of `history` (which needs at least `order`
values). Each forecast is fuzzified and fed back in as input for the next step, so a
first‑order model quickly settles on one value (here partition $A_6$ only ever leads to
itself).

```python
print(model.predict(DATA[-3:], steps=3))    # [18708.8, 18708.8, 18708.8]
```

### `evaluate(series)`

<!-- skip-check -->
```python
model.evaluate(series) -> dict[str, float]
```

Shortcut for `score(series[order:], model.forecast(series))`: RMSE, MAE and MAPE of the
one‑step‑ahead forecasts on the aligned window.

```python
print(model.evaluate(DATA))    # {'rmse': 535.81..., 'mae': 467.83..., 'mape': 2.87...}
```

To score on held‑out data, prepend the last `order` training values so the first test
point gets a forecast too: `model.evaluate(train[-model.order:] + test)`.

### Values outside the universe

A value outside the fitted universe (for example a test value larger than anything seen
in training) is mapped to the **nearest** partition: $A_1$ below the universe, $A_n$ above
it. Chen's model can therefore never forecast beyond the outermost partition centers.
If you know the plausible range in advance, set it with `universe=(lo, hi)` or widen
`margin`.

### Inspection

| Member | Description |
|---|---|
| `get_partitions()` | `list[Partition]`, low to high |
| `get_flrgs()` | `list[FLRG]` in order of first appearance |
| `summary()` | multi‑line description (universe, partitions, number of FLRGs) |
| `repr(model)` | one line, with `fitted, k FLRGs` or `not fitted` |
| `n_partitions`, `order`, `mf_type`, `partitioner`, `margin`, `universe` | the constructor arguments |

`forecast`, `predict`, `evaluate`, `get_partitions`, `get_flrgs` and `summary` raise
`RuntimeError` if called before `fit`.

## `Partition`

One fuzzy set of the universe.

| Member | Description |
|---|---|
| `label` | `"A1"`, `"A2"`, … |
| `center` | the partition's center (its MF peak) |
| `mf` | the underlying `Type1MF` |
| `membership(x)` | degree of `x` in this partition |

## `FLRG`

A fuzzy logical relationship group: an antecedent window and every partition that
followed it in the training data.

| Member | Description |
|---|---|
| `antecedent` | tuple of partition indices (0‑based), length `order` |
| `consequents` | list of partition indices that followed it (no duplicates) |

```python
for g in model.get_flrgs():
    print(g)
# FLRG(A2 -> A2, A3)
# FLRG(A3 -> A3, A4)
# FLRG(A4 -> A4, A5, A3)
# FLRG(A5 -> A4, A6)
# FLRG(A6 -> A6)
```

The forecast for a window is the mean of its consequents' centers. If a window never
occurred in training, the forecast is the center of the window's last partition.
