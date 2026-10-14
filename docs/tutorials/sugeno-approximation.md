---
title: 'Tutorial: Sugeno Function Approximation'
sidebar_label: 'Sugeno approximation'
description: 'Fit a first-order Sugeno (TSK) model to y = sin(x) + 0.1x by least squares on the normalized rule firing strengths (the ANFIS LSE step).'
---

# Sugeno function approximation with least squares

**Goal.** Approximate $y = \sin(x) + 0.1\,x$ on $[0, 2\pi]$ with a first-order Sugeno (TSK)
model. The premise membership functions are fixed. The linear consequents are learned by
**least squares**, which is the forward-pass step of ANFIS hybrid learning.

You need `ferrifuzz` and `numpy`.

## The model

There are $N$ Gaussian terms $A_i$ on $x$ and one rule per term:

$$
R_i:\ \text{IF } x \text{ IS } A_i \text{ THEN } y = p_i\,x + r_i
$$

The Sugeno output is the firing-strength-weighted average of the rule outputs. With
normalized strengths $\bar w_i(x) = w_i(x) / \sum_j w_j(x)$:

$$
\hat y(x) = \sum_i \bar w_i(x)\,(p_i\,x + r_i)
$$

This is **linear in the unknowns** $\theta = [p_1 \dots p_N,\ r_1 \dots r_N]$. Stack one row
$[\bar w_1 x, \dots, \bar w_N x,\ \bar w_1, \dots, \bar w_N]$ per training point into a matrix
$\Phi$ and solve $\Phi\,\theta \approx y$ with `numpy.linalg.lstsq`.

## The script

```python
import numpy as np
import ferrifuzz as ff

LO, HI = 0.0, 2 * np.pi


def f(x):
    return np.sin(x) + 0.1 * x


X_TRAIN = np.linspace(LO, HI, 200)
X_TEST = np.linspace(LO, HI, 1000)


def build(n):
    """n Gaussian terms on x, one rule per term, each with its own linear consequent."""
    centers = np.linspace(LO, HI, n)
    sigma = (HI - LO) / (n - 1) / 1.5
    x = ff.Variable("x", LO, HI)
    for i, c in enumerate(centers):
        x[f"A{i}"] = ff.mf.gaussian(float(c), float(sigma))
    s = ff.FuzzySystem(defuzz_method="sugeno")
    s.add_input(x)
    s.add_output(ff.Variable("y", -2.0, 2.0))
    for i in range(n):
        s.add_consequent("y", f"r{i}", {"x": 0.0}, bias=0.0)   # placeholder, refitted below
        s += ff.Rule.from_string(f"IF x IS A{i} THEN y IS r{i}")
    return s


def normalized_strengths(s, xs):
    W = np.array([s.rule_strengths({"x": float(x)}) for x in xs])   # shape (len(xs), n_rules)
    return W / W.sum(axis=1, keepdims=True)


print(f"{'N':>3}{'RMSE':>10}{'max |err|':>11}")
for n in (3, 5, 9):
    s = build(n)
    Wn = normalized_strengths(s, X_TRAIN)
    # y = sum_i wn_i * (p_i * x + r_i)  ->  linear in theta = [p_1..p_n, r_1..r_n]
    Phi = np.hstack([Wn * X_TRAIN[:, None], Wn])
    theta, *_ = np.linalg.lstsq(Phi, f(X_TRAIN), rcond=None)
    p, r = theta[:n], theta[n:]
    for i in range(n):
        s.add_consequent("y", f"r{i}", {"x": float(p[i])}, bias=float(r[i]))

    y_hat = np.asarray(s.compute_batch({"x": X_TEST})["y"])
    err = y_hat - f(X_TEST)
    print(f"{n:>3}{np.sqrt(np.mean(err ** 2)):>10.5f}{np.abs(err).max():>11.4f}")
```

```text
  N      RMSE  max |err|
  3   0.00289     0.0099
  5   0.00015     0.0007
  9   0.00011     0.0002
```

Three rules already give an RMSE of about 3 × 10⁻³ on 1000 test points.

:::tip Firing strengths by hand
The consequent of rule $i$ is the made-up term `r{i}`. It only needs to exist so each rule can
have its own linear consequent, and `add_consequent` replaces it in place after the fit. For a
**one-input** system like this one, the firing strength of rule $i$ is just the membership of
$x$ in $A_i$. So you can also build the matrix from the variable:
`[x_var.fuzzify(v)[f"A{i}"] for i in range(n)]`. Use `rule_strengths` as soon as rules have
several conditions, `NOT` or hedges.
:::

## What to notice

- **No gradient descent.** With fixed premises, fitting the consequents is a single linear
  solve, which takes about a millisecond here. Full ANFIS alternates this step with gradient
  updates of the centres and widths.
- **Diminishing returns.** Going from 5 to 9 rules barely helps. The leftover error comes from
  the smooth blending between the local lines, not from too few rules.
- **Sugeno is exact and fast.** The output is a closed-form weighted average with no sampling
  grid, so `compute_batch` agrees with the formula above to machine precision. Compare
  [Mamdani vs Sugeno](../concepts/inference.md).

**Exercises.**
1. Change `sigma` by ×0.5 and ×2. Plot the RMSE against the overlap.
2. Fit $y = x^2$ on $[-1, 1]$ with zero-order consequents (`coeffs={}`, bias only). How many
   rules do you need to match the 3-rule first-order fit?
3. Add 5 % Gaussian noise to the training targets and compare the RMSE on clean test data for
   N = 3 and N = 9. Which one overfits?

The course's Rust projects compare Mamdani, zero-order and first-order Sugeno on the same kind
of problem in `p3_sugeno_vs_mamdani`.
