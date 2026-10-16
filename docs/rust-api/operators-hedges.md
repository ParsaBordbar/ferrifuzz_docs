---
title: Operators & hedges (Rust)
sidebar_label: Operators & hedges
description: TNorm, TConorm and Complement (all formulas and accepted names), plus Hedge power modifiers.
---

# Operators & hedges

Fuzzy AND, OR and NOT are families of operators, not single formulas. ferrifuzz ships six
t-norms, six t-conorms and three complements. Each works on a type-1 degree (`f64`) and on an
interval type-2 degree (`(lower, upper)`). The math is explained in
[Concepts → Fuzzy operators](../concepts/operators.md).

```rust
use ferrifuzz::prelude::*;

assert_eq!(TNorm::Product.apply(0.5, 0.4), 0.2);
assert_eq!(TConorm::Max.apply(0.5, 0.4), 0.5);
assert_eq!(TNorm::Min.apply_interval((0.6, 0.8), (0.5, 0.9)), (0.5, 0.8));
assert!((Complement::Standard.apply(0.3) - 0.7).abs() < 1e-12);
```

In a `FuzzySystem`, the t-norm (`with_and`) combines the clauses inside an AND-group, and the
t-conorm (`with_or`) combines the OR-groups of a rule. See [FuzzySystem](./system.md).

## `TNorm`: fuzzy AND

| Variant | Formula $T(a, b)$ | Accepted names |
|---|---|---|
| `Min` *(default)* | $\min(a, b)$ | `min`, `godel`, `zadeh`, `standard` |
| `Product` | $ab$ | `product`, `prod`, `algebraic` |
| `Lukasiewicz` | $\max(0,\ a + b - 1)$ | `lukasiewicz`, `luk`, `bounded` |
| `Drastic` | $b$ if $a = 1$; $a$ if $b = 1$; else $0$ | `drastic` |
| `Einstein` | $\dfrac{ab}{2 - (a + b - ab)}$ | `einstein` |
| `Hamacher` | $\dfrac{ab}{a + b - ab}$ (0 when $a = b = 0$) | `hamacher` |

## `TConorm`: fuzzy OR

| Variant | Formula $S(a, b)$ | Accepted names |
|---|---|---|
| `Max` *(default)* | $\max(a, b)$ | `max`, `godel`, `zadeh`, `standard` |
| `Probabilistic` | $a + b - ab$ | `probor`, `prob`, `probabilistic`, `algebraic` |
| `Lukasiewicz` | $\min(1,\ a + b)$ | `lukasiewicz`, `luk`, `bounded` |
| `Drastic` | $b$ if $a = 0$; $a$ if $b = 0$; else $1$ | `drastic` |
| `Einstein` | $\dfrac{a + b}{1 + ab}$ | `einstein` |
| `Hamacher` | $\dfrac{a + b - 2ab}{1 - ab}$ (1 when $a = b = 1$) | `hamacher` |

### Methods (both enums)

| Item | Description |
|---|---|
| `apply(self, a, b) -> f64` | Type-1 degrees. |
| `apply_interval(self, a, b) -> (f64, f64)` | Applies the operator bound-wise to two `(lower, upper)` intervals. |
| `FromStr` | Case-insensitive; the names in the tables above. Unknown names give `InvalidParameter` with a "did you mean" suggestion and the valid list. |
| `name(self) -> &'static str`, `Display` | Canonical name (`"probor"` for `TConorm::Probabilistic`). |
| `ALL: &[Self]` | Every variant, in table order. |

Both enums are `Copy`, `Eq`, `Hash` and `Default`.

```rust
let s: TConorm = "Probabilistic".parse()?;
assert_eq!(s, TConorm::Probabilistic);
assert_eq!(s.to_string(), "probor");
for t in TNorm::ALL {
    println!("{:<12} {:.3}", t.name(), t.apply(0.7, 0.6));
}
```

## `Complement`: fuzzy NOT

| Variant | Formula $c(\mu)$ | Parameter |
|---|---|---|
| `Standard` *(default)* | $1 - \mu$ | none |
| `Sugeno(λ)` | $\dfrac{1 - \mu}{1 + \lambda\mu}$ | $\lambda > -1$ |
| `Yager(w)` | $(1 - \mu^{w})^{1/w}$ | $w > 0$ |

`Sugeno(0.0)` and `Yager(1.0)` both reduce to the standard complement.

| Item | Description |
|---|---|
| `Complement::from_name(kind, param) -> Result<Complement>` | `kind` is `"standard"` (alias `"zadeh"`), `"sugeno"` or `"yager"`, case-insensitive. Checks `λ > -1` or `w > 0`. `param` is ignored for standard. |
| `apply(self, mu) -> f64` | Type-1 degree. |
| `apply_interval(self, (l, u)) -> (f64, f64)` | Returns `(c(u), c(l))`. The bounds swap so that lower ≤ upper still holds. |

```rust
let yager = Complement::from_name("yager", 2.0)?;
assert!((yager.apply(0.3) - 0.9539).abs() < 1e-4);
assert_eq!(Complement::Standard.apply_interval((0.2, 0.6)), (0.4, 0.8));
```

:::note
`IS NOT` in a rule always uses the standard complement $1 - \mu$. `Complement` is for your
own calculations on degrees.
:::

## `Hedge`: linguistic modifiers

A hedge reshapes a degree with a power: $\mu \mapsto \mu^{p}$. If $p > 1$ it **concentrates**
the set ("very hot" is stricter than "hot"). If $p < 1$ it **dilates** the set ("somewhat hot"
is looser).

| Constructor | Power | Rule words that map to it |
|---|---|---|
| `Hedge::very()` | 2.0 | `very` |
| `Hedge::extremely()` | 3.0 | `extremely` |
| `Hedge::somewhat()` | 0.5 | `somewhat`, `more_or_less` (also `moreorless`), `slightly` |
| `Hedge::plus()` | 1.25 | `plus` |
| `Hedge::minus()` | 0.75 | `minus` |
| `Hedge::new(p)` | any `p` | none |

| Method | Description |
|---|---|
| `Hedge::from_word(word) -> Option<Hedge>` | Looks up the hedge for a rule word (case-insensitive). Returns `None` if the word is unknown. |
| `power() -> f64` | The exponent. |
| `apply(mu) -> f64` | $\mu^{p}$ |
| `apply_interval((l, u)) -> (f64, f64)` | Bound-wise. Powers are monotone, so the order is kept. |

```rust
assert_eq!(Hedge::very().apply(0.5), 0.25);
assert_eq!(Hedge::from_word("More_Or_Less"), Some(Hedge::somewhat()));
assert_eq!(Hedge::very().apply_interval((0.5, 0.8)), (0.25, 0.8 * 0.8));
```

In rules you normally write the hedge word (`temp IS very hot`) instead of building a
`Hedge` yourself. See [Rules](./rules.md).
