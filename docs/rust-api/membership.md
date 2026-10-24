---
title: Membership functions (Rust)
sidebar_label: Membership functions
description: 'Rust API for membership functions in ferrifuzz: the MembershipFunction trait, the six type-1 shapes, Type1MF, interval type-2 IT2MF and the mf constructors.'
keywords: ['membership functions rust', 'MembershipFunction trait', 'IT2MF']
---

# Membership functions

A membership function (MF) maps a crisp value `x` to a degree $\mu(x) \in [0, 1]$.
The shapes and their parameters are explained in
[Concepts → Membership functions](../concepts/membership-functions.md). This page covers the
Rust types.

```rust
use ferrifuzz::prelude::*;

let warm = mf::triangle(20.0, 50.0, 80.0)?;
assert_eq!(warm.membership(35.0), 0.5);
assert_eq!(warm.center(), 50.0);
assert_eq!(warm.shape(), "Triangular");
println!("{warm}");                                  // triangle(20, 50, 80)
```

## The `mf` constructors

Use these in normal code. They return the unified [`Type1MF`](#type1mf) enum, which is what
`Variable::with_term` expects.

| Function | Returns | Validation |
|---|---|---|
| `mf::triangle(a, b, c)` | `Result<Type1MF>` | `a ≤ b ≤ c` |
| `mf::trapezoid(a, b, c, d)` | `Result<Type1MF>` | `a ≤ b ≤ c ≤ d` |
| `mf::gaussian(center, sigma)` | `Result<Type1MF>` | `sigma > 0` |
| `mf::bell(center, width, slope)` | `Result<Type1MF>` | `width > 0`, `slope > 0` |
| `mf::singleton(x)` | `Type1MF` | none |
| `mf::sigmoid(center, slope)` | `Type1MF` | none (`slope > 0` rises, `< 0` falls) |
| `mf::it2(upper, lower)` | `Result<IT2MF>` | lower ≤ upper everywhere |
| `mf::evenly_spaced(lo, hi, n, shape)` | `Result<Vec<(f64, Type1MF)>>` | `n ≥ 2`, `lo < hi` |

Invalid parameters give `Error::InvalidParameter`, for example `"triangle(5, 0, 10): needs a ≤ b ≤ c (feet a, c; peak b)"` or
`"gaussian(0, -1): sigma must be > 0"`. NaN parameters are rejected the same way.

Shoulders are degenerate triangles and trapezoids. `triangle(0.0, 0.0, 20.0)` is a left
shoulder that is 1.0 at `x = 0`. `trapezoid(60.0, 80.0, 100.0, 100.0)` is a right shoulder.

### `mf::evenly_spaced`

<!-- skip-check -->
```rust
pub fn evenly_spaced(lo: f64, hi: f64, n: usize, shape: Shape) -> Result<Vec<(f64, Type1MF)>>
```

Returns `n` overlapping terms whose centers are evenly spaced from `lo` to `hi`, as
`(center, mf)` pairs. Triangles peak at each center and reach zero at the neighbouring
centers, so inside `[lo, hi]` the memberships sum to 1. Gaussians use `sigma = step / 2`.
`Variable::automf` is built on top of this function.

`ferrifuzz::Shape` has two variants. `Shape::Triangle` is the default and parses from
`"triangle"`, `"triangular"` or `"trimf"`. `Shape::Gaussian` parses from `"gaussian"`,
`"gauss"` or `"gaussmf"`.

## `MembershipFunction` trait

```rust
pub trait MembershipFunction {
    fn membership(&self, x: f64) -> f64;
}
```

All six shape structs and `Type1MF` implement it. Implement it yourself if you want a custom
shape in your own code. The inference engine itself works on `Type1MF` and `IT2MF`.

## Shape structs

Each shape is also a standalone `Copy` struct. Its constructor validates the parameters, and
`params()` returns them. Convert a struct to `Type1MF` with `.into()`.

| Struct | Constructor | Formula / behaviour | Accessor |
|---|---|---|---|
| `TriangularMF` | `new(a, b, c) -> Result` | linear up from `a` to the peak at `b`, down to `c` | `params() -> (a, b, c)` |
| `TrapezoidalMF` | `new(a, b, c, d) -> Result` | rises `a→b`, flat `b..=c`, falls `c→d` | `params() -> (a, b, c, d)` |
| `GaussianMF` | `new(center, sigma) -> Result` | $e^{-\frac{1}{2}\left(\frac{x-c}{\sigma}\right)^2}$ | `params() -> (center, sigma)` |
| `BellMF` | `new(center, width, slope) -> Result` | $\dfrac{1}{1 + \lvert (x-c)/w \rvert^{2s}}$ | `params() -> (center, width, slope)` |
| `SigmoidMF` | `new(center, slope)` | $\dfrac{1}{1 + e^{-s(x-c)}}$ | `params() -> (center, slope)` |
| `SingletonMF` | `new(x)` | 1 at exactly `x` (within `f64::EPSILON`), else 0 | `value() -> f64` |

```rust
use ferrifuzz::{GaussianMF, MembershipFunction, Type1MF};

let g = GaussianMF::new(50.0, 10.0)?;
assert!((g.membership(60.0) - 0.6065).abs() < 1e-4);   // one sigma away
let as_enum: Type1MF = g.into();
```

## `Type1MF`

<!-- skip-check -->
```rust
pub enum Type1MF {
    Triangular(TriangularMF),
    Trapezoidal(TrapezoidalMF),
    Gaussian(GaussianMF),
    Singleton(SingletonMF),
    Bell(BellMF),
    Sigmoid(SigmoidMF),
}
```

`Type1MF` is `Copy` and implements `PartialEq` and `Debug`.

| Method | Returns | Notes |
|---|---|---|
| `membership(x)` | `f64` | degree at `x` |
| `center()` | `f64` | exact analytic center: triangle → `b`, trapezoid → `(b + c) / 2`, gaussian/bell/sigmoid → `center`, singleton → `x`. This is the `z` used by Sugeno inference. |
| `shape()` | `&'static str` | `"Triangular"`, `"Trapezoidal"`, `"Gaussian"`, `"Singleton"`, `"Bell"`, `"Sigmoid"` |
| `key_points()` | `Vec<f64>` | points where the shape changes (feet, peaks, ±3σ, …); useful for plotting |
| `Display` | | the constructor call, e.g. `triangle(0, 5, 10)` |

## `IT2MF`: interval type-2

An interval type-2 MF is a band between an **upper** MF (UMF) and a **lower** MF (LMF). The band
is the *footprint of uncertainty* (FOU). At each `x` it returns an interval
`(lower, upper)` instead of a single number. See
[Concepts → Interval type-2](../concepts/interval-type-2.md).

```rust
use ferrifuzz::prelude::*;

let fou = mf::it2(
    mf::triangle(0.0, 5.0, 10.0)?,   // upper (wider)
    mf::triangle(2.0, 5.0, 8.0)?,    // lower (narrower)
)?;
let (lo, up) = fou.membership(3.0);  // (0.333…, 0.6)
assert!(lo <= up);
```

| Item | Description |
|---|---|
| `IT2MF::new(upper, lower) -> Result<IT2MF>` | Same as `mf::it2`. |
| `IT2MF::with_lower_height(upper, lower, h) -> Result<IT2MF>` | Scales the lower MF by `h ∈ (0, 1]`, which gives the textbook "shorter inner triangle". |
| `membership(x) -> (f64, f64)` | `(h · lower(x), upper(x))`. The order is **(lower, upper)**. |
| `upper()`, `lower() -> Type1MF` | The two bounding MFs. |
| `lower_height() -> f64` | `1.0` unless built with `with_lower_height`. |
| `center() -> f64` | Midpoint of the upper and lower centers. |

**Validation.** Both constructors check that the lower MF never rises above the upper one.
They test both shapes' key points plus a 129-point grid between them, and return
`Error::InvalidParameter` if the check fails. Swapped arguments are the usual cause:

```text
IT2 lower MF triangle(0, 5, 10) is above upper MF triangle(2, 5, 8) at x=2 (0.4000 > 0.0000); the order is it2(upper, lower) — are they swapped?
```

`with_lower_height` also rejects `h` outside `(0, 1]`.

:::note Argument order
The constructor takes `(upper, lower)`, but `membership` returns `(lower, upper)`. That way the
returned interval reads left to right like `[a, b]` with `a ≤ b`.
:::

## See also

- [Variables](./variable.md): attach MFs to a variable as named terms.
- [Python membership functions](../python-api/membership.md): the same shapes from Python.
