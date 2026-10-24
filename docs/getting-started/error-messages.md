---
title: 'Reading error messages'
sidebar_label: 'Reading error messages'
description: 'What each ferrifuzz error means (FuzzyError, InputError, ModelError, RuleSyntaxError), when it is raised, and how to fix missing inputs, misspelled terms, bad rules and invalid membership functions.'
keywords: ['ferrifuzz errors', 'FuzzyError', 'InputError', 'ModelError', 'RuleSyntaxError']
---

# Reading error messages

Ferrifuzz prefers **failing loudly** to returning a silently wrong number. When something
is inconsistent (a typo in a rule, a missing input, an unknown method name) you get an
exception whose message names the problem, lists the valid choices, and often suggests
the closest one: *"did you mean 'excellent'?"*.

## Which exception?

All ferrifuzz errors derive from **`ff.FuzzyError`**, which is a subclass of Python's
`ValueError`. Catch the specific class when you want to handle one kind of problem, or
`ValueError` to catch them all.

```text
ValueError
└── ff.FuzzyError          invalid argument: bad MF parameters, unknown option name, ...
    ├── ff.InputError      bad input to compute(): missing, unknown or NaN
    ├── ff.ModelError      inconsistent system: unknown variable/term in a rule, bad weight, ...
    └── ff.RuleSyntaxError a rule string could not be parsed
```

