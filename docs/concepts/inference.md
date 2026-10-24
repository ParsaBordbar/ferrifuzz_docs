---
title: Mamdani vs Sugeno inference
sidebar_label: Mamdani vs Sugeno
description: 'How fuzzy rules fire, how Mamdani implication and aggregation work, how Sugeno/TSK weighted averages work, rule weights, and when to choose Mamdani or Sugeno inference.'
keywords: ['mamdani inference', 'sugeno inference', 'takagi-sugeno-kang', 'TSK fuzzy model', 'fuzzy implication']
---

# Mamdani vs Sugeno (TSK) inference

Both kinds of system share the first two stages: fuzzify the inputs, then compute each
rule's **firing strength**. They differ in what a rule *concludes* and how the conclusions
are combined.

## Step 1: how a rule fires

A rule's antecedent is an OR of AND-groups. ferrifuzz evaluates it as follows:

1. For each clause `var IS [NOT] [hedge] term`, look up the membership degree of the input
   in that term, then apply the hedge and the negation.
2. Combine the clauses inside each AND-group with the **t-norm** (`and_method`).
3. Combine the groups with the **t-conorm** (`or_method`).
4. Multiply by the rule's **weight**.

$$
w_r = \text{weight}_r \cdot S_{g}\Big( T_{c \in g}\ \mu_c \Big)
$$

Example with `and_method="min"`. Take the inputs `service = 6.5` and `food = 8`:

```
IF service IS good AND food IS delicious THEN tip IS high
   μ_good(6.5) = 0.5      μ_delicious(8) = 0.5      →   w = min(0.5, 0.5) = 0.5
```

### Rule weights

Every rule has a weight in $[0, 1]$ (default 1.0). The weight scales the firing strength,
which lets you mark a rule as less certain or less important than others:

```python
import ferrifuzz as ff

rule = ff.Rule.from_string("IF service IS poor THEN tip IS low WITH 0.5")
rule.weight      # 0.5
str(rule)        # 'IF service IS poor THEN tip IS low WITH 0.5'
```

You can also set a weight with `ff.Rule(..., weight=0.5)` or `rule.weight = 0.5`. A weight
outside $[0, 1]$ is an error (`ff.RuleSyntaxError` in a rule string, `ff.ModelError` from
`compute` when set on a rule object).

## Mamdani inference

Introduced by Mamdani and Assilian (1975) to control a steam engine. Every rule concludes a
**fuzzy set**: `THEN tip IS high` refers to the output term `high`.

**Implication** shapes the consequent set $B$ using the firing strength $w$:

| `implication=` | Name | Implied set |
|---|---|---|
| `"mamdani"` / `"min"` *(default)* | clipping | $\mu'(y) = \min(w,\ \mu_B(y))$ |
| `"larsen"` / `"product"` | scaling | $\mu'(y) = w \cdot \mu_B(y)$ |

Clipping cuts the top off the triangle at height $w$. Scaling shrinks the whole triangle,
which keeps its shape.

**Aggregation** merges every implied set for the same output variable into one set with
`max`:

$$
\mu_{\text{agg}}(y) = \max_r\ \mu'_r(y)
$$

If several rules conclude the same output term, ferrifuzz keeps only the strongest firing
strength for that term before implication.

**Defuzzification** then reduces $\mu_{\text{agg}}$ to one number, for example its centroid.
See [Defuzzification](./defuzzification.md).

```python
service = ff.Variable("service", 0, 10)
service["poor"] = ff.mf.trapezoid(0, 0, 2, 5)
service["good"] = ff.mf.triangle(2, 5, 8)
service["excellent"] = ff.mf.trapezoid(5, 8, 10, 10)

tip = ff.Variable("tip", 0, 30)
tip["low"] = ff.mf.triangle(0, 5, 10)
tip["medium"] = ff.mf.triangle(10, 15, 20)
tip["high"] = ff.mf.triangle(20, 25, 30)

mamdani = ff.FuzzySystem()                       # min AND, max OR, clip, centroid
mamdani.add_input(service)
mamdani.add_output(tip)
mamdani += ff.Rule.from_string("IF service IS poor THEN tip IS low")
mamdani += ff.Rule.from_string("IF service IS good THEN tip IS medium")
mamdani += ff.Rule.from_string("IF service IS excellent THEN tip IS high")

mamdani({"service": 6.5})   # {'tip': 19.9995...}
```

## Sugeno / TSK inference

Proposed by Takagi and Sugeno (1985), and often written TSK after Takagi, Sugeno and Kang.
The consequent of each rule is a **crisp function of the inputs**, not a fuzzy set.

- **Zeroth order.** $z_r$ is a constant. In ferrifuzz this is the output term's
  [analytic center](./membership-functions.md), so singleton output terms are the natural fit.
- **First order.** $z_r = b_r + \sum_k a_{r,k}\, x_k$ is a linear function of the inputs. You
  register it with `add_consequent`.

The output is the firing-strength-weighted average over **every fired rule**:

$$
y = \frac{\sum_r w_r\, z_r}{\sum_r w_r}
$$

No output fuzzy set is built and no grid is sampled, so Sugeno is exact and much faster than
Mamdani. Use `defuzz_method="sugeno"` (alias `"weighted_average"`):

```python
sugeno = ff.FuzzySystem(defuzz_method="sugeno")
sugeno.add_input(service)
sugeno.add_output(tip)                 # term centers 5, 15, 25 act as constants
sugeno += ff.Rule.from_string("IF service IS poor THEN tip IS low")
sugeno += ff.Rule.from_string("IF service IS good THEN tip IS medium")
sugeno += ff.Rule.from_string("IF service IS excellent THEN tip IS high")

sugeno({"service": 6.5})               # {'tip': 20.0}  = (0.5·15 + 0.5·25) / (0.5 + 0.5)

# First order: the "high" rule now outputs z = 1 + 2·service
sugeno.add_consequent("tip", "high", {"service": 2.0}, bias=1.0)
sugeno({"service": 10.0})              # {'tip': 21.0}
```

Mamdani aggregates per output **term**, while Sugeno sums per **rule**. Two rules that both
conclude `tip IS high` both count in the Sugeno average. A first-order TSK model needs this,
because each rule's $z_r$ depends on the inputs.

## What if no rule fires?

If every rule for an output has firing strength 0, the system has no basis for an answer.
`compute` still returns that output, with the value `nan`. Check for it with `math.isnan`.
It usually means the [partition](./linguistic-variables.md) has a gap or the rule base is
incomplete. Run `system.validate()` to find rules that reference unknown variables or terms.

## Which one should I use?

| | Mamdani | Sugeno / TSK |
|---|---|---|
| Consequent | fuzzy set (`tip IS high`) | constant or linear function |
| Interpretability | high: outputs are words too | lower for first order |
| Output computation | sample, aggregate, defuzzify | weighted average, exact |
| Speed | O(resolution × terms) per output | O(fired rules) |
| Smoothness | good with centroid | very good; first order can be exactly linear locally |
| Learning from data | awkward | natural: consequents fit by least squares (ANFIS) |
| Typical use | expert systems, teaching, decision support | control, function approximation, ANFIS |

## In ferrifuzz

- Python: [`FuzzySystem`](../python-api/fuzzy-system.md) (`implication`, `defuzz_method`, `add_consequent`)
- Rust: [`FuzzySystem`, `Implication`, `Defuzz`](../rust-api/system.md)
- Tutorials: [Tipping problem](../tutorials/tipping.md) (Mamdani),
  [Sugeno function approximation](../tutorials/sugeno-approximation.md) (first-order TSK with least squares)
