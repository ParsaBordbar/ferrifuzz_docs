---
title: Rust API overview
sidebar_label: Overview
description: 'Overview of the ferrifuzz Rust crate: adding it to Cargo.toml, a first program, what the prelude re-exports, the error type, and the conventions shared by every module.'
keywords: ['fuzzy logic rust', 'ferrifuzz crate', 'rust fuzzy inference']
---

# Rust API overview

The core of ferrifuzz is a pure-Rust crate with **zero dependencies** by default. The only
optional one is `rayon`, behind the `parallel` feature for multi-core batch inference. The Python package is a
thin wrapper around it, so the Rust and Python APIs expose the same engine: membership
functions, linguistic variables, rules, Mamdani / Sugeno / interval type-2 inference, fuzzy
time series and forecasting metrics.

## Adding the crate

The crate is not on crates.io yet. Depend on it from the Git repository:

```toml title="Cargo.toml"
[dependencies]
ferrifuzz = { git = "https://github.com/ParsaBordbar/ferrifuzz" }
```

:::note
To work against a local checkout instead, use a path dependency:
`ferrifuzz = { path = "../ferrifuzz/crates/ferrifuzz" }`.
:::

## A first program

```rust title="src/main.rs"
use ferrifuzz::prelude::*;

fn main() -> Result<(), Error> {
    let service = Variable::new("service", 0.0, 10.0)?
        .with_term("poor", mf::trapezoid(0.0, 0.0, 2.0, 5.0)?)
        .with_term("good", mf::triangle(2.0, 5.0, 8.0)?)
        .with_term("excellent", mf::trapezoid(5.0, 8.0, 10.0, 10.0)?);
    let tip = Variable::new("tip", 0.0, 30.0)?
        .with_term("low", mf::triangle(0.0, 5.0, 10.0)?)
        .with_term("medium", mf::triangle(10.0, 15.0, 20.0)?)
        .with_term("high", mf::triangle(20.0, 25.0, 30.0)?);

    let mut system = FuzzySystem::new().with_defuzz(Defuzz::Centroid);
    system.add_input(service).add_output(tip);
    system.add_rules_str([
        "IF service IS poor THEN tip IS low",
        "IF service IS good THEN tip IS medium",
        "IF service IS excellent THEN tip IS high",
    ])?;

    let out = system.compute([("service", 7.5)])?;
    println!("tip = {:.2}", out["tip"]);
    Ok(())
}
```

The repository also has a complete two-input tipper you can run with
`cargo run -p ferrifuzz --example tipper`.

## The prelude

`use ferrifuzz::prelude::*;` brings in everything you need to build and run a system:

| Item | Kind | Page |
|---|---|---|
| `mf` | module of MF constructors (`mf::triangle`, …) | [Membership functions](./membership.md) |
| `MembershipFunction` | trait | [Membership functions](./membership.md) |
| `Type1MF`, `IT2MF` | MF types | [Membership functions](./membership.md) |
| `Shape` | shape for generated term sets (`Triangle`, `Gaussian`) | [Membership functions](./membership.md) |
| `Variable`, `Term`, `default_term_names` | linguistic variables | [Variables](./variable.md) |
| `Clause`, `Rule` | rules | [Rules](./rules.md) |
| `TNorm`, `TConorm`, `Complement`, `Hedge` | operators | [Operators & hedges](./operators-hedges.md) |
| `FuzzySystem`, `Defuzz`, `Implication`, `InferenceType`, `TypeReduction` | inference engine | [FuzzySystem](./system.md) |
| `FuzzyTimeSeries`, `PartitionShape` | forecasting | [Fuzzy time series](./fts.md) |
| `metrics` (module), `Scores` | RMSE / MAE / MAPE | [Metrics](./metrics.md) |
| `Error` | error enum | below |

Some items are exported from the crate root or a module but are not in the prelude. Import
them by path:

