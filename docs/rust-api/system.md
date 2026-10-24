---
title: FuzzySystem (Rust)
sidebar_label: FuzzySystem
description: 'Rust API for FuzzySystem, the ferrifuzz inference engine: builder settings, building the model, validation, compute and its error cases, batch inference and inspection helpers.'
keywords: ['FuzzySystem rust', 'mamdani rust', 'sugeno rust']
---

# `FuzzySystem`

`FuzzySystem` holds input and output [variables](./variable.md), a list of [rules](./rules.md)
and the engine settings. It turns crisp inputs into crisp outputs. One type covers three
engines:

| Engine | Selected by | Output stage |
|---|---|---|
| Type-1 **Mamdani** | default | aggregate the clipped/scaled output sets, then defuzzify on a grid |
| Type-1 **Sugeno / TSK** | `Defuzz::WeightedAverage` (or `FuzzySystem::sugeno()`) | firing-weighted average of each rule's `z` |
| **Interval type-2** Mamdani | any IT2 term with `InferenceType::Auto`, or `InferenceType::IntervalType2` | aggregate the FOU, type-reduce to `[y_l, y_r]`, output the midpoint |

The theory is in [Concepts → Mamdani vs Sugeno](../concepts/inference.md) and
[Concepts → Defuzzification](../concepts/defuzzification.md).

```rust
use ferrifuzz::prelude::*;

fn main() -> Result<(), Error> {
    let temp = Variable::new("temp", 0.0, 40.0)?
        .with_term("cold", mf::triangle(0.0, 0.0, 20.0)?)
        .with_term("hot", mf::triangle(20.0, 40.0, 40.0)?);
    let fan = Variable::new("fan", 0.0, 100.0)?
        .with_term("slow", mf::triangle(0.0, 0.0, 50.0)?)
        .with_term("fast", mf::triangle(50.0, 100.0, 100.0)?);

    let mut sys = FuzzySystem::new().with_and(TNorm::Product);
    sys.add_input(temp).add_output(fan);
    sys.add_rules_str([
        "IF temp IS cold THEN fan IS slow",
        "IF temp IS hot THEN fan IS fast",
    ])?;

    let out = sys.compute([("temp", 35.0)])?;
    println!("fan = {:.1}", out["fan"]);
    Ok(())
}
```

## Settings

Each setting has three methods: a builder `with_*` (consumes and returns `Self`), a setter
`set_*` (takes `&mut self`, returns `&mut Self`), and a getter.

| Builder / setter | Getter | Type | Default | Meaning |
|---|---|---|---|---|
| `with_and` / `set_and` | `and_method()` | [`TNorm`](./operators-hedges.md) | `Min` | combines the clauses of an AND-group |
| `with_or` / `set_or` | `or_method()` | [`TConorm`](./operators-hedges.md) | `Max` | combines a rule's OR-groups |
| `with_defuzz` / `set_defuzz` | `defuzz()` | `Defuzz` | `Centroid` | type-1 output stage (Mamdani method, or Sugeno) |
| `with_implication` / `set_implication` | `implication()` | `Implication` | `Min` | how a firing strength shapes its consequent set (Mamdani and IT2) |
| `with_inference` / `set_inference` | `inference()` | `InferenceType` | `Auto` | engine selection |
| `with_type_reduction` / `set_type_reduction` | `type_reduction()` | `TypeReduction` | `KarnikMendel` | IT2 only |
| `with_resolution` / `set_resolution` | `resolution()` | `usize` | `200` | number of grid steps over each output universe (minimum 1) |
| `with_input_clamping` / `set_input_clamping` | `input_clamping()` | `bool` | `true` | clamp inputs into `[min, max]` before fuzzifying |

`FuzzySystem::new()` gives the defaults above. `FuzzySystem::sugeno()` is shorthand for
`FuzzySystem::new().with_defuzz(Defuzz::WeightedAverage)`.

### Option enums

All four implement `FromStr` (case-insensitive), `Display`, `name()` and `ALL`, like
`TNorm`. A misspelled name gives an error that lists the valid options:

```text
unknown defuzzification method 'centriod' (did you mean 'centroid'?); valid options: 'centroid', 'bisector', 'mom', 'som', 'lom', 'weighted_average'
```

**`Defuzz`**: type-1 output stage

