---
title: Interval type-2 (Rust)
sidebar_label: Interval type-2
description: 'Interval type-2 fuzzy inference in Rust: how FuzzySystem runs IT2 systems, and the Karnik–Mendel, center-of-sets and height type-reduction functions.'
keywords: ['interval type-2 rust', 'karnik-mendel', 'type reduction']
---

# Interval type-2

An interval type-2 (IT2) system uses membership functions with a **footprint of uncertainty**:
each term is a band between a lower and an upper MF (see
[`IT2MF`](./membership.md)). Rules then fire with an **interval** strength, and the
aggregated output is a band too. *Type reduction* collapses that band into an interval
$[y_l, y_r]$, and the crisp output is its midpoint. The theory is in
[Concepts → Interval type-2](../concepts/interval-type-2.md).

## IT2 systems with `FuzzySystem`

There is no separate type. Give a variable an IT2 term and the default
`InferenceType::Auto` switches to the IT2 engine.

```rust
use ferrifuzz::prelude::*;

fn main() -> Result<(), Error> {
    let temp = Variable::new("temp", 0.0, 100.0)?
        .with_term("hot",  mf::it2(mf::triangle(30.0, 70.0, 100.0)?, mf::triangle(50.0, 70.0, 90.0)?)?)
        .with_term("mild", mf::it2(mf::triangle(0.0, 30.0, 70.0)?,   mf::triangle(10.0, 30.0, 50.0)?)?);
    let fan = Variable::new("fan", 0.0, 100.0)?
        .with_term("fast", mf::it2(mf::triangle(40.0, 80.0, 100.0)?, mf::triangle(60.0, 80.0, 100.0)?)?)
        .with_term("slow", mf::it2(mf::triangle(0.0, 20.0, 60.0)?,   mf::triangle(0.0, 20.0, 40.0)?)?);

    let mut sys = FuzzySystem::new().with_type_reduction(TypeReduction::KarnikMendel);
    sys.add_input(temp).add_output(fan);
    sys.add_rules_str(["IF temp IS hot THEN fan IS fast", "IF temp IS mild THEN fan IS slow"])?;
    assert!(sys.is_it2());

    let (yl, yr) = sys.compute_interval([("temp", 60.0)])?["fan"];   // ≈ (56.04, 80.43)
    let y = sys.compute([("temp", 60.0)])?["fan"];                   // ≈ 68.24 = (yl + yr) / 2
    let strengths = sys.rule_strengths_interval([("temp", 60.0)])?;  // [(0.5, 0.75), (0.0, 0.25)]
    println!("{yl:.2} {yr:.2} {y:.2} {strengths:?}");
    Ok(())
}
```

The pipeline per call is:

1. Each clause gives an interval degree from `IT2MF::membership`. Type-1 terms give `(μ, μ)`.
2. Intervals are combined bound by bound with `and_method` / `or_method`, then multiplied by
   the rule weight → firing interval $[\underline{f}, \overline{f}]$.
3. Consequent sets are reduced according to `type_reduction`:
   - **`KarnikMendel`** (default): the lower and upper consequent MFs are shaped by
     $\underline{f}$ and $\overline{f}$ using `implication`, then max-aggregated on the
     `resolution + 1` point grid. Karnik–Mendel finds the centroid interval of that FOU.
   - **`CenterOfSets`**: each fired consequent is represented by its center (`Term::center`).
     Hedged or negated consequents are integrated numerically. KM runs over those centers,
     weighted by the firing intervals.
   - **`Height`**: firing-weighted average of the consequent centers, computed separately
     with the lower weights and with the upper weights.
4. `compute` returns $(y_l + y_r)/2$. `compute_interval` returns $(y_l, y_r)$.

:::warning `Defuzz` does not apply to IT2
An IT2 system is reduced with `TypeReduction`, not `Defuzz`. Leave `defuzz` at its default
(`Centroid`). Any other value makes the model invalid:
`interval type-2 systems are reduced with type_reduction (km, cos, height), not defuzz 'mom'; leave defuzz at 'centroid'`.
:::

