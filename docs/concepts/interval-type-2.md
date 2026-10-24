---
title: Interval type-2 fuzzy sets
sidebar_label: Interval type-2
description: 'Interval type-2 fuzzy logic explained: the footprint of uncertainty, interval firing strengths, and Karnik–Mendel, center-of-sets and height type reduction.'
keywords: ['interval type-2 fuzzy', 'type-2 fuzzy logic', 'footprint of uncertainty', 'karnik-mendel', 'type reduction']
---

# Interval type-2 fuzzy sets

## Uncertainty about the membership function

A type-1 membership function claims to know *exactly* how "hot" 30 °C is, say 0.5. In
practice that number is shaky:

- different experts (or different students in the class) draw the "hot" curve differently;
- the sensor reading is noisy, so the input is not exactly 30 °C;
- the same word means different things in different contexts.

An **interval type-2 (IT2)** fuzzy set handles this by giving each $x$ an *interval* of
membership degrees instead of a single number:

$$
\mu_{\tilde A}(x) = \big[\, \underline{\mu}(x),\ \overline{\mu}(x) \,\big] \subseteq [0, 1]
$$

The interval is bounded by two type-1 functions:

- the **upper membership function** (UMF) $\overline{\mu}$, the most generous reading of the
  word;
- the **lower membership function** (LMF) $\underline{\mu}$, the most conservative one,
  with $\underline{\mu}(x) \le \overline{\mu}(x)$ everywhere.

The region between them is the **footprint of uncertainty** (FOU). A wide FOU means a lot of
uncertainty. When the FOU has zero width (UMF = LMF), the set is an ordinary type-1 set.

## Building IT2 terms

Any two type-1 MFs can form an IT2 term. Common recipes are an *uncertain width* (the same
center with two spreads) or an *uncertain position* (the same shape shifted left and right):

```python
import ferrifuzz as ff

# Uncertain sigma: upper is wider, lower is narrower
warm = ff.mf.it2(ff.mf.gaussian(25, 6), ff.mf.gaussian(25, 4))

# Triangles: lower sits inside upper
hot = ff.mf.it2(ff.mf.triangle(30, 70, 100), ff.mf.triangle(50, 70, 90))
hot.membership(60)        # (0.5, 0.75)  → (lower, upper)
```

The lower MF does not have to reach 1. `lower_height` scales its peak, which models
"even in the best case we are only 80 % sure":

```python
hot = ff.mf.it2(ff.mf.triangle(30, 70, 100), ff.mf.triangle(50, 70, 90), lower_height=0.8)
```

ferrifuzz checks that the lower MF never exceeds the upper MF. If it does, constructing the
set raises `ff.FuzzyError` (a `ValueError`) asking whether the arguments are swapped.

## Inference with intervals

An IT2 Mamdani system runs the same pipeline as a type-1 system, but with intervals:

1. **Fuzzify.** Each clause yields an interval $[\underline{\mu}, \overline{\mu}]$.
2. **Fire.** The t-norm and t-conorm are applied bound by bound (see
   [operators on intervals](./operators.md)), which gives an interval firing strength
   $[\underline{f}_r, \overline{f}_r]$.
3. **Aggregate.** The lower firing strengths shape the lower MFs of the consequents, the
   upper strengths shape the upper MFs, and both are max-aggregated. The result is an output
   FOU.
4. **Type-reduce.** The FOU is turned into an interval $[y_l, y_r]$. This is the range of
   centroids of all type-1 sets that fit inside the FOU.
5. **Defuzzify.** The crisp output is the midpoint $y = (y_l + y_r)/2$.

The engine is chosen automatically. `FuzzySystem(type="auto")` (the default) uses IT2
inference as soon as any registered variable has an IT2 term. `type="it2"` forces it, and
`type="t1"` forces type-1.

## Type reduction methods

Choose the method with `type_reduction=`:

### Karnik–Mendel: `"km"` *(default)*

The exact centroid interval of the output FOU, computed on the same sampling grid as type-1
defuzzification (`resolution + 1` points). For the left endpoint $y_l$, we want the
embedded set with the *smallest* centroid. That set uses the upper MF to the left of some
switch point $k$ and the lower MF to the right:

$$
y_l = \min_k \frac{\sum_{i \le k} y_i\,\overline{\mu}_i + \sum_{i > k} y_i\,\underline{\mu}_i}{\sum_{i \le k} \overline{\mu}_i + \sum_{i > k} \underline{\mu}_i}
$$