| Variant | Names | Result |
|---|---|---|
| `Centroid` | `centroid`, `cog`, `coa` | center of gravity $\sum x\mu(x) / \sum \mu(x)$ over the grid |
| `Bisector` | `bisector` | first grid point where the cumulative area reaches half |
| `MeanOfMaximum` | `mom`, `mean_of_maximum` | mean of the grid points at the maximum |
| `SmallestOfMaximum` | `som`, `smallest_of_maximum` | smallest grid point at the maximum |
| `LargestOfMaximum` | `lom`, `largest_of_maximum` | largest grid point at the maximum |
| `WeightedAverage` | `weighted_average`, `sugeno`, `wtaver` | Sugeno/TSK: $\sum_r w_r z_r / \sum_r w_r$, no grid |

**`Implication`**: `Min` (`mamdani`, `min`) clips each consequent set at the firing strength.
`Product` (`larsen`, `product`, `prod`) scales it. `Implication::apply(mu, strength)` exposes
the formula.

**`InferenceType`**: `Auto` (`auto`), `Type1` (`type1`, `t1`, `type-1`, `mamdani`, `sugeno`),
`IntervalType2` (`it2`, `type2`, `type-2`, `interval`). With `Type1`, every term must be type-1.
With `IntervalType2`, type-1 terms are treated as IT2 terms with a zero-width footprint.
`is_it2()` reports which engine will run.

**`TypeReduction`**: `KarnikMendel` (`km`, `karnik_mendel`, `karnik-mendel`), `CenterOfSets`
(`cos`, `center_of_sets`, `centerofsets`), `Height` (`height`). See [Interval type-2](./it2.md).

:::caution Results lie on a grid
Every method except `WeightedAverage` samples the aggregated output set on
`resolution + 1` evenly spaced points. The answer is therefore a grid point, or a weighted
mix of grid points. On `[0, 30]` with the default 200 steps the grid spacing is 0.15, so a
peak at exactly 25 is reported by `MeanOfMaximum` as `25.05`. Raise the resolution with
`with_resolution(2000)` when this matters. Sugeno has no grid.
:::

### Input clamping

With clamping on (the default), an input outside its variable's `[min_value, max_value]` is
clamped to the nearest edge before fuzzification. A reading of `12.0` on a `[0, 10]` universe
therefore behaves exactly like `10.0`, and the edge terms keep firing. This matters in control
loops, where errors briefly overshoot the designed range. Turn clamping off with
`with_input_clamping(false)` if you want each MF evaluated at the raw value. A shoulder that
ends at the boundary then gives 0, and possibly no rule fires.

## Building the model

| Method | Description |
|---|---|
| `add_input(&mut self, Variable) -> &mut Self` | Registers (moves in) an input. A variable with the same name is replaced. |
| `add_output(&mut self, Variable) -> &mut Self` | Same, for outputs. |
| `add_rule(&mut self, Rule) -> &mut Self` | Appends a rule. |
| `add_rule_str(&mut self, &str) -> Result<&mut Self>` | Parses and appends a rule (`Error::Parse` on bad syntax). |
| `add_rules_str(&mut self, iter) -> Result<&mut Self>` | Parses several rules. Nothing is added if any one fails. |
| `add_consequent(&mut self, out_var, term, coeffs, bias) -> &mut Self` | Registers a first-order TSK consequent (below). |

Inspection: `inputs()`, `outputs()` (`&[Variable]`), `input(name)`, `output(name)`
(`Option<&Variable>`), `input_mut(name)`, `output_mut(name)` (`Option<&mut Variable>`),
`input_names()`, `output_names()` (`Vec<&str>`), `rules()` (`&[Rule]`), `rules_mut()`
(`&mut Vec<Rule>`), `is_it2()`. `Display` prints a one-line summary:

```text
FuzzySystem: Mamdani (defuzz=centroid, implication=mamdani); and=min, or=max; inputs [service] → outputs [tip]; 3 rules
```

Any mutation (adding a rule, changing a setting, editing through `rules_mut`/`input_mut`)
marks the system for re-checking on its next run.

### Linear (TSK) consequents

<!-- skip-check -->
```rust
pub fn add_consequent<K: Into<String>>(
    &mut self,
    out_var: impl Into<String>,
    term: impl Into<String>,
    coeffs: impl IntoIterator<Item = (K, f64)>,
    bias: f64,
) -> &mut Self
```

A rule that concludes `out_var IS term` then contributes
$z = \text{bias} + \sum_k \text{coeffs}[k] \cdot x_k$ instead of the term's MF center.
Some details:

- It is only valid in a Sugeno system (`Defuzz::WeightedAverage`).
- `term` does **not** need to exist in the output variable. The output variable itself must
  be registered, but it can have no terms at all.
- Every coefficient name must be a registered input.
- Empty `coeffs` gives a constant (zeroth-order) consequent.
- Registering the same `(out_var, term)` again replaces the earlier consequent.