| Path | What |
|---|---|
| `ferrifuzz::Result<T>` | alias for `std::result::Result<T, ferrifuzz::Error>` |
| `ferrifuzz::{TriangularMF, TrapezoidalMF, GaussianMF, SingletonMF, BellMF, SigmoidMF}` | the concrete shape structs |
| `ferrifuzz::it2` | type-reduction functions ([IT2 page](./it2.md)) |
| `ferrifuzz::fts::{Partition, Flrg, equal_width_partitions}` | FTS building blocks ([FTS](./fts.md)) |

## Errors

Every fallible function returns `ferrifuzz::Result<T>`. The error type is a plain enum that
implements `std::error::Error` and `Display`, so `?` works in any function returning
`Result<_, ferrifuzz::Error>` or `Box<dyn std::error::Error>`.

```rust
pub enum Error {
    InvalidParameter(String), // a constructor argument is out of range (e.g. a ≤ b ≤ c violated)
    Parse(String),            // a rule string could not be parsed
    InvalidInput(String),     // bad input values: NaN, batch columns of different lengths, ...
    MissingInput(String),     // an input variable the system needs was not supplied
    UnknownInput(String),     // a supplied input name is not a registered input
    InvalidModel(String),     // the model is inconsistent (rule names an unknown variable/term, ...)
    NotFitted,                // a fuzzy time series was used before fit()
}
```

The `String` payload is the full, human-readable message. Messages name the offending value
and, where it helps, list the valid choices and suggest a close spelling:

```text
unknown t-norm 'prdouct' (did you mean 'product'?); valid options: 'min', 'product', 'lukasiewicz', 'drastic', 'einstein', 'hamacher'
```

Match on the variant when you need to react differently to different failures:

```rust
let service = Variable::new("service", 0.0, 10.0)?.with_term("good", mf::triangle(0.0, 5.0, 10.0)?);
let tip = Variable::new("tip", 0.0, 30.0)?.with_term("medium", mf::triangle(10.0, 15.0, 20.0)?);
let mut system = FuzzySystem::new();
system.add_input(service).add_output(tip);
system.add_rule_str("IF service IS good THEN tip IS medium")?;

match system.compute([("servce", 7.5)]) {
    Ok(out) => println!("{:?}", out),
    Err(Error::UnknownInput(msg)) | Err(Error::MissingInput(msg)) => eprintln!("check your inputs: {msg}"),
    Err(e) => return Err(e.into()),
}
```

See [Reading error messages](../getting-started/error-messages.md) for a tour of the common ones.

## Conventions

- **Constructors validate.** Anything that can be built with bad parameters returns `Result`:
  `mf::triangle(a, b, c)?`, `Variable::new(name, lo, hi)?`, `Rule::parse(s)?`,
  `FuzzyTimeSeries::new(n, order)?`. Shapes that cannot be invalid (`mf::singleton`,
  `mf::sigmoid`) return the value directly.
- **Builders consume and return `Self`.** `FuzzySystem::new().with_and(TNorm::Product)`,
  `Variable::new(..)?.with_term(..)`. Methods that add to an existing value take `&mut self`
  and return `&mut Self`, so they chain: `system.add_input(a).add_input(b).add_output(c)`.
- **Option enums parse from strings.** `TNorm`, `TConorm`, `Defuzz`, `Implication`,
  `InferenceType`, `TypeReduction` and `Shape` implement `FromStr` (case-insensitive, aliases
  accepted). This is how the Python bindings turn `and_method="product"` into `TNorm::Product`.

  ```rust
  let t: TNorm = "PROD".parse()?;          // TNorm::Product
  let d: Defuzz = "cog".parse()?;          // Defuzz::Centroid
  ```

  They also provide `ALL` (every variant), `name()` (canonical name) and `Display`. Parse
  errors list the valid names and suggest the closest one:
  `unknown defuzzification method 'centriod' (did you mean 'centroid'?); valid options: …`.
  `Complement` has a parameter and is built with `Complement::from_name(kind, param)` instead.
- **Names are case-sensitive.** Variable and term names in rules must match the names you
  registered exactly. Keywords (`IF`, `IS`, `AND`, …) are case-insensitive.
- **Thread safety.** `FuzzySystem` and `FuzzyTimeSeries` are `Send + Sync`, so a built
  system can be shared across threads by reference (for example inside an `Arc`).
