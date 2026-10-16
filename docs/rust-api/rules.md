---
title: Rules (Rust)
sidebar_label: Rules
description: Clause and Rule in Rust, covering the rule-string parser, DNF antecedents, multi-output consequents, NOT, hedges and weights.
---

# Rules

A rule is `IF <condition> THEN <consequent>`. The full grammar, the keyword list and the
hedge table are in the [Rule syntax reference](../rule-syntax.md). This page covers the Rust
types that hold a parsed rule.

```rust
use ferrifuzz::prelude::*;

let r = Rule::parse("IF (temp IS hot OR hum IS high) AND wind IS NOT strong THEN fan IS fast WITH 0.8")?;
assert_eq!(r.antecedent.len(), 2);        // two AND-groups after expanding the parentheses
assert_eq!(r.weight, 0.8);
println!("{r}");
// IF temp IS hot AND wind IS NOT strong OR hum IS high AND wind IS NOT strong THEN fan IS fast WITH 0.8
```

## `Rule`

```rust
pub struct Rule {
    pub antecedent: Vec<Vec<Clause>>, // DNF: an OR of AND-groups
    pub consequent: Vec<Clause>,      // one clause per output variable
    pub weight: f64,                  // firing-strength multiplier, default 1.0
}
```

The antecedent is stored in **disjunctive normal form**. The outer `Vec` is OR and each inner
`Vec` is an AND-group, so `a AND b OR c` becomes `[[a, b], [c]]`. During inference, each group
is folded with the system's t-norm (`and_method`), and the groups are combined with its
t-conorm (`or_method`).

| Constructor | Description |
|---|---|
| `Rule::parse(s) -> Result<Rule>` | Parses a rule string. Also available as `s.parse::<Rule>()` (`FromStr`). |
| `Rule::new(antecedent, consequent) -> Result<Rule>` | Builds from an explicit DNF. Errors if there is no consequent or an AND-group is empty. |
| `Rule::when(conditions, conclusion) -> Result<Rule>` | AND-only shorthand. Takes anything `Into<Clause>`, including `(&str, &str)` pairs. |
| `rule.with_weight(w) -> Rule` | Sets the weight (builder). |

```rust
let r = Rule::when([("temp", "hot"), ("hum", "high")], ("fan", "fast"))?.with_weight(0.5);
assert_eq!(r.to_string(), "IF temp IS hot AND hum IS high THEN fan IS fast WITH 0.5");
```

`Display` prints the canonical form: upper-case keywords, groups joined by `OR`, and
` WITH <w>` only when the weight is not 1. The output parses back to an equal rule.
`Rule` implements `Clone`, `Debug` and `PartialEq`.

### Weights

A rule's firing strength is multiplied by its weight. The parser accepts only `WITH` values in
`[0, 1]`. `with_weight` and direct assignment to `rule.weight` are not checked at that point.
Instead, `FuzzySystem::compute` returns `Error::InvalidModel` for any rule whose weight lies
outside `[0, 1]`:

```text
invalid fuzzy system (1 problem):
  - rule #1 `IF service IS poor THEN tip IS low WITH 1.5`: weight 1.5 is outside [0, 1]
```

## The parser

`Rule::parse` is a small recursive-descent parser:

```text
IF <condition> THEN <clause> [AND <clause> ...] [WITH <weight>]
condition := <clause> | <condition> AND <condition> | <condition> OR <condition> | ( <condition> )
clause    := <var> IS [NOT] [<hedge>] <term>
```

- **Keywords** (`IF THEN AND OR IS NOT WITH`) are case-insensitive. Variable and term names
  are case-sensitive.
- **AND binds tighter than OR.** Parentheses override this. They are expanded into the DNF,
  which is exact for the default `min`/`max` operators. The expansion is capped at 4096 AND-groups.
- **Terms are single words.** Use underscores for multi-word terms (`very_high`).
- **Hedges**: `very`, `extremely`, `somewhat`, `more_or_less`, `slightly`, `plus`, `minus`.
  A hedge word counts as a hedge only when a term follows it, so a term may itself be named
  `plus`.
- **Consequents** may be joined with `AND` (one rule driving several outputs). `OR` is not
  allowed after `THEN`.

Every failure is `Error::Parse`. The message points at the offending token with a caret:

```text
unexpected 'poor' after 'service IS really': terms are single words. If 'really' is meant as a hedge, use one of: very, extremely, somewhat, more_or_less, slightly, plus, minus; for a multi-word term use underscores ('really_poor')
  IF service IS really poor THEN tip IS low
                       ^
```

Other examples: `expected THEN after the condition, found end of rule`,
`WITH must be followed by a weight between 0 and 1`,
`NOT must come right after IS: write 't IS NOT very ...'`,
`expected ')' to close the parenthesis, found 'THEN'`.

:::note Parsing does not check names
`Rule::parse` only checks syntax. Whether `temp` and `hot` exist is checked against the system:
by `FuzzySystem::validate()`, and as an error from `compute`.
:::

## `Clause`

```rust
pub struct Clause {
    pub var: String,
    pub term: String,
    pub negated: bool,          // `var IS NOT term`
    pub hedge: Option<String>,  // lower-case hedge word, e.g. "very"
}
```

| Method | Description |
|---|---|
| `Clause::new(var, term)` | Plain `var IS term`. `From<(&str, &str)>` and `From<(String, String)>` also work. |
| `negate(self) -> Clause` | Marks the clause as `IS NOT`. |
| `with_hedge(self, word) -> Result<Clause>` | Adds a hedge. Errors (`InvalidParameter`) on an unknown word. |
| `hedge() -> Option<Hedge>` | The hedge as a [`Hedge`](./operators-hedges.md) power modifier. |
| `modify(mu) -> f64` | Applies the hedge, then NOT (`1 - μ`). |
| `modify_interval((l, u)) -> (f64, f64)` | Interval version. NOT swaps the bounds: `(1 - u, 1 - l)`. |
| `is_modified() -> bool` | `true` if NOT or a hedge is present. |
| `Display` | `temp IS NOT very hot` |

```rust
let c = Clause::new("temp", "hot").with_hedge("very")?.negate();
assert_eq!(c.to_string(), "temp IS NOT very hot");
assert!((c.modify(0.5) - 0.75).abs() < 1e-12);   // 1 - 0.5²
```

## Adding rules to a system

```rust
let mut system = FuzzySystem::new();
let rule = Rule::parse("IF temp IS cold THEN fan IS slow")?;

system.add_rule(rule);                              // a Rule you built
system.add_rule_str("IF temp IS hot THEN fan IS fast")?;
system.add_rules_str([                              // all-or-nothing: nothing is added if one fails
    "IF temp IS hot THEN fan IS fast",
    "IF temp IS NOT hot THEN fan IS NOT fast",
])?;
system.rules_mut()[0].weight = 0.7;                 // edit later
```