| Exception | Rust `ferrifuzz::Error` | Raised when |
|---|---|---|
| `ff.InputError` | `MissingInput`, `UnknownInput`, `InvalidInput` | an input is missing from the dict passed to `compute`, a key is not a registered input, a value is NaN or not a number, or `compute_batch` columns have different lengths |
| `ff.ModelError` | `InvalidModel` | the system is inconsistent: a rule names an unknown variable or term, a rule weight is outside $[0, 1]$, `add_consequent` is used on a non‑Sugeno system or names an unknown input, an IT2 system has a `defuzz_method` other than centroid, ... |
| `ff.RuleSyntaxError` | `Parse` | a rule string is malformed (see [Rule syntax](../rule-syntax.md#parse-errors)) |
| `ff.FuzzyError` | `InvalidParameter` | an argument is invalid: `triangle(5, 0, 10)`, `gaussian(0, -1)`, an unknown option name such as `defuzz_method="centriod"`, swapped `it2` arguments, ... |
| `RuntimeError` | `NotFitted` | a fuzzy time series model is used before `fit()` |
| `ValueError` | | invalid `FuzzyTimeSeries` arguments or a NaN in the series passed to `fit` |
| `TypeError` | | wrong argument type, e.g. mixing a float and an IT2 `(lower, upper)` tuple in `Operator.t_norm` |
| `KeyError` | | `var["term"]` for a term the variable doesn't have |
| `ImportError` | | a `ferrifuzz.plot` function is called without matplotlib installed |

Model problems are reported when the system is first used (by `compute`, `check()`, ...),
not while you add rules one by one, and **all problems are listed at once**.

In Rust every fallible call returns `ferrifuzz::Result<T>`; see the
[Rust API overview](../rust-api/overview.md).

## Common errors and fixes

The examples use the two‑input tipper from [Your first system](./first-system.md).

<details>
<summary>Setup: the two‑input tipper</summary>

```python
import ferrifuzz as ff

service = ff.Variable("service", 0, 10)
service["poor"] = ff.mf.trapezoid(0, 0, 2, 5)
service["good"] = ff.mf.triangle(2, 5, 8)
service["excellent"] = ff.mf.trapezoid(5, 8, 10, 10)

food = ff.Variable("food", 0, 10)
food["rancid"] = ff.mf.trapezoid(0, 0, 1, 3)
food["delicious"] = ff.mf.trapezoid(7, 9, 10, 10)

tip = ff.Variable("tip", 0, 30)
tip["low"] = ff.mf.triangle(0, 5, 10)
tip["medium"] = ff.mf.triangle(10, 15, 20)
tip["high"] = ff.mf.triangle(20, 25, 30)

system = ff.FuzzySystem()
system.add_input(service)
system.add_input(food)
system.add_output(tip)
system.add_rules([
    "IF service IS poor OR food IS rancid THEN tip IS low",
    "IF service IS good THEN tip IS medium",
    "IF service IS excellent OR food IS delicious THEN tip IS high",
])
```

</details>


### A missing input

```python
system({"service": 7.5})          # the system also has an input called "food"
```

```text
ferrifuzz.InputError: missing input 'food' (every input must be given: 'service', 'food')
```

Every registered input must be supplied on every call. If an input is truly irrelevant,
it shouldn't be an input of the system.

### A misspelled input name

```python
system({"servce": 7.5, "food": 9.0})
```

```text
ferrifuzz.InputError: unknown input 'servce' (did you mean 'service'?); inputs are: 'service', 'food'
```

### A rule that names a term that doesn't exist

```python
system += ff.Rule.from_string("IF service IS excelent THEN tip IS high")
system({"service": 7.5, "food": 9.0})
```

```text
ferrifuzz.ModelError: invalid fuzzy system (1 problem):
  - rule #4 `IF service IS excelent THEN tip IS high`: input 'service' has no term 'excelent' (did you mean 'excellent'?); its terms are: 'poor', 'good', 'excellent'
```

Rules are numbered from 1 in the order you added them. To see problems without running
anything, call `system.validate()`, which returns them as a list (errors first, then
warnings) and never raises:

```python
print(system.validate())
# ["error: rule #4 `IF service IS excelent THEN tip IS high`: input 'service' has no term 'excelent' (did you mean 'excellent'?); its terms are: 'poor', 'good', 'excellent'"]
```

`system.check()` raises the same `ModelError` as `compute` would, which is handy in tests.

### A rule weight outside [0, 1]

```text
ferrifuzz.ModelError: invalid fuzzy system (1 problem):
  - rule #4 `IF service IS good THEN tip IS high WITH 1.5`: weight 1.5 is outside [0, 1]
```

### An unknown method name

```python
ff.FuzzySystem(defuzz_method="centriod")
```

```text
ferrifuzz.FuzzyError: unknown defuzzification method 'centriod' (did you mean 'centroid'?); valid options: 'centroid', 'bisector', 'mom', 'som', 'lom', 'weighted_average'
```

Every string option (`and_method`, `or_method`, `defuzz_method`, `implication`, `type`,
`type_reduction`, operator `kind`s, `automf` shapes) is checked this way. The full list of
valid names is in the [Python API overview](../python-api/overview.md#string-options).

### An IT2 system with a defuzzification method

```text
ferrifuzz.ModelError: invalid fuzzy system (1 problem):
  - interval type-2 systems are reduced with type_reduction (km, cos, height), not defuzz 'mom'; leave defuzz at 'centroid'
```

Interval type‑2 systems choose `type_reduction`, not `defuzz_method`. See the
[FAQ](../faq.md).

### An invalid membership function

```python
ff.mf.triangle(5, 0, 10)
```

```text
ferrifuzz.FuzzyError: triangle(5, 0, 10): needs a ≤ b ≤ c (feet a, c; peak b)
```

```python
ff.mf.it2(ff.mf.triangle(2, 5, 8), ff.mf.triangle(0, 5, 10))   # arguments swapped
```

```text
ferrifuzz.FuzzyError: IT2 lower MF triangle(0, 5, 10) is above upper MF triangle(2, 5, 8) at x=2 (0.4000 > 0.0000); the order is it2(upper, lower) — are they swapped?
```

### A malformed rule

```text
ferrifuzz.RuleSyntaxError: expected IS after variable 'temp', found 'hot'
  IF temp hot THEN fan IS fast
          ^
```

The caret points at the token where parsing stopped. The
[Rule syntax](../rule-syntax.md#parse-errors) page has a table of common parse errors.

## Not errors: things that look surprising

- **Inputs outside the universe are clamped.** With the default
  `FuzzySystem(clamp_inputs=True)`, an input of `15` for a variable on `[0, 10]` is treated
  as `10`. Pass `clamp_inputs=False` to evaluate the membership functions at the raw value
  instead.
- **An output can be `nan`.** `compute` always returns every output variable. If no rule
  fired for an output (all firing strengths are zero), its value is `nan`. Check with
  `math.isnan(...)`, or add rules that cover the gap.
- **Results land on a grid.** Mamdani defuzzification samples the output universe at
  `resolution + 1` points, so e.g. `"som"` returns a grid point rather than an exact
  peak. See [Defuzzification](../concepts/defuzzification.md).
- **`validate()` warnings** (unused inputs, duplicate rules, rules with the same condition
  but different conclusions, a term that is zero over its whole universe) don't stop
  `compute`; they point at likely mistakes.

More troubleshooting is in the [FAQ](../faq.md).
