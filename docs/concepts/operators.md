---
title: Fuzzy operators
sidebar_label: Fuzzy operators
description: The six t-norms (AND), six t-conorms (OR) and three complements (NOT) in ferrifuzz, with formulas, names and how inference uses them.
---

# Fuzzy operators: AND, OR, NOT

Boolean AND, OR and NOT only work on 0 and 1. Fuzzy logic needs versions that work on any
degree in $[0, 1]$. There is no single correct choice. There is a whole family of operators
that behave sensibly, and each family member has its own character.

## T-norms (fuzzy AND)

A **t-norm** $T : [0,1]^2 \to [0,1]$ is any operator that is

- **commutative**: $T(a, b) = T(b, a)$
- **associative**: $T(a, T(b, c)) = T(T(a, b), c)$
- **monotone**: if $a \le a'$ then $T(a, b) \le T(a', b)$
- has **identity 1**: $T(a, 1) = a$

Every t-norm agrees with Boolean AND on $\{0, 1\}$, and every t-norm satisfies
$T(a, b) \le \min(a, b)$. Minimum is the *largest* possible t-norm, and drastic product is
the *smallest*.

| Name (`kind=`) | Aliases | Formula $T(a, b)$ |
|---|---|---|
| `"min"` *(default)* | `godel`, `zadeh`, `standard` | $\min(a, b)$ |
| `"product"` | `prod`, `algebraic` | $a\,b$ |
| `"lukasiewicz"` | `luk`, `bounded` | $\max(0,\ a + b - 1)$ |
| `"drastic"` | | $b$ if $a = 1$; $a$ if $b = 1$; else $0$ |
| `"einstein"` | | $\dfrac{a\,b}{2 - (a + b - a\,b)}$ |
| `"hamacher"` | | $\dfrac{a\,b}{a + b - a\,b}$ (0 when $a = b = 0$) |

## T-conorms (fuzzy OR)

A **t-conorm** $S$ has the same first three properties, but its identity is **0**:
$S(a, 0) = a$. Every t-conorm satisfies $S(a, b) \ge \max(a, b)$. Each t-norm has a *dual*
t-conorm $S(a, b) = 1 - T(1 - a, 1 - b)$, and the table lists them in dual pairs.

| Name (`kind=`) | Aliases | Formula $S(a, b)$ |
|---|---|---|
| `"max"` *(default)* | `godel`, `zadeh`, `standard` | $\max(a, b)$ |
| `"probor"` | `prob`, `probabilistic`, `algebraic` | $a + b - a\,b$ |
| `"lukasiewicz"` | `luk`, `bounded` | $\min(1,\ a + b)$ |
| `"drastic"` | | $b$ if $a = 0$; $a$ if $b = 0$; else $1$ |
| `"einstein"` | | $\dfrac{a + b}{1 + a\,b}$ |
| `"hamacher"` | | $\dfrac{a + b - 2a\,b}{1 - a\,b}$ (1 when $a = b = 1$) |

Names are case-insensitive.

## Complements (fuzzy NOT)

| Name (`kind=`) | Parameter (`param=`) | Formula $c(\mu)$ |
|---|---|---|
| `"standard"` *(default)* | none | $1 - \mu$ |
| `"sugeno"` | $\lambda > -1$ | $\dfrac{1 - \mu}{1 + \lambda\mu}$ |
| `"yager"` | $w > 0$ | $(1 - \mu^{w})^{1/w}$ |

$\lambda = 0$ and $w = 1$ both reduce to the standard complement.

A parameter outside its range, or an unknown `kind` name, raises `ff.FuzzyError` (a `ValueError`). Rule strings (`IS NOT`) always use the standard complement.

## The same inputs, every operator

For $a = 0.7$ and $b = 0.4$:

```python
import ferrifuzz as ff

a, b = 0.7, 0.4
for kind in ["min", "product", "lukasiewicz", "drastic", "einstein", "hamacher"]:
    print(f"T {kind:12s}", round(ff.Operator.t_norm(a, b, kind=kind), 4))
for kind in ["max", "probor", "lukasiewicz", "drastic", "einstein", "hamacher"]:
    print(f"S {kind:12s}", round(ff.Operator.t_conorm(a, b, kind=kind), 4))

ff.Operator.complement(0.7)                 # 0.3
ff.Operator.complement(0.7, "sugeno", 2.0)  # 0.125
ff.Operator.complement(0.7, "yager", 2.0)   # 0.714...
```

| Operator | T-norm (AND) | T-conorm (OR) |
|---|---|---|
| min / max | 0.4 | 0.7 |
| product / probor | 0.28 | 0.82 |
| Łukasiewicz | 0.1 | 1.0 |
| drastic | 0.0 | 1.0 |
| Einstein | 0.2373 | 0.8594 |
| Hamacher | 0.3415 | 0.75 |

Some intuition:

- **min / max** are *non-interactive*. The result depends only on the weaker (or
  stronger) argument. They are idempotent ($\min(a,a)=a$), and they are the classic Mamdani
  choice.
- **product / probor** let *both* arguments matter. Two half-true conditions give
  $0.25$, not $0.5$. The output surface is smoother, and gradients are non-zero in both
  arguments.
- **Łukasiewicz** and **drastic** are strict: two weak conditions can give exactly 0.
- **Einstein** and **Hamacher** sit between product and min.

## Operators on intervals

For [interval type-2](./interval-type-2.md) sets, a degree is an interval
$[\underline{\mu}, \overline{\mu}]$. T-norms and t-conorms are monotone, so they apply
**bound by bound**. The complement swaps the bounds so that lower ≤ upper still holds:

$$
T([\underline a, \overline a], [\underline b, \overline b]) = [T(\underline a, \underline b),\ T(\overline a, \overline b)]
\qquad
c([\underline\mu, \overline\mu]) = [c(\overline\mu),\ c(\underline\mu)]
$$

```python
ff.Operator.t_norm((0.6, 0.8), (0.5, 0.9), kind="product")   # (0.3, 0.72)
ff.Operator.complement((0.2, 0.6))                           # (0.4, 0.8)
```

## How inference uses them

The antecedent of a rule is kept in **disjunctive normal form**, an OR of AND-groups:

```
IF a IS x AND b IS y OR c IS z THEN ...   →   (a IS x ∧ b IS y) ∨ (c IS z)
```

The **firing strength** is

$$
w = S\big(\, T(\mu_x(a), \mu_y(b)),\ \mu_z(c) \,\big)
$$

with $T$ = the system's `and_method` and $S$ = its `or_method`:

```python
system = ff.FuzzySystem(and_method="product", or_method="probor")
```

`and_method` accepts all six t-norm names and `or_method` all six t-conorm names.
How the firing strength then shapes the output (implication and aggregation) is covered in
[Inference](./inference.md).

## In ferrifuzz

- Python: [`Operator` and `Hedge`](../python-api/operators-hedges.md)
- Rust: [`TNorm`, `TConorm`, `Complement`](../rust-api/operators-hedges.md)
