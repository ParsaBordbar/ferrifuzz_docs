---
title: 'FuzzySystem (Python)'
sidebar_label: 'FuzzySystem'
description: 'Python API for ff.FuzzySystem: Mamdani, Sugeno and interval type-2 options, building a rule base, compute, compute_batch, compute_interval, rule strengths, output sets and validation.'
keywords: ['FuzzySystem', 'mamdani python', 'sugeno python', 'type-2 fuzzy python']
---

# `FuzzySystem`

The inference engine. One class covers type‑1 **Mamdani**, **Sugeno/TSK** and **interval
type‑2** Mamdani inference. Background: [Mamdani vs Sugeno](../concepts/inference.md),
[Defuzzification](../concepts/defuzzification.md), [Interval type‑2](../concepts/interval-type-2.md).

<details>
<summary>Setup used by the examples on this page</summary>

Copy this first; every snippet below builds on it.

```python
import numpy as np
import ferrifuzz as ff

temp = ff.Variable("temp", 0, 40)
temp["cold"] = ff.mf.triangle(0, 0, 20)
temp["warm"] = ff.mf.triangle(10, 20, 30)
temp["hot"] = ff.mf.triangle(20, 40, 40)

fan = ff.Variable("fan", 0, 100)
fan["slow"] = ff.mf.triangle(0, 0, 50)
fan["medium"] = ff.mf.triangle(25, 50, 75)
fan["fast"] = ff.mf.triangle(50, 100, 100)

RULES = [
    "IF temp IS cold THEN fan IS slow",
    "IF temp IS warm THEN fan IS medium",
    "IF temp IS hot THEN fan IS fast",
]


def build(**options):
    """The temp -> fan system with FuzzySystem(**options)."""
    s = ff.FuzzySystem(**options)
    s.add_input(temp)
    s.add_output(fan)
    s.add_rules(RULES)
    return s


system = build()

# an interval type-2 version: each set gets a narrower, 80 %-tall lower MF
temp2, fan2 = ff.Variable("temp", 0, 40), ff.Variable("fan", 0, 100)
for var, src in ((temp2, temp), (fan2, fan)):
    for name in src.get_terms():
        a, b, c = src[name].key_points()
        w = (c - a) / 8
        var[name] = ff.mf.it2(src[name], ff.mf.triangle(min(a + w, b), b, max(c - w, b)), lower_height=0.8)
it2_system = ff.FuzzySystem()
it2_system.add_input(temp2)
it2_system.add_output(fan2)
it2_system.add_rules(RULES)

# the two-input tipper from "Your first system"
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

tipper = ff.FuzzySystem()
tipper.add_input(service)
tipper.add_input(food)
tipper.add_output(tip)
tipper.add_rules([
    "IF service IS poor OR food IS rancid THEN tip IS low",
    "IF service IS good THEN tip IS medium",
    "IF service IS excellent OR food IS delicious THEN tip IS high",
])
```

</details>

## Constructor

```python
ff.FuzzySystem(
    and_method="min",
    or_method="max",
    defuzz_method="centroid",
    resolution=200,
    type="auto",
    implication="mamdani",
    type_reduction="km",
    clamp_inputs=True,
)
```

| Parameter | Default | Valid values | Used by |
|---|---|---|---|
| `and_method` | `"min"` | `"min"`, `"product"`, `"lukasiewicz"`, `"drastic"`, `"einstein"`, `"hamacher"` | all: combines clauses inside an AND‑group |
| `or_method` | `"max"` | `"max"`, `"probor"`, `"lukasiewicz"`, `"drastic"`, `"einstein"`, `"hamacher"` | all: combines OR‑groups of one rule |
| `defuzz_method` | `"centroid"` | `"centroid"`, `"bisector"`, `"mom"`, `"som"`, `"lom"`, `"weighted_average"` (alias `"sugeno"`) | type‑1 only (IT2 systems must leave it at `"centroid"`). `"weighted_average"` makes the system Sugeno/TSK |
| `resolution` | `200` | int ≥ 1 | Mamdani defuzzification and IT2 `"km"`: number of steps on the output grid |
| `type` | `"auto"` | `"auto"`, `"t1"`, `"it2"` | `"auto"` picks IT2 when any registered variable has an IT2 term |
| `implication` | `"mamdani"` | `"mamdani"` (clip, $\min(\mu, w)$), `"larsen"` (scale, $\mu \cdot w$) | Mamdani and IT2 |
| `type_reduction` | `"km"` | `"km"` (Karnik–Mendel), `"cos"` (center of sets), `"height"` | IT2 only |
| `clamp_inputs` | `True` | `bool` | clamp each input into its variable's `[min_value, max_value]` before fuzzifying |

