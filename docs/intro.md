---
title: 'Ferrifuzz: fuzzy logic for Python and Rust'
sidebar_label: 'Introduction'
description: 'Ferrifuzz is an open-source fuzzy logic library for Python and Rust: membership functions, plain-text rules, Mamdani, Sugeno/TSK and interval type-2 inference, and fuzzy time series.'
keywords: ['fuzzy logic', 'fuzzy logic python', 'fuzzy logic rust', 'fuzzy inference system', 'mamdani', 'sugeno', 'interval type-2', 'fuzzy time series']
slug: /
---

# Ferrifuzz

> **Built for uncertainty. Engineered for speed.**

**Ferrifuzz** is a fuzzy logic library with a pure‑Rust core and a Python package on top.
Both expose the same engine, so you can prototype in a notebook and ship the same model in
Rust. It was written with fuzzy‑systems courses in mind: rules are plain English, results
are reproducible, and mistakes produce error messages that tell you what went wrong.

```bash
pip install -i https://test.pypi.org/simple/ "ferrifuzz==0.2.0"
```

```python
import ferrifuzz as ff

service = ff.Variable("service", 0, 10)
service["poor"] = ff.mf.trapezoid(0, 0, 2, 5)
service["good"] = ff.mf.triangle(2, 5, 8)
service["excellent"] = ff.mf.trapezoid(5, 8, 10, 10)

tip = ff.Variable("tip", 0, 30)
tip["low"] = ff.mf.triangle(0, 5, 10)
tip["medium"] = ff.mf.triangle(10, 15, 20)
tip["high"] = ff.mf.triangle(20, 25, 30)

system = ff.FuzzySystem()
system.add_input(service)
system.add_output(tip)
system += ff.Rule.from_string("IF service IS poor THEN tip IS low")
system += ff.Rule.from_string("IF service IS good THEN tip IS medium")
system += ff.Rule.from_string("IF service IS excellent THEN tip IS high")

print(system({"service": 7.5}))   # {'tip': 22.6079...}
```

## What you get

- **Membership functions**: triangle, trapezoid, gaussian, generalized bell, sigmoid,
  singleton, and interval type‑2 sets built from any two of them.
- **Linguistic variables** with dict‑style terms, hedges (`very`, `extremely`, `somewhat`, ...)
  and `NOT`.
- **Fuzzy operators**: 6 t‑norms, 6 t‑conorms, 3 complements.
- **Rules as strings**: `IF temp IS NOT very cold OR humidity IS high THEN fan IS fast AND alarm IS on`,
  with parentheses and rule weights.
- **Inference**: Mamdani, Sugeno/TSK (constant or linear consequents) and interval type‑2
  (Karnik–Mendel, center‑of‑sets, height type reduction). Six defuzzification methods.
- **Fuzzy time series** forecasting (Chen 1996, first and high order) with RMSE/MAE/MAPE metrics.
- **Batch inference** over NumPy columns, optional **matplotlib plots**, and a
  [**VS Code extension**](./editor-support.md) that completes, checks and highlights rule strings.

## The pipeline at a glance

```
crisp input ──▶ fuzzify ──▶ fire rules ──▶ aggregate ──▶ defuzzify ──▶ crisp output
                (μ per       (AND / OR     (max per       (centroid,
                 term)        t-norms)      output term)   bisector, …)
```

## Where to next

| I want to… | Go to |
|---|---|
| Install the package | [Installation](./getting-started/installation.md) |
| Build and run a system in five minutes | [Your first system](./getting-started/first-system.md) |
| Learn the theory behind the code | [Concepts](./concepts/what-is-fuzzy.md) |
| Look up what rule strings can contain | [Rule syntax](./rule-syntax.md) |
| Work through a full course‑style project | [Tutorials](./tutorials/tipping.md) |
| Look up a class or method | [Python API](./python-api/overview.md) · [Rust API](./rust-api/overview.md) |
| Fix an error | [Reading error messages](./getting-started/error-messages.md) · [FAQ](./faq.md) |
| Update code written for 0.1 | [Migrating from 0.1](./getting-started/migrating-from-0.1.md) |
| Cite ferrifuzz in a report or thesis | [Cite & license](./cite-license.md) |
