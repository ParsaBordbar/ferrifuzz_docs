---
title: What is fuzzy logic?
sidebar_label: What is fuzzy logic?
description: 'An introduction to fuzzy logic: crisp sets vs fuzzy sets, degrees of membership, and the four stages of a fuzzy inference system, from fuzzification to defuzzification.'
keywords: ['what is fuzzy logic', 'fuzzy sets', 'degree of membership', 'fuzzy inference system']
---

# What is fuzzy logic?

Ask ten people whether 27 °C is "hot" and you will not get a clean yes/no split. Most will
say "sort of". Classical logic can't say "sort of": a statement is true or false. Fuzzy logic,
introduced by Lotfi Zadeh in 1965, allows **partial truth**. A statement can be true to a
degree between 0 and 1.

## Crisp sets vs fuzzy sets

A **crisp set** has a sharp boundary. If we define "hot" as "temperature ≥ 30 °C", then
29.9 °C is not hot at all and 30 °C is completely hot. The indicator function jumps from 0 to 1:

$$
\chi_{\text{hot}}(x) = \begin{cases} 1 & x \ge 30 \\ 0 & \text{otherwise} \end{cases}
$$

A **fuzzy set** replaces the jump with a gradual transition. Its **membership function**
$\mu_A : X \to [0, 1]$ gives each element $x$ a **degree of membership** $\mu_A(x)$:

| Temperature | crisp "hot" | fuzzy "hot" |
|---|---|---|
| 20 °C | 0 | 0.0 |
| 25 °C | 0 | 0.25 |
| 30 °C | 1 | 0.5 |
| 35 °C | 1 | 0.75 |
| 40 °C | 1 | 1.0 |

The set $X$ of all values we care about (say 0 to 100 °C) is the **universe of discourse**.

:::note Fuzzy is not probability
$\mu_{\text{hot}}(30) = 0.5$ does **not** mean "30 °C is hot with probability 50 %". The
temperature is known exactly. What is vague is the *word* "hot", and 0.5 says how well
30 °C fits it.
:::

## Why build systems out of fuzzy sets?

Much human expertise comes as vague rules of thumb:

> *If the room is hot and humid, run the fan fast.*

A **fuzzy inference system** (FIS) runs rules like this directly. Each word ("hot", "humid",
"fast") is a fuzzy set, and the system turns numeric inputs into numeric outputs through
those rules. Fuzzy systems are:

- **Interpretable.** The model is a readable rule base, not a weight matrix.
- **Smooth.** Overlapping sets mean the output changes gradually as the inputs change.
- **Data-light.** You can build a working controller from expert knowledge alone, then tune it.

They are widely used in control (washing machines, cameras, cement kilns), decision support,
and as interpretable function approximators (ANFIS, TSK models).

## The inference pipeline

Every fuzzy system in ferrifuzz runs the same four stages:

```
crisp inputs ──▶ 1. fuzzify ──▶ 2. fire rules ──▶ 3. aggregate ──▶ 4. defuzzify ──▶ crisp outputs
                  μ for each      AND / OR of the     combine the       one number
                  input term      antecedent degrees   rule outputs      per output
```

1. **Fuzzification.** Each crisp input is turned into membership degrees for every term of
   its variable. For example, 27 °C might become `{cold: 0.0, warm: 0.8, hot: 0.35}`. See
   [Linguistic variables](./linguistic-variables.md).
2. **Rule evaluation.** Each rule's antecedent ("temp IS hot AND humidity IS high") is
   combined with fuzzy [operators](./operators.md) into one **firing strength**.
3. **Aggregation.** Each output term is shaped by its rule's firing strength, and the
   results are merged into one fuzzy set per output. See [Inference](./inference.md).
4. **Defuzzification.** The aggregated fuzzy set is reduced to one crisp number.
   See [Defuzzification](./defuzzification.md).

Here is the whole pipeline in a few lines of ferrifuzz:

```python
import ferrifuzz as ff

temp = ff.Variable("temp", 0, 40)
temp["cold"] = ff.mf.triangle(0, 0, 20)
temp["hot"] = ff.mf.triangle(20, 40, 40)

fan = ff.Variable("fan", 0, 100)
fan["slow"] = ff.mf.triangle(0, 0, 50)
fan["fast"] = ff.mf.triangle(50, 100, 100)

system = ff.FuzzySystem()
system.add_input(temp)
system.add_output(fan)
system += ff.Rule.from_string("IF temp IS cold THEN fan IS slow")
system += ff.Rule.from_string("IF temp IS hot THEN fan IS fast")

print(temp.fuzzify(30))          # stage 1: {'cold': 0.0, 'hot': 0.5}
print(system({"temp": 30}))      # stages 2-4: {'fan': 80.69}
```

## Type-1 and type-2

Everything above uses **type-1** fuzzy sets, where each $x$ has one exact membership degree.
But the membership function itself can be uncertain. Different experts draw "hot"
differently, and sensors are noisy. **Interval type-2** fuzzy sets model this by giving each
$x$ an *interval* of degrees, bounded by a lower and an upper membership function. The
shaded band between them is the *footprint of uncertainty*. When the band has zero width, a
type-2 set reduces to an ordinary type-1 set. See [Interval type-2](./interval-type-2.md).

## In ferrifuzz

- Build terms: [`ff.mf`](../python-api/membership.md) and [`ff.Variable`](../python-api/variable.md)
- Write rules: [Rule syntax](../rule-syntax.md)
- Run a system: [`ff.FuzzySystem`](../python-api/fuzzy-system.md)
- Next concept: [Membership functions](./membership-functions.md)

## Further reading

- L. A. Zadeh, "Fuzzy sets", *Information and Control*, 1965.
- E. H. Mamdani and S. Assilian, "An experiment in linguistic synthesis with a fuzzy logic
  controller", *Int. J. Man-Machine Studies*, 1975.
