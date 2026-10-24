---
title: 'Plotting (Python)'
sidebar_label: 'Plotting'
description: 'Python API for ferrifuzz.plot: matplotlib helpers to draw linguistic variables, output sets, response curves and 3-D control surfaces.'
keywords: ['plot membership functions', 'matplotlib', 'control surface']
---

# `ferrifuzz.plot`

Quick matplotlib figures for coursework and reports. matplotlib and numpy are
**optional**: install them with `pip install numpy matplotlib` (after the PyPI release, `pip install "ferrifuzz[plot]"` also works).
The module is only imported when you first use it, and without matplotlib a call raises
an `ImportError` that says what to install.

```python
import matplotlib.pyplot as plt
import ferrifuzz as ff
import ferrifuzz.plot as fp         # or use ff.plot.plot_variable(...) directly
```

Every function draws on `ax` (a new figure when `ax` is omitted) and **returns the axes**,
so you can add titles and labels and save the figure as usual. Functions that need a
value for inputs you are not plotting take `fixed=` (a dict); inputs not listed there sit
at the middle of their range.

| Function | Draws |
|---|---|
| `plot_variable(var, ax=None, n=400, legend=True)` | every term of a variable |
| `plot_output(system, inputs, output, ax=None)` | how one output is formed for one input row |
| `plot_response(system, input, output, fixed=None, n=200, ax=None)` | output vs one input |
| `plot_surface(system, x, y, output, fixed=None, n=40, ax=None, cmap="viridis")` | 3‑D control surface over two inputs |

## `plot_variable`

All terms of a `Variable` over `[min_value, max_value]` (sampled at `n` points), with a
legend. Interval type‑2 terms are drawn as a shaded band between the lower and upper MFs
(the footprint of uncertainty).

<details>
<summary>Setup used by the examples on this page: the two‑input tipper</summary>

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

```python
ax = fp.plot_variable(service)
ax.set_title("service")
plt.savefig("service.png", dpi=150)
```

## `plot_output`

The output variable's terms (faint), the crisp result as a dashed vertical line, and:

- **Mamdani**: the aggregated output set (filled), i.e. what [`system.output_set`](./fuzzy-system.md) returns;
- **interval type‑2**: the aggregated footprint of uncertainty and the type‑reduced
  interval $[y_l, y_r]$;
- **Sugeno**: just the terms and the crisp value.

The quickest way to *see* why a defuzzifier returned what it did.

```python
fp.plot_output(system, {"service": 7.5, "food": 9.0}, "tip")
```

## `plot_response`

A 1‑D response curve: `output` as `input` sweeps its universe in `n` steps (computed with
`compute_batch`).

```python
fp.plot_response(system, "service", "tip", fixed={"food": 5.0})
```

## `plot_surface`

A 3‑D control surface of `output` over an `n × n` grid of inputs `x` and `y`, computed
with `compute_batch`. Pass a 3‑D axes as `ax` (`fig.add_subplot(projection="3d")`) to
place it in your own figure.

```python
fp.plot_surface(system, "service", "food", "tip")
plt.show()
```

Unknown input or output names raise `ff.InputError`.

## Without the helpers

Everything here can be done with plain matplotlib and the core API, which is useful if
you want full control over styling:

```python
import numpy as np

xs = np.linspace(service.min_value, service.max_value, 300)
for term in service:
    plt.plot(xs, service[term].membership(xs), label=term)
plt.legend()
plt.show()
```