:::note Height interval order
`Height` averages the centers once with the lower firing strengths and once with the upper
ones. Those two averages are not necessarily in order, so ferrifuzz sorts them:
`compute_interval` always returns `(y_l, y_r)` with `y_l ≤ y_r`, for every type reduction.
The crisp output is the midpoint.
:::

Setting `InferenceType::Type1` while a variable has IT2 terms is a model error. Setting
`InferenceType::IntervalType2` on an all-type-1 system runs the IT2 engine with zero-width
footprints. With KM type reduction this gives the same result as type-1 centroid
defuzzification.

To plot the aggregated band, use `sys.output_fou(inputs, "fan")?`, which returns
`(xs, lower, upper)` on the output grid.

## The `ferrifuzz::it2` module

The three type-reduction algorithms are public, so you can use them on your own data. Each
returns `None` when there is nothing to reduce: empty input, or all weights zero.

### `km_type_reduce`

<!-- skip-check -->
```rust
pub fn km_type_reduce(xs: &[f64], lower: &[f64], upper: &[f64]) -> Option<(f64, f64)>
```

This is the Karnik–Mendel centroid of a sampled FOU. `xs` must be sorted ascending, and
`lower[i] ≤ upper[i]` are the band's bounds at `xs[i]`. Each endpoint is found by the KM
switch-point iteration, which converges monotonically and stops when the change is below
1e-9.

$$
y_l = \min_{k} \frac{\sum_{i \le k} x_i \overline{\mu}_i + \sum_{i > k} x_i \underline{\mu}_i}{\sum_{i \le k} \overline{\mu}_i + \sum_{i > k} \underline{\mu}_i},
\qquad
y_r = \max_{k} \frac{\sum_{i \le k} x_i \underline{\mu}_i + \sum_{i > k} x_i \overline{\mu}_i}{\sum_{i \le k} \underline{\mu}_i + \sum_{i > k} \overline{\mu}_i}
$$

```rust
use ferrifuzz::it2::km_type_reduce;

let xs: Vec<f64> = (0..=100).map(|i| i as f64 / 10.0).collect();
let upper: Vec<f64> = xs.iter().map(|&x| (1.0 - (x - 5.0).abs() / 5.0).max(0.0)).collect();
let lower: Vec<f64> = upper.iter().map(|u| 0.5 * u).collect();
let (yl, yr) = km_type_reduce(&xs, &lower, &upper).unwrap();
assert!(yl < 5.0 && yr > 5.0);            // symmetric FOU → symmetric interval
```

If `lower == upper`, the FOU has zero width and both endpoints equal the ordinary centroid.

### `center_of_sets`

<!-- skip-check -->
```rust
pub fn center_of_sets(centers: &[f64], f_lower: &[f64], f_upper: &[f64]) -> Option<(f64, f64)>
```

KM over consequent centers weighted by their firing intervals. The centers do not need to be
sorted.

```rust
use ferrifuzz::it2::center_of_sets;
let (l, r) = center_of_sets(&[10.0, 0.0], &[0.5, 0.5], &[1.0, 1.0]).unwrap();   // (3.33, 6.67)
```

### `height`

<!-- skip-check -->
```rust
pub fn height(centers: &[f64], f_lower: &[f64], f_upper: &[f64]) -> Option<(f64, f64)>
```

Weighted average of `centers`, once with `f_lower` and once with `f_upper`. Returns `None` if
either weight vector sums to zero.

```rust
use ferrifuzz::it2::height;
assert_eq!(height(&[0.0, 10.0], &[1.0, 1.0], &[1.0, 3.0]), Some((5.0, 7.5)));
```

## See also

- [Tutorial: type-1 vs interval type-2 under noise](../tutorials/type1-vs-it2.md)
- [Python `FuzzySystem`](../python-api/fuzzy-system.md): same engine, with `type_reduction="km" | "cos" | "height"`
