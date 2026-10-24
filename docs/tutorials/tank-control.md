---
title: 'Tutorial: Closed-Loop Fuzzy Tank Level Control'
sidebar_label: 'Tank level controller'
description: 'Close the loop around a nonlinear water tank with a 5x5 fuzzy incremental PD controller in Python and compare it with a PI controller.'
keywords: ['fuzzy controller', 'fuzzy PD controller', 'fuzzy control python', 'tank level control']
---

# Closed-loop control: water tank level

**Goal.** Raise the water level of a tank from 1 m to 2 m by adjusting the inflow valve. This
tutorial covers:

- a **fuzzy incremental PD** controller: error and change of error give a change of inflow,
  driven by a 5 × 5 rule table,
- simulating the loop step by step and comparing it with a classic PI controller.

You need `ferrifuzz` and `numpy`.

## The plant

$$
A\,\frac{dh}{dt} = q_\text{in} - k\sqrt{h}
$$

$h$ is the level and $q_\text{in}$ the inflow (0 to 2 m³/s). The outflow grows with $\sqrt{h}$,
so the plant is nonlinear. We integrate with Euler steps of 0.1 s.

## The controller

Both inputs, `error` = setpoint − level and `d_error` = its rate of change, use five terms
from **N**egative **B**ig to **P**ositive **B**ig. The output `dq` is added to the valve
opening every step, which gives the controller integral action. The rule table is the classic
MacVicar-Whelan pattern: the output label index is `clamp(i + j - 2, 0, 4)`.

| error \ d_error | NB | NS | ZE | PS | PB |
|---|---|---|---|---|---|
| **NB** | NB | NB | NB | NS | ZE |
| **NS** | NB | NB | NS | ZE | PS |
| **ZE** | NB | NS | ZE | PS | PB |
| **PS** | NS | ZE | PS | PB | PB |
| **PB** | ZE | PS | PB | PB | PB |

## The script

```python
import numpy as np
import ferrifuzz as ff

# ---- plant: A dh/dt = q_in - k*sqrt(h)
A, K, Q_MAX = 2.0, 0.6, 2.0      # area [m^2], outflow coeff, max inflow [m^3/s]
DT, T_END = 0.1, 150.0           # step and horizon [s]
H0, SP = 1.0, 2.0                # start level and setpoint [m]
Q0 = K * np.sqrt(H0)             # inflow that holds the start level


def plant_step(h, q):
    return max(h + DT * (q - K * np.sqrt(max(h, 0.0))) / A, 0.0)


# ---- controller: error, change of error -> change of inflow
LABELS = ["NB", "NS", "ZE", "PS", "PB"]


def five_terms(var):
    var["NB"] = ff.mf.trapezoid(-1, -1, -0.67, -0.33)
    var["NS"] = ff.mf.triangle(-0.67, -0.33, 0)
    var["ZE"] = ff.mf.triangle(-0.33, 0, 0.33)
    var["PS"] = ff.mf.triangle(0, 0.33, 0.67)
    var["PB"] = ff.mf.trapezoid(0.33, 0.67, 1, 1)
    return var


dq = ff.Variable("dq", -1, 1)
for lab, (a, b, c) in zip(LABELS, [(-1, -1, -0.5), (-1, -0.5, 0), (-0.5, 0, 0.5),
                                   (0, 0.5, 1), (0.5, 1, 1)]):
    dq[lab] = ff.mf.triangle(a, b, c)

fz = ff.FuzzySystem()
fz.add_input(five_terms(ff.Variable("error", -1, 1)))
fz.add_input(five_terms(ff.Variable("d_error", -1, 1)))
fz.add_output(dq)

# MacVicar-Whelan table: output label index = clamp(i + j - 2, 0, 4)
for i, le in enumerate(LABELS):
    for j, ld in enumerate(LABELS):
        lo = LABELS[min(max(i + j - 2, 0), 4)]
        fz += ff.Rule.from_string(f"IF error IS {le} AND d_error IS {ld} THEN dq IS {lo}")
assert fz.validate() == []

GU = 0.3   # output gain: q += GU * dq


def sim_fuzzy():
    h, q, e_prev = H0, Q0, SP - H0
    hs = []
    for _ in range(int(T_END / DT)):
        e = SP - h
        de = (e - e_prev) / DT
        e_prev = e
        # de can leave [-1, 1]; inputs are clamped to the universe by default
        q = float(np.clip(q + GU * fz({"error": e, "d_error": de})["dq"], 0.0, Q_MAX))
        h = plant_step(h, q)
        hs.append(h)
    return np.array(hs)


def sim_pi(kp=1.5, ki=0.15):
    h, integ = H0, 0.0
    hs = []
    for _ in range(int(T_END / DT)):
        e = SP - h
        q_unsat = Q0 + kp * e + ki * (integ + e * DT)
        q = float(np.clip(q_unsat, 0.0, Q_MAX))
        if q == q_unsat:              # anti-windup: integrate only when not saturated
            integ += e * DT
        h = plant_step(h, q)
        hs.append(h)
    return np.array(hs)


def step_metrics(hs):
    t = np.arange(1, len(hs) + 1) * DT
    span = SP - H0
    rise = t[np.argmax(hs >= H0 + 0.9 * span)] - t[np.argmax(hs >= H0 + 0.1 * span)]
    overshoot = max(0.0, (hs.max() - SP) / span * 100)
    outside = np.abs(hs - SP) > 0.02 * span
    settle = t[np.where(outside)[0][-1]] if outside.any() else 0.0
    return rise, overshoot, settle


print(f"{'controller':<10}{'rise 10-90 [s]':>16}{'overshoot [%]':>15}{'settle 2% [s]':>15}")
for name, hs in [("fuzzy", sim_fuzzy()), ("PI", sim_pi())]:
    r, o, s = step_metrics(hs)
    print(f"{name:<10}{r:>16.2f}{o:>15.2f}{s:>15.2f}")
```

