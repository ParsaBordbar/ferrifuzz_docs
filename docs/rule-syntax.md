---
title: 'Rule syntax reference'
sidebar_label: 'Rule Syntax'
description: 'The grammar of ferrifuzz rule strings: keywords, AND/OR/NOT, hedges, parentheses, weights, multi-output consequents and common parse errors.'
---

# Rule syntax reference

Ferrifuzz rules are plain strings, parsed once by `Rule.from_string` (Python) or
`Rule::parse` / `str::parse::<Rule>()` (Rust). The same parser is used by both languages.

<details>
<summary>Setup used by the examples on this page</summary>

```python
import ferrifuzz as ff

service = ff.Variable("service", 0, 10)
service["poor"] = ff.mf.trapezoid(0, 0, 2, 5)
service["good"] = ff.mf.triangle(2, 5, 8)
service["excellent"] = ff.mf.trapezoid(5, 8, 10, 10)

food = ff.Variable("food", 0, 10)
food["rancid"] = ff.mf.trapezoid(0, 0, 1, 3)
food["delicious"] = ff.mf.trapezoid(7, 9, 10, 10)

tip = ff.Variable("tip", 0, 30)
tip["low"] = ff.mf.triangle(0, 5, 10)
tip["medium"] = ff.mf.triangle(10, 15, 20)
tip["high"] = ff.mf.triangle(20, 25, 30)

system = ff.FuzzySystem()
system.add_input(service)
system.add_input(food)
system.add_output(tip)
```

</details>

```python
ff.Rule.from_string("IF temp IS NOT very cold OR humidity IS high THEN fan IS fast AND alarm IS on")
```

## Grammar

```text
rule      := IF condition THEN clause [AND clause ...] [WITH weight]
condition := clause
           | condition AND condition
           | condition OR condition
           | ( condition )
clause    := variable IS [NOT] [hedge] term
weight    := a number in [0, 1]
```

- **Keywords** (`IF`, `THEN`, `AND`, `OR`, `IS`, `NOT`, `WITH`) are **case-insensitive**:
  `if temp is hot then fan is fast` is the same rule. Upper case is the convention used in
  these docs and is what `str(rule)` prints.
- **Variable and term names** are **single words** and **case-sensitive**. They must match
  the names you registered (`temp["hot"] = ...`). Use underscores for multi-word names:
  `very_high`, `more_than_enough`.
- A keyword can't be used as a name (a variable called `if` or a term called `not` won't parse).
- Whitespace is free: extra spaces and line breaks between tokens are ignored.

## AND, OR and precedence

`AND` binds tighter than `OR`, as in ordinary logic:

```text
IF a IS x AND b IS y OR c IS z THEN out IS w
   ≡  (a IS x AND b IS y) OR (c IS z)
```

When a rule fires, clauses inside an AND‑group are combined with the system's
`and_method` (a t‑norm, default `min`) and the groups are combined with its `or_method`
(a t‑conorm, default `max`). See [Fuzzy operators](./concepts/operators.md).

## Parentheses

Use parentheses to override precedence:

```text
IF (temp IS hot OR humidity IS high) AND wind IS NOT strong THEN fan IS fast
```

Internally every antecedent is stored in **disjunctive normal form** (an OR of AND‑groups),
so the parser distributes AND over OR:

```text
(temp IS hot OR humidity IS high) AND wind IS NOT strong
   ≡  (temp IS hot AND wind IS NOT strong) OR (humidity IS high AND wind IS NOT strong)
```

```python
r = ff.Rule.from_string(
    "IF (temp IS hot OR humidity IS high) AND wind IS NOT strong THEN fan IS fast"
)
print(r.group_count())    # 2
print(r)                  # IF temp IS hot AND wind IS NOT strong OR humidity IS high AND wind IS NOT strong THEN fan IS fast
```

:::note Exact for min/max only
This expansion is exactly equivalent for the default `min`/`max` operators (they are
distributive). With other operator pairs, e.g. `and_method="product"` with
`or_method="probor"`, the expanded form can give slightly different firing strengths than
evaluating the parenthesized expression directly, because `wind IS NOT strong` is counted
in both groups. If that matters for your experiment, write the rule in OR‑of‑AND form
yourself.
:::

## NOT

`NOT` goes **right after `IS`** and complements the term's degree: $\mu \mapsto 1 - \mu$.

```text
IF service IS NOT poor THEN tip IS medium
```

`IS NOT` can also appear in a consequent; in a Mamdani system the output set is then the
complement of the term.

## Hedges

A hedge goes between `IS [NOT]` and the term and raises the term's degree to a power,
$\mu \mapsto \mu^p$:

| Hedge word | Power $p$ | Effect |
|---|---|---|
| `very` | 2 | concentration (stricter) |
| `extremely` | 3 | strong concentration |
| `plus` | 1.25 | mild concentration |
| `minus` | 0.75 | mild dilation |
| `somewhat` | 0.5 | dilation (looser) |
| `more_or_less` | 0.5 | same as `somewhat` |
| `slightly` | 0.5 | same as `somewhat` |

