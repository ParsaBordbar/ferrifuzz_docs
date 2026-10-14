---
title: 'Operator & Hedge (Python)'
sidebar_label: 'Operators & hedges'
description: 'ff.Operator t-norms, t-conorms and complements, and ff.Hedge power modifiers, on type-1 and interval type-2 degrees.'
---

# `Operator` and `Hedge`

These expose the building blocks the inference engine uses internally, so you can compute
degrees by hand, check homework, or write custom inference. For the formulas and
properties, see [Fuzzy operators](../concepts/operators.md).

Every function accepts either a **type‑1 degree** (`float`) or an **interval type‑2 degree**
(`(lower, upper)` tuple) and returns the same kind. Mixing a float and a tuple in one call
raises `TypeError`.

## `Operator.t_norm`: fuzzy AND

```python
import ferrifuzz as ff
```

<!-- skip-check -->
```python
ff.Operator.t_norm(mu1, mu2, kind="min")
```

| `kind` (aliases) | Formula | `t_norm(0.7, 0.4, kind)` |
|---|---|---|
| `"min"` (`godel`, `zadeh`, `standard`) | $\min(a, b)$ | 0.4 |
| `"product"` (`prod`, `algebraic`) | $ab$ | 0.28 |
| `"lukasiewicz"` (`luk`, `bounded`) | $\max(0,\ a + b - 1)$ | 0.1 |
| `"drastic"` | $b$ if $a = 1$; $a$ if $b = 1$; else $0$ | 0.0 |
| `"einstein"` | $\dfrac{ab}{2 - (a + b - ab)}$ | 0.2373 |
| `"hamacher"` | $\dfrac{ab}{a + b - ab}$ (0 when $a = b = 0$) | 0.3415 |

## `Operator.t_conorm`: fuzzy OR

<!-- skip-check -->
```python
ff.Operator.t_conorm(mu1, mu2, kind="max")
```

| `kind` (aliases) | Formula | `t_conorm(0.7, 0.4, kind)` |
|---|---|---|
| `"max"` (`godel`, `zadeh`, `standard`) | $\max(a, b)$ | 0.7 |
| `"probor"` (`prob`, `probabilistic`, `algebraic`) | $a + b - ab$ | 0.82 |
| `"lukasiewicz"` (`luk`, `bounded`) | $\min(1,\ a + b)$ | 1.0 |
| `"drastic"` | $b$ if $a = 0$; $a$ if $b = 0$; else $1$ | 1.0 |
| `"einstein"` | $\dfrac{a + b}{1 + ab}$ | 0.8594 |
| `"hamacher"` | $\dfrac{a + b - 2ab}{1 - ab}$ (1 when $ab = 1$) | 0.75 |

## `Operator.complement`: fuzzy NOT

<!-- skip-check -->
```python
ff.Operator.complement(mu, kind="standard", param=1.0)
```

| `kind` | Formula | Parameter |
|---|---|---|
| `"standard"` (`zadeh`) | $1 - \mu$ | ignored |
| `"sugeno"` | $\dfrac{1 - \mu}{1 + \lambda\mu}$ | `param` = λ, must be > −1 (λ = 0 gives the standard complement) |
| `"yager"` | $(1 - \mu^{w})^{1/w}$ | `param` = w, must be > 0 (w = 1 gives the standard complement) |

```python
ff.Operator.complement(0.7)                    # 0.3
ff.Operator.complement(0.7, "sugeno", 2.0)     # 0.125
ff.Operator.complement(0.7, "yager", 2.0)      # 0.7141...
```

An unknown `kind`, or a parameter outside its range, raises `ff.FuzzyError` (a
`ValueError`):

```text
ferrifuzz.FuzzyError: unknown t-norm 'prdouct' (did you mean 'product'?); valid options: 'min', 'product', 'lukasiewicz', 'drastic', 'einstein', 'hamacher'
ferrifuzz.FuzzyError: Yager complement needs w > 0
```

## Interval type‑2 degrees

T‑norms and t‑conorms apply bound by bound. The complement swaps the bounds so the result
stays ordered (`lower ≤ upper`):

```python
ff.Operator.t_norm((0.6, 0.8), (0.5, 0.9))      # (0.5, 0.8)
ff.Operator.t_conorm((0.6, 0.8), (0.5, 0.9))    # (0.6, 0.9)
ff.Operator.complement((0.6, 0.8))              # (0.2, 0.4)
```

## `Hedge`

A power hedge $\mu \mapsto \mu^{p}$. $p > 1$ concentrates ("very"), $p < 1$ dilates
("somewhat"). Hedges are callable.

<!-- skip-check -->
```python
ff.Hedge(power: float)
```

| Constructor | Power | Rule word(s) |
|---|---|---|
| `ff.Hedge.very()` | 2 | `very` |
| `ff.Hedge.extremely()` | 3 | `extremely` |
| `ff.Hedge.plus()` | 1.25 | `plus` |
| `ff.Hedge.minus()` | 0.75 | `minus` |
| `ff.Hedge.somewhat()` | 0.5 | `somewhat`, `more_or_less` |
| `ff.Hedge.slightly()` | 0.5 | `slightly` |
| `ff.Hedge(p)` | any `p > 0` | (custom) |

```python
very = ff.Hedge.very()
print(very(0.8))             # 0.64
print(very((0.6, 0.9)))      # (0.36, 0.81)  -- IT2: both bounds
print(very.power, very)      # 2.0 Hedge(power=2)
ff.Hedge.somewhat()(0.64)    # 0.8
```

In a rule string you don't need `Hedge` at all: write the word, e.g.
`IF temp IS very hot THEN ...`. See [Rule syntax](../rule-syntax.md#hedges).

## How the engine uses them

- Inside an AND‑group of a rule, clause degrees are combined with
  `FuzzySystem(and_method=...)`; OR‑groups are combined with `or_method`.
- `NOT` in a rule uses the **standard** complement $1 - \mu$.
- Hedges in rules use the powers above.

```python
temp_hot, hum_high = 0.7, 0.4
strength = ff.Operator.t_norm(temp_hot, hum_high, "product")   # 0.28, what and_method="product" computes
```
