---
sidebar_label: 'Membership Function'
sidebar_position: 2
title: 'Membership Function'
---
<!-- ![Docusaurus logo](/img/python/mfImage.png) -->
# Membership Functions
In fuzzy logic, a membership function (MF) defines how strongly a given input belongs to a fuzzy set. Instead of a value being strictly in or out (as in classical logic), fuzzy logic allows partial membership between 0 and 1.

So a membership function is basically a curve that maps an input value to its degree of membership.

Example idea:
:::tip[Example]

If the fuzzy set is “Hot Temperature”, then:

- 20 °C → membership ≈ 0 (not hot)
- 30 °C → membership ≈ 0.5 (somewhat hot)
- 40 °C → membership ≈ 1 (fully hot)
:::

we could represent it Mathematically as well, you could read more about it [here]("") .

## Creating a Membership Function
we can crate a new membership function using the ```.mf``` method, let's create the MF from the example above:
```py
import ferrifuzz as ff

hot = ff.mf.triangle(20.0, 40.0, 40.0)
```
A triangular MF is defined as triangle(a, b, c) _Where:_

- a → left foot (membership = 0)
- b → peak (membership = 1)
- c → right foot (membership = 0)

However, in our example “hot” keeps increasing up to 40°C, so we want a right-shoulder triangle:

- a = 20 → not hot
-  b = 40 → fully hot
- c = 40 → stays hot after peak

and that's what we've got! let's check the membership values:
```py
print("20°C →", hot.membership(20.0))  # ≈ 0.0
print("30°C →", hot.membership(30.0))  # ≈ 0.5
print("40°C →", hot.membership(40.0))  # = 1.0
```


## Membership Functions

| MF Type | Pythonic Syntax | Parameters | Shape / Intuition | Typical Use |
|--------|----------------|------------|-------------------|-------------|
| Triangular | `ff.mf.triangle(a, b, c)` | a: left foot, b: peak, c: right foot | Linear rise → linear fall | Simple terms (warm, medium) |
| Right‑Shoulder Triangle | `ff.mf.triangle(a, b, b)` | a: start, b: full membership | Rises then stays at 1 | Hot, High, Fast |
| Left‑Shoulder Triangle | `ff.mf.triangle(a, a, c)` | a: full membership, c: end | Starts at 1 then falls | Cold, Low, Slow |
| Trapezoidal | `ff.mf.trapezoid(a, b, c, d)` | a: left foot, b: rise end, c: fall start, d: right foot | Flat top between b–c | Stable ranges (Normal) |
| Gaussian | `ff.mf.gaussian(c, sigma)` | c: center, sigma: width | Smooth bell curve | Noisy data, smooth transitions |
| Singleton | `ff.mf.singleton(x)` | x: value | Spike at a single point | Sugeno outputs |

