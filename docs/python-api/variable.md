---
title: 'Variable (Python)'
sidebar_label: 'Variable'
description: 'ff.Variable: a linguistic variable with a universe of discourse and named terms; fuzzification and automf.'
---

# `Variable`

A linguistic variable: a name, a universe of discourse `[min_value, max_value]`, and named
**terms**, each backed by a membership function. The same class is used for inputs and
outputs. Background: [Linguistic variables](../concepts/linguistic-variables.md).

<!-- skip-check -->
```python
ff.Variable(name: str, min_value: float, max_value: float)
```

| Parameter | Description |
|---|---|
| `name` | the name rules use to refer to this variable (case‑sensitive, one word) |
| `min_value`, `max_value` | universe bounds; `ValueError` unless `min_value < max_value` |

```python
import ferrifuzz as ff

temp = ff.Variable("temp", 0, 40)
temp["cold"] = ff.mf.triangle(0, 0, 20)
temp["warm"] = ff.mf.triangle(10, 20, 30)
temp["hot"] = ff.mf.triangle(20, 40, 40)

print(repr(temp))          # Variable('temp', [0, 40], 3 terms)
print(temp)                # temp [0, 40]: cold = triangle(0, 0, 20), warm = triangle(10, 20, 30), hot = triangle(20, 40, 40)
print(temp.fuzzify(25))    # {'cold': 0.0, 'warm': 0.5, 'hot': 0.25}
```

## Attributes (read‑only)

| Attribute | Type |
|---|---|
| `name` | `str` |
| `min_value` | `float` |
| `max_value` | `float` |

## Terms: dictionary syntax

| Operation | Description |
|---|---|
| `var["hot"] = mf` | add a term, or replace an existing one with the same name. `mf` is a `Type1MF`, a shape class instance, or an `IT2MF`; anything else raises `TypeError` |
| `var["hot"]` | the term's MF (`Type1MF` or `IT2MF`); `KeyError` if there is no such term |
| `"hot" in var` | `True` if the term exists |
| `len(var)` | number of terms |
| `for name in var:` | iterate over term names |
| `var.get_terms()` | term names **in insertion order** |
| `var.clamp(x)` | `x` clipped into `[min_value, max_value]` |
| `str(var)` / `repr(var)` | every term with its parameters / a one‑line summary |

A variable may mix type‑1 and IT2 terms. If any term is IT2, a `FuzzySystem` with the
default `type="auto"` switches to interval type‑2 inference.

## Fuzzification

<!-- skip-check -->
```python
var.fuzzify(value) -> dict[str, float]
var(value)          # same thing
```

Returns `{term: degree}` for every term at the crisp `value`. Type‑1 terms give a `float`;
interval type‑2 terms give a `(lower, upper)` tuple.

`fuzzify` evaluates the MFs at exactly `value`, even outside `[min_value, max_value]`. The
clamping of out‑of‑range inputs happens in [`FuzzySystem.compute`](./fuzzy-system.md#input-handling).

## `automf`: evenly spaced terms

<!-- skip-check -->
```python
var.automf(names=3, shape="triangle") -> Variable
```

Writing five overlapping triangles by hand is tedious. `automf` replaces the variable's
terms with `n` evenly spaced, overlapping terms over the universe. The first and last
terms peak at `min_value` and `max_value`; neighbouring triangles cross at 0.5.

```python
error = ff.Variable("error", -1, 1)
error.automf(5)
print(error.get_terms())
# ['very_low', 'low', 'medium', 'high', 'very_high']

speed = ff.Variable("speed", 0, 120).automf(["slow", "normal", "fast"], shape="gaussian")
print(speed)
# speed [0, 120]: slow = gaussian(0, 30), normal = gaussian(60, 30), fast = gaussian(120, 30)
```

`automf` returns the variable itself, so it chains.

| Argument | Description |
|---|---|
| `names` | number of terms (≥ 2, default 3), or the list of term names to use |
| `shape` | `"triangle"` (default; aliases `triangular`, `trimf`) or `"gaussian"` (`gauss`, `gaussmf`); Gaussian terms use `sigma = step / 2` |

Default names when you pass a number:

| `n` | Names |
|---|---|
| 2 | `low`, `high` |
| 3 | `low`, `medium`, `high` |
| 5 | `very_low`, `low`, `medium`, `high`, `very_high` |
| 7 | `NB`, `NM`, `NS`, `ZE`, `PS`, `PM`, `PB` (negative big … positive big, the control convention) |
| other | `A1`, `A2`, …, `An` |

## Plotting

With matplotlib installed, `ferrifuzz.plot.plot_variable(var)` draws every term (and the
shaded footprint of IT2 terms). See [Plotting](./plot.md).
