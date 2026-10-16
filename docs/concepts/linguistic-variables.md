---
title: Linguistic variables and hedges
sidebar_label: Linguistic variables & hedges
description: Variables whose values are words, how fuzzification works, how to partition a universe, and how hedges like "very" and NOT modify terms.
---

# Linguistic variables and hedges

## Variables whose values are words

A **linguistic variable** is a quantity described with words instead of numbers. It has:

- a **name**, such as `temperature`;
- a **universe of discourse** $[x_{\min}, x_{\max}]$, the range of crisp values it can
  take, such as 0–40 °C;
- a set of **terms** (linguistic values), such as `cold`, `warm` and `hot`, each defined by a
  [membership function](./membership-functions.md) over the universe.

```python
import ferrifuzz as ff

temperature = ff.Variable("temperature", 0, 40)
temperature["cold"] = ff.mf.trapezoid(0, 0, 10, 20)
temperature["warm"] = ff.mf.triangle(10, 20, 30)
temperature["hot"]  = ff.mf.trapezoid(20, 30, 40, 40)
```

## Fuzzification

**Fuzzification** maps one crisp value to its degree in *every* term. This is the first
stage of inference:

```python
temperature.fuzzify(25)    # {'cold': 0.0, 'warm': 0.5, 'hot': 0.5}
temperature(17)            # same as fuzzify: {'cold': 0.3, 'warm': 0.7, 'hot': 0.0}
```

At 25 °C the reading is "half warm, half hot". Rules about warm weather and rules about hot
weather will both fire, each at strength 0.5.

## Designing a good partition

The terms of a variable together form a **fuzzy partition** of the universe. Some rules of
thumb:

- **Cover the whole universe.** Every value from $x_{\min}$ to $x_{\max}$ should have
  non-zero membership in at least one term. Otherwise there are dead zones where no rule
  fires.
- **Overlap neighbours.** A common choice is a crossover at 0.5. Each term's peak sits at
  its neighbours' feet, so the degrees always sum to 1 (a *Ruspini* partition). The
  `temperature` variable above is built this way.
- **Use shoulders at the edges.** The lowest and highest terms should stay at 1 out to the
  edges of the universe, using `trapezoid(a, a, c, d)` or `triangle(a, c, c)`.
- **Use an odd number of terms** (3, 5 or 7) when the variable has a natural "zero" or
  "normal" middle, as error signals in controllers do (NB, NS, ZE, PS, PB).
- **More terms means more rules.** With $n$ terms per input and $k$ inputs, a full rule
  table has $n^k$ rules.

### Evenly spaced terms with `automf`

To get a standard partition without working out every breakpoint, let ferrifuzz space $n$
terms evenly over the universe:

```python
error = ff.Variable("error", -1, 1)
error.automf(["NB", "NS", "ZE", "PS", "PB"])
error.get_terms()   # ['NB', 'NS', 'ZE', 'PS', 'PB']
```

Pass a number instead of names to get conventional ones: `automf(3)` gives
`low/medium/high`, `automf(5)` gives `very_low … very_high`, `automf(7)` gives
`NB NM NS ZE PS PM PB`. Add `shape="gaussian"` for Gaussian terms. See the
[`Variable` reference](../python-api/variable.md).

## Inputs outside the universe

Real signals sometimes leave the range you designed for. By default, `FuzzySystem` **clamps**
each input to its variable's $[x_{\min}, x_{\max}]$ before fuzzifying. A reading of 45 °C on
a 0–40 °C variable is treated as 40 °C, which is "fully hot". This is usually what you want
in a controller. To get the raw membership values (which may all be 0), turn clamping off
with `FuzzySystem(clamp_inputs=False)`.

## Hedges: very, somewhat, …

Natural language modifies words: *very* hot, *somewhat* cold, *extremely* fast. Following
Zadeh, ferrifuzz models these **hedges** as powers of the membership degree:

$$
\text{hedge}_p(\mu) = \mu^{\,p}
$$

Since $0 \le \mu \le 1$:

- $p > 1$ **concentrates** the set. Degrees shrink, so the term becomes stricter. Only
  values that were already strongly "hot" remain "very hot".
- $p < 1$ **dilates** the set. Degrees grow, so the term becomes looser.

| Hedge word | Power $p$ | Effect | $\mu = 0.75 \to$ |
|---|---|---|---|
| `very` | 2 | concentrate | 0.5625 |
| `extremely` | 3 | strong concentrate | 0.4219 |
| `plus` | 1.25 | mild concentrate | 0.6980 |
| `minus` | 0.75 | mild dilate | 0.8059 |
| `somewhat`, `more_or_less`, `slightly` | 0.5 | dilate | 0.8660 |

Hedges never move a degree of exactly 0 or 1. They only reshape the slopes of the set.

### NOT

Negation uses the standard complement:

$$
\mu_{\text{NOT }A}(x) = 1 - \mu_A(x)
$$

In a rule, the hedge is applied first and then the negation:
`temp IS NOT very hot` means $1 - \mu_{\text{hot}}(x)^2$.

### Hedges in rules

You will rarely call hedges by hand. Write them in rule strings instead:

```python
rule = ff.Rule.from_string("IF temperature IS NOT very cold THEN fan IS fast")
```

You can also apply a hedge to a raw degree with `ff.Hedge`:

```python
hot = ff.mf.triangle(20, 40, 40)
mu = hot.membership(35)           # 0.75
ff.Hedge.very()(mu)               # 0.5625
ff.Hedge(3.0)(mu)                 # 0.421875  (extremely)
ff.Hedge.somewhat()(mu)           # 0.866...
```

A hedged term is a *different fuzzy set* from the plain one. In a Mamdani output
("THEN fan IS very fast"), the hedged shape is what gets clipped and aggregated.

## In ferrifuzz

- Python: [`Variable`](../python-api/variable.md), [`Hedge`](../python-api/operators-hedges.md)
- Rust: [`Variable`](../rust-api/variable.md), [`Hedge`](../rust-api/operators-hedges.md)
- Writing hedges and NOT in rules: [Rule syntax](../rule-syntax.md)
- Combining degrees with AND / OR: [Fuzzy operators](./operators.md)