All string options are case‑insensitive and have aliases; the full list is in the
[overview](./overview.md#string-options). An unknown name raises `ff.FuzzyError`:

```python
ff.FuzzySystem(defuzz_method="centriod")
# ferrifuzz.FuzzyError: unknown defuzzification method 'centriod' (did you mean 'centroid'?); valid options: ...
```

Every constructor argument can be read back as a property with its canonical name:
`system.and_method`, `or_method`, `defuzz_method`, `resolution`, `type`, `implication`,
`type_reduction`, `clamp_inputs`. `system.is_it2` tells you whether the IT2 engine will run.

### Mamdani, Sugeno or IT2?

| You want | Configure |
|---|---|
| Mamdani (fuzzy output sets, defuzzified) | defaults; pick `defuzz_method` and `implication` |
| Sugeno / TSK (constant or linear consequents) | `defuzz_method="weighted_average"` (or `"sugeno"`) |
| Interval type‑2 Mamdani | give variables IT2 terms (`ff.mf.it2`) and keep `type="auto"`, or force `type="it2"`; pick `type_reduction` |

IT2 systems don't defuzzify: the crisp output is the midpoint of the type‑reduced
interval, and `type_reduction` chooses how that interval is computed. Setting a
`defuzz_method` other than `"centroid"` on an IT2 system is a `ModelError`, and so is
`type="t1"` with IT2 terms.

## Building the system

| Method | Description |
|---|---|
| `add_input(variable)` | register an input `Variable` (replaces an input with the same name) |
| `add_output(variable)` | register an output `Variable` (replaces an output with the same name) |
| `add_rule(rule)` / `system += rule` | append a `Rule` or a rule string |
| `add_rules(rules)` | append a list of `Rule`s / strings; nothing is added if one fails to parse |
| `add_consequent(out_var, term, coeffs, bias=0.0)` | register a first‑order TSK consequent (Sugeno only, below) |

The variable is **copied** into the system when you add it. Changing the `Variable` object
afterwards does not affect the system; add it again to replace it.

Nothing is checked while you build. The first `compute` (or `check()`) validates the whole
system and raises one `ff.ModelError` listing every problem.

The examples on this page use the `temp → fan` system from the [overview](./overview.md):

```python
system = ff.FuzzySystem()
system.add_input(temp)
system.add_output(fan)
system += ff.Rule.from_string("IF temp IS cold THEN fan IS slow")
system += "IF temp IS warm THEN fan IS medium"          # a plain string works too
system.add_rules(["IF temp IS hot THEN fan IS fast"])
```

### Sugeno consequents: `add_consequent`

In a Sugeno system each fired rule contributes a crisp value $z$, and the output is the
firing‑strength‑weighted average $y = \sum_i w_i z_i / \sum_i w_i$ over fired rules.

- **0th order** (constant): if a consequent term has no registered consequent, $z$ is the
  term MF's `center()`. Singletons (`ff.mf.singleton(10)`) make this explicit.
- **1st order** (linear): `add_consequent(out_var, term, coeffs, bias)` sets
  $z = \text{bias} + \sum_k \text{coeffs}[k] \cdot x_k$ for rules concluding `out_var IS term`.

```python
x = ff.Variable("x", 0, 10)
x["lo"] = ff.mf.triangle(0, 0, 10)
x["hi"] = ff.mf.triangle(0, 10, 10)
y = ff.Variable("y", 0, 10)
y["hi"] = ff.mf.triangle(0, 10, 10)
z = ff.Variable("z", 0, 30)              # the output still has to be registered

tsk = ff.FuzzySystem(defuzz_method="sugeno")
tsk.add_input(x)
tsk.add_input(y)
tsk.add_output(z)
tsk.add_consequent("z", "steep", coeffs={"x": 2.0}, bias=1.0)     # z = 1 + 2x
tsk.add_consequent("z", "sum", coeffs={"x": 1.0, "y": 1.0})       # z = x + y
tsk += ff.Rule.from_string("IF x IS hi THEN z IS steep")
tsk += ff.Rule.from_string("IF x IS hi AND y IS hi THEN z IS sum")

print(tsk({"x": 10, "y": 10}))    # {'z': 20.5}
print(tsk({"x": 4, "y": 5}))      # {'z': 9.0}
```

The consequent's term name (`"steep"`) does not need an MF on the output variable, so
every rule can have its own linear consequent. Calling `add_consequent` again for the same
`(out_var, term)` replaces it. When the system is used, `compute` raises `ff.ModelError` if
the system is not Sugeno (`defuzz_method` is not `"weighted_average"`), if `out_var` is not a
registered output, or if `coeffs` names a variable that is not a registered input.

## Running inference

### `compute`

<!-- skip-check -->
```python
system.compute(inputs: Mapping[str, float]) -> dict[str, float]
system(inputs)    # same thing
```

Returns `{output_name: crisp_value}` with **every** output variable, in registration order.
`inputs` can be any mapping (a dict, a pandas row, ...):

```python
print(system({"temp": 25.0}))    # {'fan': 59.88...}
```

### Input handling

| Situation | Behavior |
|---|---|
| an input variable is missing from `inputs` | `ff.InputError` naming the missing input |
| a key is not a registered input | `ff.InputError`, with a "did you mean ...?" suggestion |
| a value is NaN or not a number | `ff.InputError` |
| a value is outside `[min_value, max_value]` | clamped to the nearest bound (default); with `clamp_inputs=False`, the MFs are evaluated at the raw value |
| a rule names an unknown variable or term, a weight is outside $[0, 1]$, ... | `ff.ModelError` listing every problem (`validate()` lists them without raising) |
| no rule fired for an output | that output is `nan` |

```python
import math

out = system({"temp": 25.0})
if math.isnan(out["fan"]):
    print("no rule covers this input")
```

### `evaluate`: positional, for simulation loops

<!-- skip-check -->
```python
system.evaluate(values: list[float]) -> list[float]
```

Input values in `input_names()` order in, output values in `output_names()` order out. It
skips building dictionaries, so it is the fastest way to call the system once per step in
a simulation:

```python
print(system.input_names())        # ['temp']
print(system.evaluate([25.0]))     # [59.88...]
```

### `compute_batch`

<!-- skip-check -->
```python
system.compute_batch(inputs: dict[str, Sequence[float]]) -> dict[str, array | list]
```

Vectorized inference: each input is a column (list or 1‑D NumPy array), all columns the
same length $N$. Returns one column of length $N$ per output: a NumPy array when NumPy is
installed, otherwise a list. The loop runs in Rust (on all CPU cores), so it is much faster
than calling `compute` in a Python loop. Rows where no rule fired hold `nan`. The same input
checks as `compute` apply; columns of different lengths raise `ff.InputError`.

```python
import numpy as np

out = system.compute_batch({"temp": np.array([5.0, 25.0, 35.0])})
print(out["fan"])    # [17.3597... 59.8834... 82.6402...]
```

A control surface over a grid:

```python
s, f = np.meshgrid(np.linspace(0, 10, 41), np.linspace(0, 10, 41))
z = tipper.compute_batch({"service": s.ravel(), "food": f.ravel()})["tip"].reshape(s.shape)
```

## Looking inside an inference

### `rule_strengths`

<!-- skip-check -->
```python
system.rule_strengths(inputs: dict[str, float]) -> list[float]
```

The firing strength of every rule, in the order the rules were added (after weights;
0 for rules that did not fire). `rule_strengths_interval(inputs)` returns the
`(lower, upper)` firing interval of every rule, which is what an IT2 system uses. Useful to
explain a result, and for ANFIS‑style least‑squares fitting of Sugeno consequents (see the
[Sugeno approximation tutorial](../tutorials/sugeno-approximation.md)):

```python
print(tipper.rule_strengths({"service": 3, "food": 3}))
# [0.6666..., 0.3333..., 0.0]
```

```python
w = np.array(tsk.rule_strengths({"x": 4, "y": 5}))
w_normalized = w / w.sum()
```

### `output_set`

<!-- skip-check -->
```python
system.output_set(inputs: Mapping[str, float], output: str) -> tuple[array, array]
system.output_fou(inputs, output) -> tuple[array, array, array]     # (xs, lower, upper)
```

`output_set` returns the aggregated (implied and max‑combined) output fuzzy set of a type‑1
Mamdani system, sampled on the defuzzification grid: `xs` are `resolution + 1` evenly
spaced points over the output universe and `mus` the membership at each (NumPy arrays, or
lists without NumPy). It raises `ff.ModelError` on a Sugeno system, which has no output set.
`output_fou` is the IT2 counterpart and returns the lower and upper bounds of the
aggregated footprint of uncertainty. Plot them to see what the defuzzifier sees:

```python
import matplotlib.pyplot as plt

xs, mus = system.output_set({"temp": 25.0}, "fan")
fig, ax = plt.subplots()
ax.fill_between(xs, mus, alpha=0.4)
```

`ferrifuzz.plot.plot_output` does this for you, with the defuzzified value marked. See
[Plotting](./plot.md).

### `compute_interval` (IT2)

<!-- skip-check -->
```python
system.compute_interval(inputs: Mapping[str, float]) -> dict[str, tuple[float, float]]
```

For an interval type‑2 system, the type‑reduced interval $[y_l, y_r]$ of every output,
before it is collapsed to the midpoint that `compute` returns. The width $y_r - y_l$ is a
measure of how uncertain the output is. The pair is always ordered ($y_l \le y_r$) for
every `type_reduction`. A type‑1 system returns `(y, y)`.

```python
lo, hi = it2_system.compute_interval({"temp": 25.0})["fan"]
crisp = (lo + hi) / 2        # == it2_system({"temp": 25.0})["fan"]
```

## Defuzzification grid

Mamdani defuzzification (and IT2 `"km"` type reduction) samples each output universe at
`resolution + 1` evenly spaced points, with step $(\text{max} - \text{min}) / \text{resolution}$.
So:

- `"som"`, `"lom"`, `"mom"` and `"bisector"` return values **on that grid** (for
  `fan` on `[0, 100]` with the default `resolution=200`, multiples of 0.5).
- `"centroid"` is a discrete approximation of the integral; it converges as `resolution`
  grows.
- `"weighted_average"` (Sugeno) and the IT2 `"cos"`/`"height"` reductions use MF centers
  analytically and ignore `resolution`.

```python
for res in (20, 200, 2000):
    print(res, build(resolution=res)({"temp": 25.0}))
# 20 {'fan': 60.90...}
# 200 {'fan': 59.88...}
# 2000 {'fan': 59.79...}
```

More in [Defuzzification](../concepts/defuzzification.md).

## Inspection

| Method | Returns |
|---|---|
| `input_names()` | `list[str]` of input variable names, in registration order |
| `output_names()` | `list[str]` of output variable names |
| `input(name)`, `output(name)` | a copy of the registered `Variable`, or `None` |
| `rules` | list of copies of the rules (property) |
| `rule_count()` | number of rules |
| `rules_str()` | every rule as a string |
| `check()` | raises `ff.ModelError` describing every problem that would make `compute` fail; returns `None` when the system is valid |
| `validate()` | `list[str]` of problems (`"error: ..."` lines first, then `"warning: ..."`), empty when the system is clean; never raises |
| `repr(system)` | e.g. `FuzzySystem: Mamdani (defuzz=centroid, implication=mamdani); and=min, or=max; inputs [service, food] → outputs [tip]; 3 rules` |

### `validate`

A static check of the whole system that never raises. **Errors** (prefixed `error:`) are
the problems that make `compute` raise: unknown variables or terms in rules, weights
outside $[0, 1]$, a rule concluding the same output twice, misused `add_consequent`, IT2
terms with `type="t1"`, a non‑centroid `defuzz_method` on an IT2 system, no inputs/outputs/
rules. **Warnings** (prefixed `warning:`) point at likely mistakes that don't stop
inference: outputs no rule concludes, inputs no rule uses, duplicate rules, two rules with
the same condition but different conclusions, a term that is zero over its whole universe,
an unused `add_consequent`, `NOT`/hedges in a Sugeno conclusion (ignored).

```python
system += "IF temp IS boiling THEN fan IS fast"
print(system.validate())
# ["error: rule #4 `IF temp IS boiling THEN fan IS fast`: input 'temp' has no term 'boiling'; its terms are: 'cold', 'warm', 'hot'"]
```

Calling `assert system.validate() == []` after building a system is a good habit.