```rust
let x = Variable::new("x", 0.0, 10.0)?
    .with_term("lo", mf::triangle(0.0, 0.0, 10.0)?)
    .with_term("hi", mf::triangle(0.0, 10.0, 10.0)?);
let z = Variable::new("z", 0.0, 30.0)?;          // no terms needed

let mut tsk = FuzzySystem::sugeno();
tsk.add_input(x).add_output(z);
tsk.add_consequent("z", "steep", [("x", 2.0)], 1.0)                 // z = 1 + 2x
   .add_consequent("z", "flat", Vec::<(&str, f64)>::new(), 3.0);    // z = 3
tsk.add_rules_str(["IF x IS hi THEN z IS steep", "IF x IS lo THEN z IS flat"])?;

let out = tsk.compute([("x", 5.0)])?;   // 0.5·11 + 0.5·3 = 7
assert!((out["z"] - 7.0).abs() < 1e-9);
```

Mistakes in the setup are reported by `compute`, for example using `add_consequent` in a
Mamdani system, or a coefficient for an unknown input:

```text
invalid fuzzy system (2 problems):
  - add_consequent (linear TSK consequents) needs a Sugeno system: defuzz 'weighted_average'
  - consequent for 'tip IS steep': coefficient for unknown input 'servic' (did you mean 'service'?); inputs are: 'service'
```

## Checking the model

The system is checked once, on first use, and the result is cached until the next change.
Every name in every rule and consequent is resolved at that point. Inference then works on
indices only.

| Method | Returns |
|---|---|
| `check() -> Result<()>` | `Err(Error::InvalidModel)` describing every problem that would make `compute` fail. |
| `validate() -> Vec<String>` | Every finding as text. Errors come first (`"error: …"`), then warnings (`"warning: …"`). Empty when the model is clean. Rules are numbered from 1. |

Problems that are **errors** (and make `compute` fail):

- no inputs, no outputs or no rules
- a rule names an unknown input or output variable, or a term the variable does not have
  (with a hint if you used an output before `THEN` or an input after it)
- a rule concludes the same output twice
- a rule weight outside `[0, 1]`
- a variable registered as both input and output
- IT2 terms with `InferenceType::Type1`
- a `Defuzz` other than `Centroid` on an IT2 system (use `TypeReduction` instead)
- `add_consequent` in a non-Sugeno system, for an unknown output, or with an unknown input

**Warnings**: an input no rule uses; an output no rule concludes; a term that is zero over its
whole universe; an unused consequent; duplicate rules; two rules with the same condition but
different conclusions; NOT or a hedge in a Sugeno conclusion (Sugeno ignores them).

```text
error: rule #4 `IF service IS amazing THEN tip IS hgh`: output 'tip' has no term 'hgh' (did you mean 'high'?); its terms are: 'low', 'medium', 'high'
```

## Running inference

### `compute`

<!-- skip-check -->
```rust
pub fn compute<I, K, V>(&self, inputs: I) -> Result<HashMap<String, f64>>
where I: IntoIterator<Item = (K, V)>, K: AsRef<str>, V: Borrow<f64>
```

Pass anything that iterates `(name, value)` pairs: an array of tuples, a `Vec`, or a
`&HashMap<String, f64>`.

The result has an entry for **every** output variable. An output for which no rule fired is
`f64::NAN`. Check with `value.is_nan()`.

