---
title: 'Metrics (Python)'
sidebar_label: 'Metrics'
description: 'ferrifuzz.metrics: RMSE, MAE, MAPE and score for forecasts or any predicted-vs-observed sequences.'
---

# `ferrifuzz.metrics`

Error metrics for forecasts, or any observed‑vs‑predicted pair of sequences. Pure Python,
no NumPy needed. Every function takes two sequences (list, tuple, NumPy array, ...) and
returns a `float`.

```python
from ferrifuzz.metrics import rmse, mae, mape, score
```

| Function | Formula | Notes |
|---|---|---|
| `rmse(y_true, y_pred)` | $\sqrt{\frac{1}{n}\sum (y_i - \hat y_i)^2}$ | penalizes large errors most; same unit as the data |
| `mae(y_true, y_pred)` | $\frac{1}{n}\sum \lvert y_i - \hat y_i \rvert$ | average error size; same unit as the data |
| `mape(y_true, y_pred)` | $\frac{100}{n'}\sum_{y_i \ne 0} \left\lvert \frac{y_i - \hat y_i}{y_i} \right\rvert$ | in **percent**; pairs with $y_i = 0$ are skipped ($n'$ counts the rest) |
| `score(y_true, y_pred)` | all three | returns `{'rmse': ..., 'mae': ..., 'mape': ...}` |

Lower is better for all three.

```python
rmse([1, 2, 3], [1.1, 2.2, 2.8])              # 0.1732...
mae([1, 2, 3], [1.1, 2.2, 2.8])               # 0.1666...
mape([100, 200, 300], [110, 190, 310])        # 6.111...
score([1, 2, 4], [1, 3, 2])                   # {'rmse': 1.2909..., 'mae': 1.0, 'mape': 33.33...}
```

## Edge cases

- The two sequences are **zipped**: if their lengths differ, the extra values of the
  longer one are ignored silently. Align them yourself (for a fuzzy time series,
  `y_true = series[model.order:]`), or use `FuzzyTimeSeries.evaluate`, which does it for you.
- Empty input returns `nan`.
- `mape` returns `nan` when every true value is 0.

## Typical use

```python
from ferrifuzz.fts import FuzzyTimeSeries
from ferrifuzz.metrics import score

series = [13055, 13563, 13867, 14696, 15460, 15311, 15603, 15861, 16807, 16919, 16388,
          15433, 15497, 15145, 15163, 15984, 16859, 18150, 18970, 19328, 19337, 18876]
train, test = series[:17], series[17:]

model = FuzzyTimeSeries(n_partitions=7, order=1).fit(train)
y_pred = model.forecast(train[-1:] + test)    # one forecast per test value
print(score(test, y_pred))
print(model.evaluate(train[-1:] + test))      # the same numbers in one call
```

The same functions exist in Rust as `ferrifuzz::metrics`, see
[Rust metrics](../rust-api/metrics.md).