```text
controller  rise 10-90 [s]  overshoot [%]  settle 2% [s]
fuzzy                 1.70           1.55           2.60
PI                    3.40           0.00          11.50
```

The fuzzy controller rises twice as fast and settles within 2 % in under 3 s. The cost is
1.5 % overshoot.

## What to notice

- **Out-of-range inputs.** Controller signals often leave the universe you designed for, for
  example when you raise the gains or the sensor is noisy. `FuzzySystem` clamps inputs into
  `[min_value, max_value]` by default, so the outermost terms (`NB`/`PB`) stay saturated
  instead of nothing firing. Pass `clamp_inputs=False` to evaluate the MFs at the raw
  value instead; an input far outside the universe may then fire no rule and give `nan`.
- **Scaling gains are the tuning knobs.** The rule table stays fixed while you scale
  `e`, `de` and `dq`. Try `GU = 0.6`: the overshoot disappears (0 %), but settling slows to
  3.4 s.
- **Tabulate the surface before you simulate.** Run
  `fz.compute_batch({"error": E.ravel(), "d_error": D.ravel()})` on a 9 × 9 grid. The surface
  should be odd-symmetric, `dq(-e, -de) = -dq(e, de)`. If it isn't, there's a typo in your
  rule table.

**Exercises.**
1. Replace the triangles with `ff.mf.gaussian` terms. Does the overshoot change?
2. Add sensor noise (`h + rng.normal(0, 0.03)`) and compare the valve activity of both
   controllers. Then continue with [type-1 vs interval type-2](./type1-vs-it2.md).
3. Make the setpoint a step sequence (1 → 2 → 1.5 m) and check that the controller has no
   steady-state error.

The course's Rust projects include a variant of this exercise: a 7 × 7 fuzzy controller that
balances an **inverted pendulum** (cart-pole), `p2_inverted_pendulum`. It's built with the same
calls described in the [Rust system API](../rust-api/system.md).