| Situation | Error |
|---|---|
| an input name that is not registered | `Error::UnknownInput`, e.g. `unknown input 'servce' (did you mean 'service'?); inputs are: 'service'` |
| a registered input is not supplied | `Error::MissingInput`, e.g. `missing input 'service' (every input must be given: 'service')` |
| an input value is NaN | `Error::InvalidInput`, e.g. `input 'service' is NaN` |
| the model is inconsistent | `Error::InvalidModel` (see [Checking the model](#checking-the-model)) |

```rust
let service = Variable::new("service", 0.0, 10.0)?.with_term("good", mf::triangle(0.0, 5.0, 10.0)?);
let tip = Variable::new("tip", 0.0, 30.0)?.with_term("medium", mf::triangle(10.0, 15.0, 20.0)?);
let mut system = FuzzySystem::new();
system.add_input(service).add_output(tip);
system.add_rule_str("IF service IS good THEN tip IS medium")?;

let out = system.compute([("service", 7.5)])?;
let tip = out["tip"];
if tip.is_nan() {
    println!("no rule fired");
}
```

### `evaluate`: positional

<!-- skip-check -->
```rust
pub fn evaluate(&self, inputs: &[f64]) -> Result<Vec<f64>>
```

Inputs and outputs are in registration order, with no strings or hash maps. This is
convenient in simulation loops. It gives `Error::InvalidInput` if the slice length differs
from the number of inputs.

<!-- skip-check -->
```rust
let dq = controller.evaluate(&[error, d_error])?[0];
```

### `compute_batch`: columns

<!-- skip-check -->
```rust
pub fn compute_batch<I, K, C>(&self, columns: I) -> Result<HashMap<String, Vec<f64>>>
where I: IntoIterator<Item = (K, C)>, K: AsRef<str>, C: AsRef<[f64]>
```

Supply one equal-length column per input. You get back one column per output, with `NaN`
where no rule fired. Unequal column lengths give `Error::InvalidInput`. Unknown or missing
columns and NaN values give the same errors as in `compute`. Enable the optional
`parallel` cargo feature to run the rows on all cores (this adds `rayon`):

```toml
ferrifuzz = { git = "https://github.com/ParsaBordbar/ferrifuzz", features = ["parallel"] }
```

### `compute_interval`

<!-- skip-check -->
```rust
pub fn compute_interval<I, K, V>(&self, inputs: I) -> Result<HashMap<String, (f64, f64)>>
```

For IT2 systems, this returns the type-reduced interval `(y_l, y_r)` per output. The crisp
output of `compute` is its midpoint. Type-1 systems return `(y, y)`.

## Looking inside

| Method | Returns | Use |
|---|---|---|
| `rule_strengths(inputs)` | `Result<Vec<f64>>` | Firing strength of every rule after its weight, in rule order. IT2 reports the interval midpoint. Useful for ANFIS-style least squares ([tutorial](../tutorials/sugeno-approximation.md)). |
| `rule_strengths_interval(inputs)` | `Result<Vec<(f64, f64)>>` | Firing interval per rule (`(s, s)` for type-1). |
| `output_set(inputs, output)` | `Result<(Vec<f64>, Vec<f64>)>` | The aggregated output set `(xs, mus)` of a type-1 Mamdani system on its grid. This is exactly what the defuzzifier sees. |
| `output_fou(inputs, output)` | `Result<(Vec<f64>, Vec<f64>, Vec<f64>)>` | `(xs, lower, upper)` aggregated footprint of uncertainty (lower == upper for type-1 Mamdani). |

`output_set` and `output_fou` return `Error::InvalidModel` for a Sugeno system, which has no
output set to sample. `output_set` also returns it for an IT2 system (use `output_fou`). An
unknown `output` name gives `Error::InvalidInput`.

```rust
// the one-input tipper
let service = Variable::new("service", 0.0, 10.0)?
    .with_term("poor", mf::trapezoid(0.0, 0.0, 2.0, 5.0)?)
    .with_term("good", mf::triangle(2.0, 5.0, 8.0)?)
    .with_term("excellent", mf::trapezoid(5.0, 8.0, 10.0, 10.0)?);
let tip = Variable::new("tip", 0.0, 30.0)?
    .with_term("low", mf::triangle(0.0, 5.0, 10.0)?)
    .with_term("medium", mf::triangle(10.0, 15.0, 20.0)?)
    .with_term("high", mf::triangle(20.0, 25.0, 30.0)?);
let mut system = FuzzySystem::new();
system.add_input(service).add_output(tip);
system.add_rules_str([
    "IF service IS poor THEN tip IS low",
    "IF service IS good THEN tip IS medium",
    "IF service IS excellent THEN tip IS high",
])?;

let w = system.rule_strengths([("service", 3.5)])?;
assert_eq!(w, [0.5, 0.5, 0.0]);
let (xs, mus) = system.output_set([("service", 7.5)], "tip")?;
assert_eq!(xs.len(), system.resolution() + 1);
```

## How a rule fires

1. Each input is checked, then clamped if clamping is on, then fuzzified.
2. For each clause, the term's degree is read and the clause's hedge and NOT are applied.
3. Inside each AND-group the degrees are folded with `and_method`. The groups are combined with
   `or_method`. The result is multiplied by the rule weight and clamped to `[0, 1]`.
4. **Mamdani**: each consequent set is shaped by the strength using `implication`.
   Identical consequents keep the maximum strength. Sets are max-aggregated on the output
   grid and then defuzzified.
   **Sugeno**: every fired rule contributes $(w_r, z_r)$ to a weighted average.
   **IT2**: interval strengths shape the lower and upper sets, the FOU is aggregated, and the
   result is type-reduced.
