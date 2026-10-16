---
title: Membership functions
sidebar_label: Membership functions
description: The six type-1 membership function shapes in ferrifuzz, their exact formulas, parameter rules and analytic centers.
---

# Membership functions

A **membership function** (MF) $\mu(x)$ says how strongly a crisp value $x$ belongs to a
fuzzy set. The output is always in $[0, 1]$. The MF's shape encodes what you mean by a
word: a sharp triangle says "warm means close to 25 °C", and a wide plateau says "anything
between 20 and 30 °C is fully normal".

ferrifuzz has six type-1 shapes. Create them with the `ff.mf` factory functions:

| Shape | Factory | Parameters | Constraint |
|---|---|---|---|
| Triangle | `ff.mf.triangle(a, b, c)` | feet `a`, `c`; peak `b` | $a \le b \le c$ |
| Trapezoid | `ff.mf.trapezoid(a, b, c, d)` | feet `a`, `d`; plateau `b`…`c` | $a \le b \le c \le d$ |
| Gaussian | `ff.mf.gaussian(center, sigma)` | peak, spread | $\sigma > 0$ |
| Generalized bell | `ff.mf.bell(center, width, slope)` | peak, half-width, steepness | width $> 0$, slope $> 0$ |
| Sigmoid | `ff.mf.sigmoid(center, slope)` | inflection point, steepness | any slope (sign = direction) |
| Singleton | `ff.mf.singleton(x)` | the one point | none |

If a constraint is violated, the factory raises `ff.FuzzyError`, a `ValueError` subclass
(in Rust, `Error::InvalidParameter`):

```python
import ferrifuzz as ff

ff.mf.triangle(5, 0, 10)
# ferrifuzz.FuzzyError: triangle(5, 0, 10): needs a ≤ b ≤ c (feet a, c; peak b)
```

## Triangle

$$
\mu(x) = \begin{cases}
0 & x < a \ \text{or}\ x > c \\
1 & x = b \\
\dfrac{x - a}{b - a} & a \le x < b \\[4pt]
\dfrac{c - x}{c - b} & b < x \le c
\end{cases}
$$

The simplest and most common shape. It rises linearly from `a` to the peak at `b`, then
falls back to zero at `c`. It is cheap to evaluate, and each parameter has an obvious meaning.

**Shoulders.** If two parameters are equal, one side becomes vertical:

- `triangle(a, a, c)` is a **left shoulder**, fully 1 at `a` and falling to 0 at `c`. Use it
  for the lowest term ("cold", "low", "slow").
- `triangle(a, c, c)` is a **right shoulder**, rising from 0 at `a` to 1 at `c`. Use it for
  the highest term ("hot", "high", "fast").

The peak value is 1.0 even on a shoulder: `ff.mf.triangle(20, 40, 40).membership(40)`
is `1.0`.

## Trapezoid

$$
\mu(x) = \begin{cases}
0 & x < a \ \text{or}\ x > d \\
1 & b \le x \le c \\
\dfrac{x - a}{b - a} & a \le x < b \\[4pt]
\dfrac{d - x}{d - c} & c < x \le d
\end{cases}
$$

Like a triangle with a flat top, the **plateau** $[b, c]$. Use it when a whole range is
"fully" the concept, for example normal body temperature. `trapezoid(a, a, c, d)` and
`trapezoid(a, b, d, d)` are the shoulder versions and are the usual choice for the edge terms
of a variable.

## Gaussian

$$
\mu(x) = \exp\!\left(-\frac{1}{2}\left(\frac{x - c}{\sigma}\right)^2\right)
$$

A smooth bell centred at $c$ with standard deviation $\sigma$. It is never exactly zero, so
every rule fires at least a little. Its derivatives are smooth, which makes it the standard
choice for tuning by gradient descent (ANFIS) and for noisy inputs. At $x = c \pm \sigma$
the membership is $e^{-1/2} \approx 0.607$.

## Generalized bell

$$
\mu(x) = \frac{1}{1 + \left|\dfrac{x - c}{w}\right|^{2s}}
$$