$y_r$ is the mirror image (lower MF on the left, upper MF on the right, maximised). The
Karnik–Mendel algorithm (2001) finds the switch point iteratively. It starts from the
centroid of the mid-membership $(\underline{\mu}+\overline{\mu})/2$, recomputes $k$ from the
current estimate, and repeats until the estimate stops changing. It converges in a few
iterations.

### Center of sets: `"cos"`

This method does not sample the output FOU. It replaces each fired consequent by its
**center** $c_r$ and runs Karnik–Mendel on the points $c_r$ with weights
$[\underline{f}_r, \overline{f}_r]$. It is cheaper than full KM and is the usual choice for
IT2 TSK-style systems.

### Height: `"height"`

This is the simplest method: a firing-weighted average of the consequent centers, computed
separately for each bound:

$$
y_l = \frac{\sum_r \underline{f}_r\, c_r}{\sum_r \underline{f}_r},\qquad
y_r = \frac{\sum_r \overline{f}_r\, c_r}{\sum_r \overline{f}_r}
$$

It is fast, but strictly speaking it is not a type reduction: $y_l$ is not guaranteed to be
≤ $y_r$.

### Example

```python
temp = ff.Variable("temp", 0, 100)
temp["hot"]  = ff.mf.it2(ff.mf.triangle(30, 70, 100), ff.mf.triangle(50, 70, 90))
temp["mild"] = ff.mf.it2(ff.mf.triangle(0, 30, 70),   ff.mf.triangle(10, 30, 50))

fan = ff.Variable("fan", 0, 100)
fan["fast"] = ff.mf.it2(ff.mf.triangle(40, 80, 100), ff.mf.triangle(60, 80, 100))
fan["slow"] = ff.mf.it2(ff.mf.triangle(0, 20, 60),   ff.mf.triangle(0, 20, 40))

for tr in ("km", "cos", "height"):
    s = ff.FuzzySystem(type_reduction=tr)      # IT2 engine picked automatically
    s.add_input(temp)
    s.add_output(fan)
    s += ff.Rule.from_string("IF temp IS hot THEN fan IS fast")
    s += ff.Rule.from_string("IF temp IS mild THEN fan IS slow")
    print(tr, round(s({"temp": 60})["fan"], 2))
```

```text
km 68.24
cos 70.0
height 72.5
```

At 60 °C, `hot` fires in $[0.5, 0.75]$ and `mild` in $[0, 0.25]$. The three methods agree
that the fan should be fast, but they weight the uncertain `slow` rule differently.

### Seeing the interval

The midpoint hides how uncertain the answer is. `compute_interval` returns the type-reduced
interval itself:

```python
s.compute_interval({"temp": 60})   # {'fan': (y_l, y_r)}
```

A wide interval means the FOUs leave the answer open. Some IT2 controllers use the width as
a confidence signal.

:::warning IT2 uses `type_reduction`, not `defuzz_method`
In an IT2 system the output is set by `type_reduction`. Leave `defuzz_method` at its
default: `FuzzySystem(defuzz_method="mom")` with IT2 terms raises `ff.ModelError`
("interval type-2 systems are reduced with type_reduction ..."). Pick the method with
`type_reduction="km" | "cos" | "height"`.
:::

## Why bother?

When inputs are noisy or the rule base is approximate, IT2 controllers often give
**smoother** control surfaces than type-1 controllers with the same rules: there are fewer
sharp transitions and less sensitivity to small input changes. The extra degrees of freedom
in the FOU give you one more thing to tune. The cost is speed. KM type reduction iterates
over the sampled FOU once for each endpoint, so IT2 inference is slower than type-1. The
[type-1 vs IT2 tutorial](../tutorials/type1-vs-it2.md) measures this on a noisy tank
controller.

## In ferrifuzz

- Python: [`ff.mf.it2` / `IT2MF`](../python-api/membership.md), [`FuzzySystem(type=..., type_reduction=...)`](../python-api/fuzzy-system.md)
- Rust: [IT2 sets and type reduction](../rust-api/it2.md)

## Further reading

- N. N. Karnik and J. M. Mendel, "Centroid of a type-2 fuzzy set", *Information Sciences*, 2001.
- J. M. Mendel, *Uncertain Rule-Based Fuzzy Systems*, 2nd ed., Springer, 2017.
