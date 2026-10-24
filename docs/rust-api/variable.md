---
title: Variables (Rust)
sidebar_label: Variables
description: 'Rust API for linguistic variables in ferrifuzz: Variable, Term, fuzzification, automf and default_term_names.'
keywords: ['linguistic variable rust', 'fuzzification']
---

# Variables

A `Variable` is a named universe of discourse `[min_value, max_value]` that holds named
**terms**. Each term is a type-1 or interval type-2 membership function. Terms keep their
insertion order. For the idea behind linguistic variables, see
[Concepts → Linguistic variables](../concepts/linguistic-variables.md).

```rust
use ferrifuzz::prelude::*;

let temp = Variable::new("temp", 0.0, 40.0)?
    .with_term("cold", mf::triangle(0.0, 0.0, 20.0)?)
    .with_term("warm", mf::triangle(10.0, 20.0, 30.0)?)
    .with_term("hot", mf::triangle(20.0, 40.0, 40.0)?);

let mu = temp.fuzzify(25.0);
assert_eq!(mu["warm"], 0.5);
assert_eq!(mu["hot"], 0.25);
assert_eq!(temp.term_names(), ["cold", "warm", "hot"]);
```

## Construction

| Method | Description |
|---|---|
| `Variable::new(name, min_value, max_value) -> Result<Variable>` | Errors with `InvalidParameter` unless `min_value < max_value` (NaN is rejected). |
| `with_term(self, name, mf) -> Variable` | Builder form: adds a term and returns the variable. |
| `add_term(&mut self, name, mf) -> &mut Variable` | Adds a term, or replaces an existing term with the same name in place. |
| `automf(&mut self, names, shape) -> Result<&mut Variable>` | Replaces **all** terms with evenly spaced terms (see below). |

`mf` can be a `Type1MF` or an `IT2MF`. Both convert into [`Term`](#term) through `Into<Term>`.

## Generated terms: `automf`

<!-- skip-check -->
```rust
pub fn automf<S: AsRef<str>>(&mut self, names: &[S], shape: Shape) -> Result<&mut Self>
```

This creates `names.len() ≥ 2` overlapping terms over the universe. The first term peaks at
`min_value` and the last at `max_value`. It uses [`mf::evenly_spaced`](./membership.md), so
triangles sum to 1 everywhere inside the universe.

```rust
use ferrifuzz::prelude::*;   // includes default_term_names and Shape

let mut error = Variable::new("error", -1.0, 1.0)?;
error.automf(&default_term_names(5), Shape::Triangle)?;
// very_low, low, medium, high, very_high
println!("{error}");
```

`default_term_names(n)` returns conventional names:

| `n` | Names |
|---|---|
| 2 | `low`, `high` |
| 3 | `low`, `medium`, `high` |
| 5 | `very_low`, `low`, `medium`, `high`, `very_high` |
| 7 | `NB`, `NM`, `NS`, `ZE`, `PS`, `PM`, `PB` (control convention) |
| other | `A1` … `An` |

You can pass your own names too: `var.automf(&["cold", "mild", "hot"], Shape::Gaussian)?`.

## Inspection

| Method | Returns |
|---|---|
| `name()` | `&str` |
| `min_value()`, `max_value()` | `f64` |
| `term(name)` | `Option<&Term>` |
| `term_index(name)` | `Option<usize>` (position in insertion order) |
| `term_at(index)` | `&Term` (panics if out of range) |
| `terms()` | iterator of `(&str, &Term)` in insertion order |
| `term_names()` | `Vec<&str>` |
| `is_it2()` | `true` if any term is interval type-2 |
| `Display` | `temp [0, 40]: cold = triangle(0, 0, 20), …` |

## Fuzzification

| Method | Returns | Notes |
|---|---|---|
| `fuzzify(x)` | `HashMap<String, f64>` | Degree in every **type-1** term. IT2 terms are skipped. |
| `fuzzify_interval(x)` | `HashMap<String, (f64, f64)>` | Interval in every term. A type-1 term gives `(μ, μ)`. |
| `membership(term, x)` | `Option<f64>` | `None` for a missing or IT2 term. |
| `membership_interval(term, x)` | `Option<(f64, f64)>` | `None` for a missing term. |
| `clamp(x)` | `f64` | `x` clamped into `[min_value, max_value]`. |

`fuzzify` does not clamp. Outside the universe each MF is evaluated as-is, so a shoulder that
ends at the edge returns 0. `FuzzySystem` clamps inputs before fuzzifying (see
[FuzzySystem → Input clamping](./system.md)).

## `Term`

```rust
pub enum Term {
    Type1(Type1MF),
    IT2(IT2MF),
}
```

| Method | Returns |
|---|---|
| `interval(x)` | `(f64, f64)`: the IT2 interval, or `(μ, μ)` for type-1 |
| `center()` | `f64`: analytic center (IT2: midpoint of the upper and lower centers) |
| `as_type1()` | `Option<&Type1MF>` |

`From<Type1MF>` and `From<IT2MF>` are implemented, so you rarely build a `Term` by hand.

## Registering with a system

Variables are moved into a [`FuzzySystem`](./system.md) as inputs or outputs.
`add_input` / `add_output` replace an existing variable with the same name.

```rust
let temp = Variable::new("temp", 0.0, 40.0)?.automf(&["cold", "warm", "hot"], Shape::Triangle)?.clone();
let fan = Variable::new("fan", 0.0, 100.0)?.with_term("fast", mf::triangle(50.0, 100.0, 100.0)?);

let mut system = FuzzySystem::new();
system.add_input(temp).add_output(fan);    // `temp` and `fan` are moved into the system

// change a registered variable in place
system.input_mut("temp").unwrap().add_term("hot", mf::triangle(25.0, 40.0, 40.0)?);
```
