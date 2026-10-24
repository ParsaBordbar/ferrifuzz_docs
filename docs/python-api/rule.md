---
title: 'Rule & Clause (Python)'
sidebar_label: 'Rule & Clause'
description: 'Python API for ff.Rule and ff.Clause: build fuzzy IF-THEN rules from strings or tuples, inspect them, and add them to a FuzzySystem.'
keywords: ['fuzzy rules python', 'Rule.from_string']
---

# `Rule` and `Clause`

The rule string grammar is documented on the [Rule syntax](../rule-syntax.md) page. This
page covers the Python objects.

## `Rule.from_string`

<!-- skip-check -->
```python
ff.Rule.from_string(rule_str: str) -> Rule
```

Parses a rule. Raises `ff.RuleSyntaxError` (a `ValueError`) with a caret‑marked message
if the string is malformed. Anywhere a system takes a rule, you can also pass the string
itself: `system += "IF temp IS hot THEN fan IS fast"`.

```python
import ferrifuzz as ff

r = ff.Rule.from_string(
    "IF temp IS NOT very cold OR humidity IS high THEN fan IS fast AND alarm IS on"
)
print(r.group_count(), r.consequent_count())    # 2 2
```

Parsing only checks the grammar. Whether `temp` and `cold` exist is checked when the rule
is used by a system (`system.validate()`, or `ff.ModelError` from `compute`).

## `Rule(...)`: building without strings

<!-- skip-check -->
```python
ff.Rule(
    conditions: list[tuple[str, str]] | None = None,
    conclusion: tuple[str, str] | list[tuple[str, str]] | Clause | list[Clause] = ...,
    antecedent: list[list[tuple[str, str]]] | None = None,
    weight: float = 1.0,
)
```

Pass **exactly one** of `conditions` or `antecedent`, plus a `conclusion`. Handy when rules
are generated in a loop (e.g. a 5×5 rule table):

```python
# AND-only rule: IF temp IS hot AND hum IS high THEN fan IS fast
r = ff.Rule(conditions=[("temp", "hot"), ("hum", "high")], conclusion=("fan", "fast"))

# OR rule, given in DNF (a list of AND-groups), with two outputs
r = ff.Rule(
    antecedent=[[("temp", "hot")], [("temp", "extreme")]],
    conclusion=[("fan", "fast"), ("alarm", "on")],
)
print(r)    # IF temp IS hot OR temp IS extreme THEN fan IS fast AND alarm IS on
```

| Parameter | Description |
|---|---|
| `conditions` | flat list of `(variable, term)` pairs joined by AND |
| `antecedent` | DNF: outer list = OR, inner lists = AND‑groups of `(variable, term)` pairs |
| `conclusion` | one `(variable, term)` tuple, a list of them (several outputs), or `Clause` object(s) to use `NOT`/hedges in the consequent |
| `weight` | firing‑strength multiplier in $[0, 1]$ (default `1.0`); a value outside the range makes `compute` raise `ff.ModelError` |

Antecedent tuples are plain `var IS term` clauses; for `NOT` or hedges in the antecedent,
use `Rule.from_string`. Missing both `conditions` and `antecedent`, passing both, or
omitting `conclusion` raises `ValueError`.

## Properties

| Property | Type | Description |
|---|---|---|
| `antecedent` | `list[list[tuple[str, str]]]` | DNF antecedent as `(var, term)` pairs. `NOT` and hedges are **not** shown here; use `clauses`. Settable. |
| `clauses` | `list[list[Clause]]` | DNF antecedent with full `Clause` objects (read‑only) |
| `conditions` | `list[tuple[str, str]]` | flat AND list; raises `ValueError` on a rule that uses OR. Setting it replaces the antecedent with one AND‑group. |
| `conclusion` | `tuple[str, str]` | the single consequent; raises `ValueError` on a multi‑output rule. Settable. |
| `conclusions` | `list[tuple[str, str]]` | every consequent. Settable. |
| `consequent_clauses` | `list[Clause]` | every consequent with `NOT`/hedge information (read‑only) |
| `weight` | `float` | firing‑strength multiplier. Settable. |

## Methods

| Method | Description |
|---|---|
| `group_count()` | number of OR‑groups in the antecedent (1 for an AND‑only rule) |
| `consequent_count()` | number of consequents |
| `str(rule)` | canonical rule string, e.g. `IF temp IS hot THEN fan IS fast WITH 0.5`; it parses back to an equal rule |
| `repr(rule)` | `<Rule: 'IF ...'>` |
| `rule == other`, `!=` | structural equality. Ordering (`<`, `>`) raises `NotImplementedError`. |

```python
r = ff.Rule(conditions=[("service", "good")], conclusion=("tip", "medium"), weight=0.5)
print(r)                                   # IF service IS good THEN tip IS medium WITH 0.5
print(ff.Rule.from_string(str(r)) == r)    # True
```

## Adding rules to a system

<details>
<summary>Setup: the temp → fan variables</summary>

```python
import ferrifuzz as ff

temp = ff.Variable("temp", 0, 40)
temp["cold"] = ff.mf.triangle(0, 0, 20)
temp["warm"] = ff.mf.triangle(10, 20, 30)
temp["hot"] = ff.mf.triangle(20, 40, 40)

fan = ff.Variable("fan", 0, 100)
fan["slow"] = ff.mf.triangle(0, 0, 50)
fan["medium"] = ff.mf.triangle(25, 50, 75)
fan["fast"] = ff.mf.triangle(50, 100, 100)

system = ff.FuzzySystem()
system.add_input(temp)
system.add_output(fan)
```

</details>

```python
system += ff.Rule.from_string("IF temp IS hot THEN fan IS fast")
system += "IF temp IS warm THEN fan IS medium"
system.add_rule(ff.Rule(conditions=[("temp", "cold")], conclusion=("fan", "slow")))
system.add_rules(["IF temp IS hot THEN fan IS fast", "IF temp IS cold THEN fan IS slow"])
```

`add_rules` adds nothing if any rule in the list fails to parse.

## `Clause`

One `var IS [NOT] [hedge] term` clause.

<!-- skip-check -->
```python
ff.Clause(var: str, term: str, negated: bool = False, hedge: str | None = None)
```

```python
c = ff.Clause("temp", "hot", negated=True, hedge="very")
print(c)               # temp IS NOT very hot
print(c.hedge_power)   # 2.0
```

| Attribute | Description |
|---|---|
| `var`, `term` | names |
| `negated` | `True` for `IS NOT` |
| `hedge` | hedge word (`"very"`, ...) or `None`; an unknown word raises `ValueError` |
| `hedge_power` | the hedge's exponent, or `None` |

Valid hedge words and their powers: `very` 2, `extremely` 3, `somewhat` / `more_or_less` /
`slightly` 0.5, `plus` 1.25, `minus` 0.75. The degree of a clause is the term's degree,
raised to the hedge power, then complemented if negated.

Clauses are mostly read from `rule.clauses` / `rule.consequent_clauses`; you can pass them
as a `conclusion` to build a consequent such as `fan IS NOT fast`.
