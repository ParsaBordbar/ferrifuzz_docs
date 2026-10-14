---
title: 'Tutorial: The Tipping Problem'
sidebar_label: 'Tipping problem (Mamdani)'
description: 'Build the classic two-input Mamdani tipper with OR, NOT and hedges, compare all six defuzzifiers, and compute the control surface.'
---

# The tipping problem (Mamdani)

**Goal.** Decide what percentage to tip from two ratings, *service* and *food*, each on a 0–10
scale. It's the "hello world" of fuzzy control. Here we use it to practise:

- a two-input Mamdani system with `OR`, `NOT` and hedges in the rules,
- comparing all six defuzzification methods on the same rule base,
- computing the whole control surface in one `compute_batch` call.

You need `ferrifuzz`. The surface step also needs `numpy`, and the plotting step needs `matplotlib`.

## 1. Variables and rules

```python
import ferrifuzz as ff

service = ff.Variable("service", 0, 10)
service["poor"] = ff.mf.gaussian(0, 1.5)
service["good"] = ff.mf.gaussian(5, 1.5)
service["excellent"] = ff.mf.gaussian(10, 1.5)

food = ff.Variable("food", 0, 10)
food["rancid"] = ff.mf.trapezoid(0, 0, 1, 3)
food["ok"] = ff.mf.triangle(2, 5, 8)
food["delicious"] = ff.mf.trapezoid(7, 9, 10, 10)

tip = ff.Variable("tip", 0, 30)
tip["low"] = ff.mf.triangle(0, 5, 10)
tip["medium"] = ff.mf.triangle(10, 15, 20)
tip["high"] = ff.mf.triangle(20, 25, 30)

RULES = [
    "IF service IS poor OR food IS rancid THEN tip IS low",
    "IF service IS good THEN tip IS medium",
    "IF service IS excellent OR food IS delicious THEN tip IS high",
    "IF service IS very excellent AND food IS delicious THEN tip IS high",
    "IF service IS NOT poor AND food IS ok THEN tip IS medium",
    "IF service IS somewhat poor AND food IS NOT delicious THEN tip IS low",
]


def build(defuzz="centroid"):
    s = ff.FuzzySystem(defuzz_method=defuzz)
    s.add_input(service)
    s.add_input(food)
    s.add_output(tip)
    for r in RULES:
        s += ff.Rule.from_string(r)
    return s


system = build()
print(system)
print("issues:", system.validate())
print(system({"service": 6.5, "food": 9.8}))
```

```text
FuzzySystem: Mamdani (defuzz=centroid, implication=mamdani); and=min, or=max; inputs [service, food] → outputs [tip]; 6 rules
issues: []
{'tip': 20.41730475798922}
```

`validate()` returns an empty list when every rule refers to registered variables and terms. Run
it whenever you edit a rule base. The [rule syntax](../rule-syntax.md) page explains `very`,
`somewhat` and `NOT`.

## 2. Compare the defuzzifiers

All six methods run on the same rules:

```python
METHODS = ["centroid", "bisector", "mom", "som", "lom", "weighted_average"]
CASES = [(0.0, 0.0), (2.0, 8.0), (5.0, 5.0), (6.5, 9.8), (10.0, 10.0)]
systems = {m: build(m) for m in METHODS}

print(f"{'service':>7} {'food':>5} " + " ".join(f"{m[:8]:>8}" for m in METHODS))
for sv, fd in CASES:
    row = [systems[m]({"service": sv, "food": fd})["tip"] for m in METHODS]
    print(f"{sv:7.1f} {fd:5.1f} " + " ".join(f"{v:8.2f}" for v in row))
```

```text
service  food centroid bisector      mom      som      lom weighted
    0.0   0.0     5.08     4.95     4.95     4.95     4.95     5.02
    2.0   8.0    15.00    15.00    15.00     2.55    27.45    12.34
    5.0   5.0    14.00    14.70    15.00    15.00    15.00    14.70
    6.5   9.8    20.42    21.90    25.05    25.05    25.05    21.23
   10.0  10.0    24.92    25.05    25.05    25.05    25.05    24.98
```

## 3. The control surface

`compute_batch` runs a whole grid in one call. The loop over rows happens in Rust:

```python
import numpy as np

n = 41
S, F = np.meshgrid(np.linspace(0, 10, n), np.linspace(0, 10, n))
out = system.compute_batch({"service": S.ravel(), "food": F.ravel()})
Z = np.asarray(out["tip"]).reshape(S.shape)
print(f"tip ranges from {Z.min():.2f} to {Z.max():.2f} over {Z.size} grid points")
```

```text
tip ranges from 5.08 to 24.92 over 1681 grid points
```

### Plotting (optional, needs matplotlib)

```python
import matplotlib.pyplot as plt
from ferrifuzz.plot import plot_variable, plot_surface

fig, axes = plt.subplots(3, 1, figsize=(7, 8))
for ax, var in zip(axes, [service, food, tip]):
    plot_variable(var, ax=ax)
fig.tight_layout()
fig.savefig("tipper_terms.png")

plot_surface(system, "service", "food", "tip")
plt.savefig("tipper_surface.png")
```

See [`ferrifuzz.plot`](../python-api/plot.md) for all the plotting helpers.

## What to notice

- **Centroid never reaches the edges.** With these output sets, centroid stays inside about
  5–25, even at service = 0 or 10. The centre of gravity of a triangle sitting on 0–10 is 5,
  not 0. If you want outputs closer to the limits, use shoulder sets for `low` and `high`.
- **`som` and `lom` can jump.** At (2, 8), `low` and `high` fire at the same peak strength, so
  "smallest of maxima" picks 2.55 and "largest of maxima" picks 27.45. Mean-of-maxima methods
  are discontinuous. That's a problem for control, but they work for classification-like
  decisions.
- **The numbers sit on a grid.** Values like 4.95 and 25.05 are grid points. The numeric
  defuzzifiers sample the output universe at `resolution` steps (default 200, so 0.15 tip-%
  here). See [Defuzzification](../concepts/defuzzification.md).

**Exercises.**
1. Remove the `very excellent` rule. Which cells of the defuzzifier table change?
2. Switch to `and_method="product"` and `implication="larsen"`, and compare the surface range.
3. Put `food` first in the rules. Does `validate()` care? Does the output change?

The course's Rust project set includes the same model as `p1_tipper`. For the equivalent calls,
see the [Rust system API](../rust-api/system.md).
