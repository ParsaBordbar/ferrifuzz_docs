---
title: 'Tutorial: Type-1 vs Interval Type-2 Under Noise'
sidebar_label: 'Type-1 vs interval type-2'
description: 'Build the same 5x5 controller with type-1 and interval type-2 Gaussian terms, then compare gain and output spread under input noise for KM, center-of-sets and height type reduction.'
---

# Type-1 vs interval type-2 under noise

**Goal.** People often claim that interval type-2 (IT2) fuzzy systems "handle noise better".
In this tutorial you test that claim yourself:

- build the same 5 × 5 rule base (from the [tank tutorial](./tank-control.md)) with type-1 and
  with IT2 Gaussian terms,
- compare the three IT2 type-reduction methods: Karnik–Mendel (`km`), center-of-sets (`cos`)
  and `height`,
- measure how much the output wobbles when the inputs are noisy.

You need `ferrifuzz` and `numpy`. For background, read
[Interval type-2](../concepts/interval-type-2.md).

## 1. Two versions of one controller

The IT2 terms model an **uncertain spread**. Each term's σ is only known to lie somewhere
between 0.65σ and 1.35σ. The upper membership function uses the wide Gaussian and the lower
one the narrow Gaussian.

```python
import numpy as np
import ferrifuzz as ff

LABELS = ["NB", "NS", "ZE", "PS", "PB"]
CENTERS = [-1.0, -0.5, 0.0, 0.5, 1.0]
SIGMA = 0.22   # type-1 spread
FOU = 0.35     # IT2: sigma is only known to within +/- 35 %


def make_var(name, it2):
    v = ff.Variable(name, -1, 1)
    for lab, c in zip(LABELS, CENTERS):
        if it2:
            v[lab] = ff.mf.it2(ff.mf.gaussian(c, SIGMA * (1 + FOU)),   # upper (wider)
                               ff.mf.gaussian(c, SIGMA * (1 - FOU)))   # lower (narrower)
        else:
            v[lab] = ff.mf.gaussian(c, SIGMA)
    return v


def build(it2, type_reduction="km"):
    s = ff.FuzzySystem(type="it2" if it2 else "t1", type_reduction=type_reduction)
    s.add_input(make_var("error", it2))
    s.add_input(make_var("d_error", it2))
    s.add_output(make_var("dq", it2))
    for i, le in enumerate(LABELS):
        for j, ld in enumerate(LABELS):
            lo = LABELS[min(max(i + j - 2, 0), 4)]
            s += ff.Rule.from_string(f"IF error IS {le} AND d_error IS {ld} THEN dq IS {lo}")
    return s


SYSTEMS = {
    "T1": build(False),
    "IT2-KM": build(True, "km"),
    "IT2-COS": build(True, "cos"),
    "IT2-height": build(True, "height"),
}
for name, s in SYSTEMS.items():
    slope = (s({"error": 0.1, "d_error": 0.0})["dq"] - s({"error": -0.1, "d_error": 0.0})["dq"]) / 0.2
    print(f"{name:<11} gain near the origin: {slope:.3f}")
```

```text
T1          gain near the origin: 0.610
IT2-KM      gain near the origin: 0.370
IT2-COS     gain near the origin: 0.533
IT2-height  gain near the origin: 0.560
```

:::note IT2 systems use `type_reduction`, not `defuzz_method`
An IT2 system turns its output into a number with **type reduction** followed by the midpoint
of the interval. Choose the method with `type_reduction="km" | "cos" | "height"` and leave
`defuzz_method` at its default (anything else raises `ff.ModelError`).
`type="it2"` forces the IT2 engine. The default `type="auto"` selects it as soon as any
variable has an IT2 term.
:::

## 2. Output spread under input noise

Take 400 random operating points. Add Gaussian noise to both inputs 50 times per point, and
measure the standard deviation of the output around each point:

```python
rng = np.random.default_rng(0)
base = rng.uniform(-0.8, 0.8, size=(400, 2))     # 400 operating points
REPS = 50                                        # noise draws per point

print(f"{'noise':>6}" + "".join(f"{n:>12}" for n in SYSTEMS))
for std in (0.05, 0.1, 0.2, 0.3):
    noisy = np.repeat(base, REPS, axis=0) + rng.normal(0, std, size=(400 * REPS, 2))
    row = f"{std:>6.2f}"
    for name, s in SYSTEMS.items():
        out = s.compute_batch({"error": noisy[:, 0], "d_error": noisy[:, 1]})["dq"]
        spread = np.asarray(out).reshape(400, REPS).std(axis=1).mean()
        row += f"{spread:>12.4f}"
    print(row)
```

```text
 noise          T1      IT2-KM     IT2-COS  IT2-height
  0.05      0.0428      0.0404      0.0573      0.0593
  0.10      0.0849      0.0797      0.1130      0.1168
  0.20      0.1652      0.1522      0.2147      0.2215
  0.30      0.2383      0.2189      0.3083      0.3176
```

IT2-KM has the smallest spread at every noise level. But compare it with section 1: KM also
has the **lowest gain** (0.37 against 0.61). If you divide the spread by the gain, the
advantage disappears. Most of KM's "noise robustness" here comes from a flatter control
surface near the origin, not from filtering. Center-of-sets and height reduction are much
cheaper to compute because they use no sampling grid, but they amplify the noise.

## 3. Look at the type-reduced interval

The crisp IT2 output is the midpoint of the type-reduced interval $[y_l, y_r]$.
`compute_interval` returns the interval itself:

```python
km = SYSTEMS["IT2-KM"]
for e in (0.0, 0.3, 0.6):
    y_l, y_r = km.compute_interval({"error": e, "d_error": 0.0})["dq"]
    y = km({"error": e, "d_error": 0.0})["dq"]
    print(f"error={e:.1f}: interval [{y_l:+.3f}, {y_r:+.3f}]  crisp {y:+.3f}")
```

```text
error=0.0: interval [-0.219, +0.219]  crisp -0.000
error=0.3: interval [-0.077, +0.533]  crisp +0.228
error=0.6: interval [+0.153, +0.601]  crisp +0.377
```

The crisp value is always $(y_l + y_r)/2$. The width $y_r - y_l$ is a built-in measure of how
uncertain the output is at that operating point. Plot it over the input plane and you'll see
it's widest where neighbouring terms overlap.

## What to notice

- **Compare like with like.** A different gain or surface shape can masquerade as noise
  rejection. Match the gains, or normalize by them, before you claim one system is more
  robust.
- **The FOU width is a design parameter.** If `FOU = 0`, upper equals lower and every IT2 system
  reduces to the type-1 system. Sweep `FOU` from 0 to 0.5 and watch the gain shrink.
- **Cost.** KM samples the output universe (`resolution` points) and iterates. `cos` and
  `height` work directly on the consequent centres. With `compute_batch`, all of them handle
  thousands of rows per second.

**Exercises.**
1. Retune `GU` in the [tank tutorial](./tank-control.md) so that T1 and IT2-KM have the same
   effective gain. Then repeat the noise experiment in closed loop with sensor noise
   `h + rng.normal(0, 0.03)`.
2. Model uncertain **centres** instead of uncertain spreads: shift the upper and lower
   Gaussians by ±0.05. Which type reduction changes the most?
3. Plot the interval width `y_r - y_l` over a 41 × 41 input grid.

The course's Rust projects repeat this study in `p5_it2_noise`, with all three type reductions.
See the [Rust IT2 API](../rust-api/it2.md).
