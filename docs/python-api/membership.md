---
title: 'Membership functions (Python)'
sidebar_label: 'Membership functions'
description: 'ff.mf factory functions, Type1MF, IT2MF and the stand-alone shape classes.'
---

# Membership functions

For the math behind each shape, see [Membership functions](../concepts/membership-functions.md)
in Concepts.

## `ff.mf` factories

The usual way to create a membership function. Each returns a `Type1MF` (or an `IT2MF`
for `it2`) that can be assigned to a variable term.

| Factory | Parameters | Constraint (else `ValueError`) | Analytic `center()` |
|---|---|---|---|
| `ff.mf.triangle(a, b, c)` | feet `a`, `c`; peak `b` | `a ≤ b ≤ c` | `b` |
| `ff.mf.trapezoid(a, b, c, d)` | feet `a`, `d`; plateau `b..c` | `a ≤ b ≤ c ≤ d` | `(b + c) / 2` |
| `ff.mf.gaussian(center, sigma)` | peak `center`, spread `sigma` | `sigma > 0` | `center` |
| `ff.mf.bell(center, width, slope)` | $1 / (1 + \lvert (x-c)/w \rvert^{2s})$ | `width > 0`, `slope > 0` | `center` |
| `ff.mf.sigmoid(center, slope)` | $1 / (1 + e^{-s(x-c)})$; `slope > 0` rises, `< 0` falls | none | `center` |
| `ff.mf.singleton(x)` | 1 exactly at `x`, 0 elsewhere | none | `x` |
| `ff.mf.it2(upper, lower, lower_height=1.0)` | interval type‑2 set, see below | lower ≤ upper everywhere; `0 < lower_height ≤ 1` | midpoint of the two centers |

Invalid parameters raise `ff.FuzzyError` (a `ValueError`).

Shoulders: `triangle(a, a, c)` is a left shoulder (1 at `a`, falling to 0 at `c`) and
`triangle(a, c, c)` a right shoulder. Same for `trapezoid(a, a, c, d)` and
`trapezoid(a, b, d, d)`.

```python
import ferrifuzz as ff

hot = ff.mf.triangle(20, 40, 40)      # right shoulder
print(hot.membership(30.0))           # 0.5
print(hot.shape(), hot.center())      # Triangular 40.0

ff.mf.gaussian(50, 10).membership(60.0)   # 0.6065...  (one sigma away)
ff.mf.bell(50, 15, 2).membership(65.0)    # 0.5        (|x - c| = width)
ff.mf.sigmoid(50, 0.3).membership(50.0)   # 0.5
```

## `Type1MF`

Returned by every `ff.mf` factory except `it2`.

| Method | Returns | Description |
|---|---|---|
| `membership(x)` / `mf(x)` | `float` or array | degree at `x`; pass a list/array to evaluate many points at once |
| `center()` | `float` | analytic center (table above); the `z` used by Sugeno inference |
| `shape()` | `str` | `"Triangular"`, `"Trapezoidal"`, `"Gaussian"`, `"Singleton"`, `"Bell"` or `"Sigmoid"` |
| `key_points()` | `list[float]` | the breakpoints/centers that define the shape, e.g. `[0.0, 5.0, 10.0]` for `triangle(0, 5, 10)` |
| `repr(mf)` | `str` | e.g. `triangle(0, 5, 10)` |
| `mf == other` | `bool` | same shape and parameters |

### Vectorized evaluation

`membership` also accepts a list or 1‑D NumPy array and returns a NumPy array of the same
length (a list if NumPy isn't installed). This is much faster than a Python loop and is the
easiest way to plot a term:

```python
import numpy as np

xs = np.linspace(0, 40, 9)
print(hot.membership(xs))
# [0.   0.   0.   0.   0.   0.25 0.5  0.75 1.  ]
```

## `IT2MF`

An interval type‑2 set bounded by an **upper** MF (the outer edge of the footprint of
uncertainty) and a **lower** MF (the inner edge). Its membership is an interval
`(lower, upper)`.

```python
upper = ff.mf.triangle(0, 5, 10)
lower = ff.mf.triangle(2, 5, 8)
blurry = ff.mf.it2(upper, lower)

print(blurry.membership(3.0))    # (0.3333..., 0.6)  -> (lower, upper)
print(blurry.membership(5.0))    # (1.0, 1.0)
print(blurry.shapes())           # ('Triangular', 'Triangular')  -> (upper, lower)
print(blurry.upper, blurry.lower)
```

| Member | Description |
|---|---|
| `membership(x)` / `it2mf(x)` | `(lower_mu, upper_mu)` at `x`; for an array `x`, a pair of arrays `(lower, upper)` |
| `upper`, `lower` | the two `Type1MF`s (properties) |
| `lower_height` | scale applied to the lower MF (property, default `1.0`) |
| `center()` | midpoint of the upper and lower centers |
| `shapes()` | `(upper_shape, lower_shape)` |

`ff.IT2MF(upper, lower, lower_height=1.0)` is the same as `ff.mf.it2(...)`.

**Argument order is `it2(upper, lower)`.** Ferrifuzz checks that the lower MF never rises
above the upper one and raises `ff.FuzzyError` ("are they swapped?") otherwise.

`lower_height` scales the lower MF down, which gives the textbook IT2 triangle whose inner
triangle is shorter than the outer one:

```python
blurry = ff.mf.it2(ff.mf.triangle(0, 5, 10), ff.mf.triangle(2, 5, 8), lower_height=0.6)
print(blurry.membership(5.0))    # (0.6, 1.0)
```

Mixed shapes are fine, e.g. a Gaussian upper with a narrower Gaussian lower (uncertain
standard deviation), the most common IT2 design:

```python
uncertain_sigma = ff.mf.it2(ff.mf.gaussian(0, 0.3), ff.mf.gaussian(0, 0.15))
```

See [Interval type‑2](../concepts/interval-type-2.md) for how these sets are used in
inference.

## Stand‑alone shape classes

`ff.TriangularMF(a, b, c)`, `ff.TrapezoidalMF(a, b, c, d)`, `ff.GaussianMF(center, sigma)`,
`ff.BellMF(center, width, slope)`, `ff.SigmoidMF(center, slope)` and `ff.SingletonMF(x)`
construct a single shape directly, with the same parameters and checks as the factories.
They only have `membership(x)`. They are accepted anywhere a `Type1MF` is (for example as
the arguments of `ff.mf.it2`), but the factories are the recommended way to build terms.

```python
ff.BellMF(center=50.0, width=15.0, slope=2.0).membership(50.0)   # 1.0
```
