---
title: 'Migrating from 0.1'
sidebar_label: 'Migrating from 0.1'
description: 'What changed between ferrifuzz 0.1 and 0.2, and how to update code written for 0.1.'
---

# Migrating from 0.1

Ferrifuzz 0.2 is mostly compatible with code written for 0.1. The main change is that
mistakes which 0.1 silently turned into a wrong (or missing) number now **raise an error**
that says what to fix. If your 0.1 code ran correctly, it will usually run unchanged; if it
now raises, the error almost always points at a real bug.

Upgrade with:

```bash
pip install -U -i https://test.pypi.org/simple/ "ferrifuzz==0.2.0"
```

## Breaking changes and how to migrate

| In 0.1 | In 0.2 | What to do |
|---|---|---|
| Missing or unknown inputs were ignored | `ff.InputError` | pass every input, spelled exactly |
| Unknown terms in rules counted as μ = 0 | `ff.ModelError` | fix the name the message suggests |
| Unknown option names (`defuzz_method="centriod"`) fell back to the default | `ff.FuzzyError` | use one of the listed names |
| Inputs outside the range gave `{}` | clamped to the range | pass `clamp_inputs=False` for the old behaviour |
| An output no rule fired was absent from the result | present, as `nan` | check with `math.isnan(...)` instead of `"out" in result` |
| `str(rule)` printed `(weight=0.5)` | prints `WITH 0.5`, which parses back | nothing |
| Multi‑word terms (`IS really poor`) | `ff.RuleSyntaxError` | rename to `really_poor` |
| `repr(mf)` was `<MembershipFunction: Triangular>` | `triangle(0, 5, 10)` | nothing, unless you parsed the repr |
| `validate()` messages looked like `rule 0: ...` | `error: rule #1 ...` / `warning: ...` (rules counted from 1) | update code that matches on the text |
| Rust: `compute(..) -> HashMap` | `-> Result<HashMap>` | add `?` |
| Rust: `mf::it2(..) -> IT2MF` | `-> Result<IT2MF>` | add `?` |
| `FuzzyTimeSeries(mf_type="trapezoid")` silently used triangles | `ValueError` | use `"triangle"` or `"gaussian"` |

All new exception classes subclass `ValueError`, so an existing `except ValueError:` still
catches them. See [Reading error messages](./error-messages.md).

## Common patterns to update

**Checking whether an output was produced:**

<!-- skip-check -->
```python
import math

out = system(inputs)
# 0.1:  if "tip" in out: ...
if not math.isnan(out["tip"]):
    print(out["tip"])
```

**Systems that relied on missing inputs being skipped.** In 0.1 you could call a two‑input
system with only one input and the rules using the other input simply didn't fire. In 0.2
every registered input is required. Either pass a value for every input, or build separate
systems for the different situations.

**Rule strings with spaces in term names.** Rename the term with underscores, both where you
add it (`var["very_high"] = ...`) and in the rules.

**Code that clipped inputs by hand** (`np.clip(x, lo, hi)` before `compute`) keeps working,
but the clipping is no longer needed: inputs are clamped by default.

## Bugs fixed in 0.2 that change results

These are fixes, but they can change the numbers you got from 0.1:

- **Shoulder membership functions** (`triangle(0, 0, 20)`, `trapezoid(0, 10, 20, 20)`)
  returned 0 at their own peak, so outputs went missing at the edges of the input range.
  They now return 1 there.
- **Fuzzy time series** mapped values outside the fitted range to the *lowest* partition
  (forecasts of about 13 000 for 19 000‑level data). They now map to the nearest partition.
- **Term, input and output order** is now insertion order (it was random), so
  `get_terms()`, `fuzzify()` and result dicts list things in the order you added them.
- A term could exist as type‑1 and interval type‑2 at the same time; assigning a term now
  always replaces the old one.

## New in 0.2

Worth a look while you migrate:

- `ff.plot` ([Plotting](../python-api/plot.md)), `Variable.automf`, vectorized
  `mf.membership(array)`.
- Rules: parentheses, case‑insensitive keywords, `WITH` weights, plain strings in `+=`
  ([Rule syntax](../rule-syntax.md)).
- `FuzzySystem`: `compute_interval`, `rule_strengths`, `output_set` / `output_fou`,
  `evaluate`, `check`, `add_rules` ([FuzzySystem](../python-api/fuzzy-system.md)).
- `FuzzyTimeSeries(universe=...)` and `.evaluate(series)` ([Fuzzy time series](../python-api/fts.md)).
- `ff.mf.it2(..., lower_height=...)`, `Hedge.extremely()`, `Hedge.slightly()`.
- Faster: rules are compiled once, and `compute_batch` uses all CPU cores.
- Python 3.9+ (0.1 required 3.13), wheels for Windows, macOS and Linux.
