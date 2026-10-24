---
title: 'Python API overview'
sidebar_label: 'Overview'
description: 'Overview of the ferrifuzz Python API: module layout, conventions, every valid string option for method parameters, and a complete example.'
keywords: ['ferrifuzz python api', 'fuzzy logic python library']
---

# Python API overview

```python
import ferrifuzz as ff
```

Everything in the core lives at the top level; three pure‑Python submodules add time
series, metrics and plotting.

| Name | What it is | Reference |
|---|---|---|
| `ff.mf` | factory functions: `triangle`, `trapezoid`, `gaussian`, `bell`, `sigmoid`, `singleton`, `it2` | [Membership functions](./membership.md) |
| `ff.Type1MF`, `ff.IT2MF` | the objects those factories return | [Membership functions](./membership.md) |
| `ff.TriangularMF`, `ff.TrapezoidalMF`, `ff.GaussianMF`, `ff.BellMF`, `ff.SigmoidMF`, `ff.SingletonMF` | stand‑alone shape classes | [Membership functions](./membership.md) |
| `ff.Variable` | linguistic variable: universe + named terms | [Variable](./variable.md) |
| `ff.Rule`, `ff.Clause` | IF‑THEN rules and their clauses | [Rule & Clause](./rule.md) |
| `ff.Operator`, `ff.Hedge` | t‑norms, t‑conorms, complements; power hedges | [Operators & hedges](./operators-hedges.md) |
| `ff.FuzzySystem` | the inference engine (Mamdani, Sugeno/TSK, IT2) | [FuzzySystem](./fuzzy-system.md) |
| `ff.fts` | `FuzzyTimeSeries`, `Partition`, `FLRG` | [Fuzzy time series](./fts.md) |
| `ff.metrics` | `rmse`, `mae`, `mape`, `score` | [Metrics](./metrics.md) |
| `ff.plot` | matplotlib helpers (optional, imported on first use) | [Plotting](./plot.md) |
| `ff.FuzzyError`, `ff.InputError`, `ff.ModelError`, `ff.RuleSyntaxError` | exception classes (all `ValueError` subclasses) | [Reading error messages](../getting-started/error-messages.md) |
| `ff.__version__` | installed version string, e.g. `"0.2.1"` | |

The package ships type stubs (`_core.pyi`, `py.typed`), so editors and `mypy` see every
signature and autocomplete the string options below.

## Conventions

- **Numbers**: anywhere a `float` is expected, an `int` works too (`ff.mf.triangle(0, 5, 10)`).
- **Names are case‑sensitive**: variable and term names in rules must match exactly.
- **String options are case‑insensitive** and accept a few aliases (table below). An
  unknown name raises `ff.FuzzyError` (a `ValueError`) listing the valid ones and
  suggesting the closest. Properties such as `system.defuzz_method` report the canonical
  name.
- **Errors**: everything invalid raises a subclass of `ff.FuzzyError` (itself a
  `ValueError`): `ff.InputError` for bad inputs to `compute`, `ff.ModelError` for an
  inconsistent system, `ff.RuleSyntaxError` for a malformed rule. An unfitted time series
  model raises `RuntimeError`. See [Reading error messages](../getting-started/error-messages.md).
- **Copies**: `add_input`/`add_output` store a copy of the variable, and
  `system.input(name)` / `system.rules` return copies.
- **Interval type‑2 degrees** are `(lower, upper)` tuples everywhere.

## String options

Canonical names first, aliases in parentheses.

| Parameter | Valid values |
|---|---|
| `FuzzySystem(and_method=...)` and `Operator.t_norm(kind=...)` | `"min"` (`godel`, `zadeh`, `standard`) · `"product"` (`prod`, `algebraic`) · `"lukasiewicz"` (`luk`, `bounded`) · `"drastic"` · `"einstein"` · `"hamacher"` |
| `FuzzySystem(or_method=...)` and `Operator.t_conorm(kind=...)` | `"max"` (`godel`, `zadeh`, `standard`) · `"probor"` (`prob`, `probabilistic`, `algebraic`) · `"lukasiewicz"` (`luk`, `bounded`) · `"drastic"` · `"einstein"` · `"hamacher"` |
| `Operator.complement(kind=...)` | `"standard"` (`zadeh`) · `"sugeno"` (needs `param` λ > −1) · `"yager"` (needs `param` w > 0) |
| `FuzzySystem(defuzz_method=...)` | `"centroid"` (`cog`, `coa`) · `"bisector"` · `"mom"` · `"som"` · `"lom"` · `"weighted_average"` (`sugeno`, `wtaver`) |
| `FuzzySystem(implication=...)` | `"mamdani"` (`min`) · `"larsen"` (`product`, `prod`) |
| `FuzzySystem(type=...)` | `"auto"` · `"t1"` (`type1`, `type-1`, `mamdani`, `sugeno`) · `"it2"` (`type2`, `type-2`, `interval`) |
| `FuzzySystem(type_reduction=...)` | `"km"` (`karnik_mendel`, `karnik-mendel`) · `"cos"` (`center_of_sets`, `centerofsets`) · `"height"` |
| `Clause(hedge=...)` and hedge words in rules | `"very"` · `"extremely"` · `"somewhat"` · `"more_or_less"` · `"slightly"` · `"plus"` · `"minus"` |
| `FuzzyTimeSeries(mf_type=...)` | `"triangle"` · `"gaussian"` (exact, lower case) |
| `FuzzyTimeSeries(partitioner=...)` | `"equal_width"` |
| `Variable.automf(shape=...)` | `"triangle"` (`triangular`, `trimf`) · `"gaussian"` (`gauss`, `gaussmf`) |

:::note `type="t1"` accepts `"mamdani"` and `"sugeno"`
These two aliases only select the **type‑1 engine**. Whether a type‑1 system behaves as
Mamdani or Sugeno is decided by `defuzz_method` (`"weighted_average"`/`"sugeno"` means
Sugeno). See [FuzzySystem](./fuzzy-system.md#mamdani-sugeno-or-it2).
:::

## A complete example

```python
import ferrifuzz as ff

temp = ff.Variable("temp", 0, 40)
temp["cold"] = ff.mf.triangle(0, 0, 20)
temp["warm"] = ff.mf.triangle(10, 20, 30)
temp["hot"] = ff.mf.triangle(20, 40, 40)

fan = ff.Variable("fan", 0, 100)
fan["slow"] = ff.mf.triangle(0, 0, 50)
fan["medium"] = ff.mf.triangle(25, 50, 75)
fan["fast"] = ff.mf.triangle(50, 100, 100)

system = ff.FuzzySystem(and_method="min", or_method="max", defuzz_method="centroid")
system.add_input(temp)
system.add_output(fan)
system += ff.Rule.from_string("IF temp IS cold THEN fan IS slow")
system += ff.Rule.from_string("IF temp IS warm THEN fan IS medium")
system += ff.Rule.from_string("IF temp IS hot THEN fan IS fast")

print(system({"temp": 25.0}))    # {'fan': 59.88...}
```
