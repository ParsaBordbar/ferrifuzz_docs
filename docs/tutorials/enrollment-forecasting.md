---
title: 'Tutorial: Enrollment Forecasting with Fuzzy Time Series'
sidebar_label: 'Enrollment forecasting (FTS)'
description: "Chen's fuzzy time series on the University of Alabama enrollment data: in-sample fits, a train/test split, and why FTS cannot extrapolate."
keywords: ['fuzzy time series python', 'enrollment forecasting', 'chen 1996', 'forecasting']
---

# Enrollment forecasting with fuzzy time series

**Goal.** Forecast the University of Alabama enrollments for 1971–1992. This is the data set
Song & Chissom and Chen (1996) used to introduce fuzzy time series. This tutorial covers:

- fitting Chen's first- and high-order models and reading their rule groups (FLRGs),
- comparing orders and partition counts in-sample,
- an honest train/test split, and what happens when the test data leaves the training range.

You only need `ferrifuzz`. The theory is on the
[fuzzy time series concept page](../concepts/fuzzy-time-series.md).

## 1. Fit a model and look inside

```python
from ferrifuzz.fts import FuzzyTimeSeries
from ferrifuzz.metrics import score

YEARS = list(range(1971, 1993))
DATA = [13055, 13563, 13867, 14696, 15460, 15311, 15603, 15861, 16807, 16919, 16388,
        15433, 15497, 15145, 15163, 15984, 16859, 18150, 18970, 19328, 19337, 18876]

model = FuzzyTimeSeries(n_partitions=7, order=1).fit(DATA)
print(model.summary())
for flrg in model.get_flrgs():
    print(" ", flrg)
```

```text
FuzzyTimeSeries(n_partitions=7, order=1, mf_type='triangle', fitted, 5 FLRGs)
  Universe    : [12426.8000, 19965.2000]
  Partitions  : 7  (triangle)
  FLRGs found : 5
  FLRG(A2 -> A2, A3)
  FLRG(A3 -> A3, A4)
  FLRG(A4 -> A4, A5, A3)
  FLRG(A5 -> A4, A6)
  FLRG(A6 -> A6)
```

The universe is the data range padded by `margin=0.1` on each side, split into 7 equal-width
triangles `A1 … A7`. Indices are zero-based, so `(3,) → [3, 4, 2]` reads "after a year in A4,
the next year was in A4, A5 or A3". The forecast for that state is the average of those
partition centres.

## 2. Compare orders and partition counts (in-sample)

```python
print(f"{'order':>5}{'parts':>6}{'RMSE':>8}{'MAE':>8}{'MAPE%':>7}{'FLRGs':>6}")
for order in (1, 2, 3):
    for n in (7, 9, 11):
        m = FuzzyTimeSeries(n_partitions=n, order=order).fit(DATA)
        s = m.evaluate(DATA)          # one-step-ahead on DATA[order:]
        print(f"{order:>5}{n:>6}{s['rmse']:>8.1f}{s['mae']:>8.1f}{s['mape']:>7.2f}"
              f"{len(m.get_flrgs()):>6}")
```

```text
order parts    RMSE     MAE  MAPE% FLRGs
    1     7   535.8   467.8   2.88     5
    1     9   476.4   390.8   2.40     7
    1    11   490.0   414.4   2.58     8
    2     7   509.2   424.2   2.60    10
    2     9   349.6   301.3   1.86    13
    2    11   321.4   225.8   1.37    13
    3     7   470.9   411.4   2.48    15
    3     9   326.9   281.0   1.70    15
    3    11   296.9   211.4   1.26    15
```

`evaluate(series)` forecasts one step ahead at every point and scores the result against
`series[order:]`. That's the same as calling `score(series[order:], model.forecast(series))`.
A naive "next year = this year" forecast scores an RMSE of about 640 here, so every model
above beats it. Don't read too much into that, though. An order-3 model has 15 FLRGs for 19
transitions, so it has largely **memorized** the series.

## 3. Train on 1971–1986, test on 1987–1992

