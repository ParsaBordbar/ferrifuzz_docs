---
title: Defuzzification
sidebar_label: Defuzzification
description: 'Defuzzification methods in ferrifuzz: centroid, bisector, mean/smallest/largest of maxima and weighted average, with formulas and the sampling-grid caveat.'
keywords: ['defuzzification', 'centroid', 'bisector', 'mean of maxima']
---

# Defuzzification

A Mamdani system ends with one aggregated fuzzy set per output. Usually a hill, or several
hills, over the output universe. **Defuzzification** chooses one crisp number to represent
that set. Each method gives a different answer to "which number best represents this shape?"

## The methods

Let $\mu(y)$ be the aggregated output set over $[y_{\min}, y_{\max}]$ and
$h = \max_y \mu(y)$ its height.

| `defuzz_method=` | Aliases | Idea | Formula (continuous) |
|---|---|---|---|
| `"centroid"` *(default)* | `cog`, `coa` | center of gravity of the area | $y^* = \dfrac{\int y\,\mu(y)\,dy}{\int \mu(y)\,dy}$ |
| `"bisector"` | | vertical line that splits the area in half | $\int_{y_{\min}}^{y^*}\mu = \int_{y^*}^{y_{\max}}\mu$ |
| `"mom"` | | mean of the points where $\mu = h$ | $y^* = \text{mean}\{y : \mu(y) = h\}$ |
| `"som"` | | smallest point where $\mu = h$ | $y^* = \min\{y : \mu(y) = h\}$ |
| `"lom"` | | largest point where $\mu = h$ | $y^* = \max\{y : \mu(y) = h\}$ |
| `"weighted_average"` | `sugeno`, `wtaver` | firing-weighted average of rule outputs | $y^* = \dfrac{\sum_r w_r z_r}{\sum_r w_r}$ |

Method names are case-insensitive. An unknown name is an error:

```python
import ferrifuzz as ff

ff.FuzzySystem(defuzz_method="centriod")
# ferrifuzz.FuzzyError: unknown defuzzification method 'centriod' (did you mean 'centroid'?); valid options: ...
```

### Which to pick?

- **Centroid** is the standard choice. Its output changes smoothly as the inputs change,
  which matters in control. Its weak spot: the centroid of two separated hills can land in
  the gap between them, a value no rule recommended.
- **Bisector** is close to the centroid and a little less sensitive to long, thin tails.
- **MOM / SOM / LOM** look only at the highest part of the set. They pick the
  "most recommended" value, but the output jumps when a different rule becomes the
  strongest. Use them for decisions, not for smooth control.
- **Weighted average** is not really a Mamdani defuzzifier. It switches the system to
  [Sugeno inference](./inference.md), where no output set is built at all.

## Comparing methods

Take a tipper with `service = 6.5`. The `medium` and `high` rules both fire at 0.5, so the
aggregated set has two plateaus of height 0.5: $[12.5, 17.5]$ and $[22.5, 27.5]$.

```python
service = ff.Variable("service", 0, 10)
service["poor"] = ff.mf.trapezoid(0, 0, 2, 5)
service["good"] = ff.mf.triangle(2, 5, 8)
service["excellent"] = ff.mf.trapezoid(5, 8, 10, 10)

tip = ff.Variable("tip", 0, 30)
tip["low"] = ff.mf.triangle(0, 5, 10)
tip["medium"] = ff.mf.triangle(10, 15, 20)
tip["high"] = ff.mf.triangle(20, 25, 30)

for method in ["centroid", "bisector", "mom", "som", "lom", "weighted_average"]:
    s = ff.FuzzySystem(defuzz_method=method)
    s.add_input(service)
    s.add_output(tip)
    s += ff.Rule.from_string("IF service IS poor THEN tip IS low")
    s += ff.Rule.from_string("IF service IS good THEN tip IS medium")
    s += ff.Rule.from_string("IF service IS excellent THEN tip IS high")
    print(f"{method:17s} {s({'service': 6.5})['tip']:.4f}")
```

```text
centroid          19.9995
bisector          19.9500
mom               20.0619
som               12.6000
lom               27.4500
weighted_average  20.0000
```

The set is symmetric about 20, so centroid, bisector and MOM all land near 20. SOM and LOM
pick the outer edges of the two plateaus. The exact edges are 12.5 and 27.5. The printed
values differ for the reason explained next.

## The sampling-grid caveat

ferrifuzz evaluates the Mamdani defuzzifiers **numerically**. It samples the aggregated set
at `resolution + 1` evenly spaced points:

$$
y_i = y_{\min} + i \cdot \Delta,\qquad \Delta = \frac{y_{\max} - y_{\min}}{\text{resolution}},\qquad i = 0, \dots, \text{resolution}
$$

The integrals become sums over this grid. With the default `resolution=200` on a 0–30
universe, $\Delta = 0.15$. As a result:

- **SOM, LOM, MOM and bisector always return grid points** (or, for MOM, an average of grid
  points). The true LOM above is 27.5, but the nearest grid point at full height is 27.45.
- **Centroid** is a discrete approximation of the integral. It is very accurate, but it is
  not exact: 19.9995 instead of 20.
- **Singleton output terms** are almost never hit by the grid. Use them only with
  `defuzz_method="sugeno"`.

A finer grid is more accurate but slower (cost is linear in `resolution`):

| `resolution` | $\Delta$ | LOM | centroid |
|---|---|---|---|
| 20 | 1.5 | 27.0 | 19.95 |
| 200 *(default)* | 0.15 | 27.45 | 19.9995 |
| 2000 | 0.015 | 27.495 | 20.0 |

```python
ff.FuzzySystem(defuzz_method="lom", resolution=2000)
```

The weighted average (Sugeno) does not use the grid. It is exact at any resolution.

## When the output set is empty

If no rule fires for an output, the aggregated set is zero everywhere and has no centroid
and no maximum. ferrifuzz returns `nan` for that output, so that you notice, instead of an
arbitrary number such as the midpoint of the universe. See
[Mamdani vs Sugeno](./inference.md) for how to track down rules that never fire.

## Interval type-2 outputs

IT2 systems do not use `defuzz_method` (leave it at `"centroid"`; anything else is a
`ModelError`). They first apply **type reduction** to get an interval $[y_l, y_r]$ and
then take its midpoint. See [Interval type-2](./interval-type-2.md).

## In ferrifuzz

- Python: [`FuzzySystem(defuzz_method=..., resolution=...)`](../python-api/fuzzy-system.md)
- Rust: [`Defuzz` and `with_resolution`](../rust-api/system.md)
- Plotting the aggregated set: [`ferrifuzz.plot`](../python-api/plot.md)