A bell with a tunable flat top. `width` $w$ is the half-width where $\mu = 0.5$ (at
$x = c \pm w$), and `slope` $s$ controls how steep the walls are. Large $s$ gives a nearly
rectangular shape, and small $s$ gives long soft tails. This is the MF used in Jang's
original ANFIS paper.

## Sigmoid

$$
\mu(x) = \frac{1}{1 + e^{-s\,(x - c)}}
$$

An S-curve that is $0.5$ at the inflection point $c$. A positive slope $s$ gives a curve that
rises to the right ("high", "hot"). A negative slope gives a falling curve ("low"). Sigmoids
are open on one side, so they suit threshold concepts ("more than about 50").

## Singleton

$$
\mu(x) = \begin{cases} 1 & x = x_0 \\ 0 & \text{otherwise} \end{cases}
$$

All membership sits on one point. Singletons are mostly used as **output terms of Sugeno
systems**, where each rule concludes a constant (see [Inference](./inference.md)). A
Mamdani system that samples its output on a grid will almost never hit $x_0$ exactly, so do
not use singletons as Mamdani outputs.

## Comparing the shapes

Every shape below is centred at 5. Values were computed with ferrifuzz:

```python
import ferrifuzz as ff

shapes = {
    "triangle(0, 5, 10)":     ff.mf.triangle(0, 5, 10),
    "trapezoid(0, 2, 6, 8)":  ff.mf.trapezoid(0, 2, 6, 8),
    "gaussian(5, 2)":         ff.mf.gaussian(5, 2),
    "bell(5, 2, 3)":          ff.mf.bell(5, 2, 3),
    "sigmoid(5, 1.5)":        ff.mf.sigmoid(5, 1.5),
    "singleton(5)":           ff.mf.singleton(5),
}
for name, mf in shapes.items():
    print(f"{name:24s}", [round(mf.membership(x), 3) for x in (2, 4, 5, 7)])
```

```text
triangle(0, 5, 10)       [0.4, 0.8, 1.0, 0.6]
trapezoid(0, 2, 6, 8)    [1.0, 1.0, 1.0, 0.5]
gaussian(5, 2)           [0.325, 0.882, 1.0, 0.607]
bell(5, 2, 3)            [0.081, 0.985, 1.0, 0.5]
sigmoid(5, 1.5)          [0.011, 0.182, 0.5, 0.953]
singleton(5)             [0.0, 0.0, 1.0, 0.0]
```

## Analytic centers

Every type-1 MF has a `center()`, one representative point computed exactly in O(1). Sugeno
inference uses it as the rule's constant output when no linear consequent is registered:

| Shape | `center()` |
|---|---|
| triangle | `b` (the peak) |
| trapezoid | $(b + c)/2$ (plateau midpoint) |
| gaussian, bell, sigmoid | `center` |
| singleton | `x` |

```python
ff.mf.trapezoid(0, 2, 6, 8).center()   # 4.0
```

## Evaluating many points at once

`membership` also accepts an array. This is handy for plotting:

```python
import numpy as np

xs = np.linspace(0, 10, 101)
mu = ff.mf.gaussian(5, 2).membership(xs)   # NumPy array, same shape as xs
```

## Choosing a shape

- **Start with triangles and trapezoids.** Their parameters are easy to read, and adjacent
  terms can cross at exactly 0.5.
- **Use Gaussians or bells** when you want smooth outputs, when you will tune parameters from
  data, or when inputs are noisy.
- **Use sigmoids** for open-ended threshold concepts.
- **Use singletons** only as Sugeno output terms.
- Make neighbouring terms **overlap**. If some input value has zero membership in every
  term, no rule can fire there. See [Linguistic variables](./linguistic-variables.md).

When the shape itself is uncertain, wrap two type-1 MFs into an interval type-2 set. See
[Interval type-2](./interval-type-2.md).

## In ferrifuzz

- Python: [Membership functions API](../python-api/membership.md)
- Rust: [`mf` module and MF types](../rust-api/membership.md)