```python
SPLIT = 16                                    # train 1971-1986, test 1987-1992
train, test = DATA[:SPLIT], DATA[SPLIT:]
print("naive y[t-1]:", score(test, DATA[SPLIT - 1:-1]))

for order in (1, 2, 3):
    m = FuzzyTimeSeries(n_partitions=9, order=order).fit(train)
    # prepend the last `order` training values so the first test year is forecast too
    s = m.evaluate(train[-order:] + test)
    print(f"order {order}: RMSE {s['rmse']:7.1f}  MAE {s['mae']:7.1f}  MAPE {s['mape']:5.2f}%")
```

```text
naive y[t-1]: {'rmse': 757.7897685594161, 'mae': 635.6666666666666, 'mape': 3.4944501998700237}
order 1: RMSE  1678.4  MAE  1619.4  MAPE  8.62%
order 2: RMSE  1632.6  MAE  1571.1  MAPE  8.36%
order 3: RMSE  1632.6  MAE  1571.1  MAPE  8.36%
```

Out of sample, the fuzzy model loses badly to the naive forecast. To see why, print the
forecasts year by year:

```python
m = FuzzyTimeSeries(n_partitions=9, order=1).fit(train)
top = m.get_partitions()[-1]
print(f"highest partition {top.label} centred at {top.center:.0f}")
for year, actual, pred in zip(YEARS[SPLIT:], test, m.forecast(train[-1:] + test)):
    print(f"  {year}: actual {actual:6d}  forecast {pred:8.0f}")
```

```text
highest partition A9 centred at 17305
  1987: actual  16859  forecast    16146
  1988: actual  18150  forecast    16436
  1989: actual  18970  forecast    17305
  1990: actual  19328  forecast    17305
  1991: actual  19337  forecast    17305
  1992: actual  18876  forecast    17305
```

From 1988 on, enrollment is above anything seen in training (max 16 919). Values outside the
fitted universe map to the **nearest** partition, here `A9`. But a Chen model forecasts by
averaging partition *centres*, so it can never predict more than the highest centre it knows
(17 305). **Fuzzy time series interpolate. They do not extrapolate trends.**

### Fixing the universe in advance

If domain knowledge gives you plausible bounds, pass them as `universe=(lo, hi)` instead of
letting the model derive the universe from the training data:

```python
m = FuzzyTimeSeries(n_partitions=9, order=1, universe=(13000, 20000)).fit(train)
print(m.summary())
s = m.evaluate(train[-1:] + test)
print(f"RMSE {s['rmse']:.1f}  MAE {s['mae']:.1f}  MAPE {s['mape']:.2f}%")
```

```text
FuzzyTimeSeries(n_partitions=9, order=1, mf_type='triangle', fitted, 5 FLRGs)
  Universe    : [13000.0000, 20000.0000]
  Partitions  : 9  (triangle)
  FLRGs found : 5
RMSE 1044.6  MAE 784.2  MAPE 4.35%
```

That's better, but the model still can't beat the naive forecast. The partitions above the
training data have no FLRGs, so a state up there falls back to its own centre.

## What to notice

- **In-sample error isn't forecasting skill.** More partitions and a higher order always look
  better on the training series. Always hold out the last few years.
- **Always compare against a naive baseline.** `score(test, DATA[SPLIT-1:-1])` is one line,
  and it's the number your model has to beat.
- **Partition count trades resolution against coverage.** With many narrow partitions you
  learn more distinct states but see each one less often.

**Exercises.**
1. Try `mf_type="gaussian"`. Does the in-sample table change? Why or why not? Hint: think about
   which partition wins the fuzzification.
2. Forecast **differences** `DATA[t] - DATA[t-1]` instead of levels, then add them back. Does
   the model now beat the naive baseline on the test years?
3. Use `model.predict(train[-1:], steps=6)` for a free-running 6-year forecast and compare it
   with the one-step-ahead `forecast`.

The course's Rust projects reproduce section 2 with `ferrifuzz::fts` in `p4_enrollment_fts`.
See the [Rust FTS API](../rust-api/fts.md).
