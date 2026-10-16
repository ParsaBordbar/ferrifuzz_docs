---
title: 'Your first fuzzy system in 5 minutes'
sidebar_label: 'Your first system'
description: 'Build, run, check and plot a small Mamdani fuzzy system with ferrifuzz.'
---

# Your first fuzzy system in 5 minutes

We will build the classic **tipping** controller: given how good the service was
(0 to 10), decide on a tip (0 to 30 %). Every code block below continues the previous one,
so you can paste them into one file or notebook.

## 1. Membership functions

A membership function (MF) maps a crisp number to a degree of truth in $[0, 1]$.

```python
import ferrifuzz as ff

good = ff.mf.triangle(2, 5, 8)      # 0 at 2, peak 1 at 5, 0 again at 8
print(good.membership(5.0))         # 1.0
print(good.membership(6.5))         # 0.5
print(good.membership(9.0))         # 0.0
```

There are six shapes (`triangle`, `trapezoid`, `gaussian`, `bell`, `sigmoid`,
`singleton`). See [Membership functions](../concepts/membership-functions.md).

## 2. Linguistic variables

A `Variable` is a named range (the *universe of discourse*) holding named **terms**, each
backed by an MF. Add terms with dictionary syntax:

```python
service = ff.Variable("service", 0, 10)
service["poor"] = ff.mf.trapezoid(0, 0, 2, 5)
service["good"] = ff.mf.triangle(2, 5, 8)
service["excellent"] = ff.mf.trapezoid(5, 8, 10, 10)

tip = ff.Variable("tip", 0, 30)
tip["low"] = ff.mf.triangle(0, 5, 10)
tip["medium"] = ff.mf.triangle(10, 15, 20)
tip["high"] = ff.mf.triangle(20, 25, 30)
```

**Fuzzification** asks "how much does 7.5 belong to each term?":

```python
print(service.fuzzify(7.5))
# {'poor': 0.0, 'good': 0.1666..., 'excellent': 0.8333...}
```

`service(7.5)` is a shorthand for the same call.

## 3. System and rules

```python
system = ff.FuzzySystem()          # Mamdani: min AND, max OR, centroid
system.add_input(service)
system.add_output(tip)

system += ff.Rule.from_string("IF service IS poor THEN tip IS low")
system += ff.Rule.from_string("IF service IS good THEN tip IS medium")
system += ff.Rule.from_string("IF service IS excellent THEN tip IS high")
```

Rules are plain strings (`system += "IF ..."` also works without `Rule.from_string`).
Variable and term names must match what you registered. The full
grammar (AND, OR, NOT, hedges, parentheses, weights, several outputs) is on the
[Rule syntax](../rule-syntax.md) page.

## 4. Run it

```python
print(system({"service": 7.5}))    # {'tip': 22.6079...}

for s in [0, 2.5, 5, 7.5, 10]:
    print(s, round(system({"service": s})["tip"], 2))
# 0 5.0
# 2.5 7.39
# 5 15.0
# 7.5 22.61
# 10 25.0
```

`system(inputs)` is shorthand for `system.compute(inputs)`. It returns a dict with one
crisp value **per output variable**.

## 5. Check your rule base

`validate()` reports typos and gaps without running anything. An empty list means the rule
base is consistent:

```python
print(system.validate())    # []
```

## 6. Add a second input

Real systems have several inputs. Rules combine them with `AND` / `OR`:

```python
food = ff.Variable("food", 0, 10)
food["rancid"] = ff.mf.trapezoid(0, 0, 1, 3)
food["delicious"] = ff.mf.trapezoid(7, 9, 10, 10)
system.add_input(food)

system += ff.Rule.from_string("IF service IS poor OR food IS rancid THEN tip IS low")
system += ff.Rule.from_string("IF service IS excellent AND food IS delicious THEN tip IS high")

print(system({"service": 3.0, "food": 2.0}))    # {'tip': 8.8468...}
```

:::caution Supply every input
Once `food` is registered, every call must provide it. `system({"service": 7.5})` now
raises `ff.InputError: missing input 'food' ...`. See
[Reading error messages](./error-messages.md).
:::

## 7. Many inputs at once

For sweeps and plots, `compute_batch` runs a whole column of inputs in one call (in Rust,
without a Python loop):

```python
out = system.compute_batch({"service": [2.0, 5.0, 9.0], "food": [1.0, 5.0, 9.5]})
print(out["tip"])    # [ 5.0005 15.  24.9995]  (a NumPy array if numpy is installed)
```

## 8. Plot it (optional, needs matplotlib)

```python
import matplotlib.pyplot as plt
from ferrifuzz.plot import plot_variable, plot_surface

plot_variable(service)                              # every term of a variable
plot_surface(system, "service", "food", "tip")      # 3-D control surface
plt.show()
```

## The whole thing

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
for rule in [
    "IF service IS poor OR food IS rancid THEN tip IS low",
    "IF service IS good THEN tip IS medium",
    "IF service IS excellent OR food IS delicious THEN tip IS high",
]:
    system += ff.Rule.from_string(rule)

assert system.validate() == []
print(system({"service": 7.5, "food": 9.0}))
```

## Next steps

- [Reading error messages](./error-messages.md): what to do when something raises.
- [Concepts](../concepts/what-is-fuzzy.md): the theory behind each step.
- [Tipping tutorial](../tutorials/tipping.md): the full version of this example, with
  defuzzification comparisons and a control surface.
- [`FuzzySystem` reference](../python-api/fuzzy-system.md): every option.