Hedge words are case-insensitive. When both appear, the hedge is applied **first**, then
`NOT`: `temp IS NOT very hot` means $1 - \mu_{hot}^2$.

```python
r = ff.Rule.from_string("IF temp IS NOT very cold THEN fan IS fast")
c = r.clauses[0][0]
print(c.negated, c.hedge, c.hedge_power)    # True very 2.0
```

A hedge word is only treated as a hedge when a term follows it, so a term may itself be
called `plus` or `minus` (`IF error IS plus THEN ...`).

## Several outputs in one rule

Join consequents with `AND` to drive several output variables at once. Each consequent
receives the rule's full firing strength:

```text
IF temp IS hot THEN fan IS fast AND alarm IS on
```

`OR` is **not** allowed after `THEN`. A rule may not conclude the same output variable twice
(`validate()` reports it).

## Rule weights

Append `WITH <weight>` to scale the rule's firing strength. The weight must be in $[0, 1]$
(default 1):

```python
r = ff.Rule.from_string("IF service IS good THEN tip IS medium WITH 0.5")
print(r.weight)   # 0.5
print(r)          # IF service IS good THEN tip IS medium WITH 0.5
```

You can also set it on a rule object: `ff.Rule(..., weight=0.5)` or `rule.weight = 0.5`.
A weight outside $[0, 1]$ is a `RuleSyntaxError` in a string, and a `ModelError` from
`compute` when set on a rule object.

## Writing rules in Python

Long rule bases read well as a list or a triple-quoted block:

```python
RULES = """
IF service IS poor OR food IS rancid THEN tip IS low
IF service IS good THEN tip IS medium
IF service IS excellent OR food IS delicious THEN tip IS high
"""
for line in RULES.strip().splitlines():
    system += line          # a plain string is parsed like Rule.from_string(line)
```

The [VS Code extension](./editor-support.md) highlights both styles. Rules can also be
built without strings, with `ff.Rule(conditions=..., conclusion=...)`. See the
[`Rule` reference](./python-api/rule.md).

## Parse errors

Malformed rules raise `ff.RuleSyntaxError` in Python (a `ValueError` subclass;
`Error::Parse` in Rust). The message explains the problem and points at the offending
token with a caret:

```python
ff.Rule.from_string("IF temp IS very hot humid THEN fan IS fast")
```

```text
ferrifuzz.RuleSyntaxError: unexpected 'humid' after 'temp IS hot': terms are single words
  IF temp IS very hot humid THEN fan IS fast
                      ^
```

| What you wrote | What the parser says | Fix |
|---|---|---|
| `temp IS hot THEN fan IS fast` | `a rule must start with IF, e.g. 'IF temp IS hot AND hum IS high THEN fan IS fast'` | start with `IF` |
| `IF temp IS hot` | `expected THEN after the condition, found end of rule` | add the conclusion |
| `IF temp hot THEN fan IS fast` | `expected IS after variable 'temp', found 'hot'` | every clause is `var IS term` |
| `IF temp IS really hot THEN ...` | `unexpected 'hot' after 'temp IS really': terms are single words. If 'really' is meant as a hedge, use one of: very, extremely, somewhat, more_or_less, slightly, plus, minus; for a multi-word term use underscores ('really_hot')` | use a known hedge or rename the term |
| `IF temp IS warm humid THEN ...` (term `warm humid`) | `unexpected 'humid' after 'temp IS warm': terms are single words. If 'warm' is meant as a hedge, ...` | rename the term `warm_humid` |
| `IF temp IS hot NOT THEN ...` | `NOT must come right after IS: write 'temp IS NOT hot ...'` | move `NOT` |
| `IF temp IS NOT THEN fan IS fast` | `expected a term name after 'temp IS', found 'THEN'` | name the term |
| `IF (temp IS hot OR hum IS high THEN ...` | `expected ')' to close the parenthesis, found 'THEN'` | close the parenthesis |
| `IF temp IS hot THEN fan IS fast OR alarm IS on` | `OR is not allowed after THEN; combine several outputs with AND` | use `AND` |
| `IF temp IS hot THEN fan IS fast WITH 2` | `WITH must be followed by a weight between 0 and 1` | use a weight in $[0, 1]$ |
| `IF temp IS hot THEN fan IS fast please` | `unexpected 'please' after the conclusion` | remove stray words |

:::tip Parsing is not checking
A rule can parse fine and still reference a variable or term that doesn't exist. Those
mistakes are caught when the rule meets a system: `system.validate()` lists them, and
`compute` raises `ff.ModelError` with a "did you mean ...?" suggestion. See
[Reading error messages](./getting-started/error-messages.md).
:::
