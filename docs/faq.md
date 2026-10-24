---
title: 'FAQ & troubleshooting'
sidebar_label: 'FAQ'
description: 'Answers to common ferrifuzz questions: installation, error messages, NaN outputs, numpy, interval type-2 settings, Sugeno consequents, fuzzy time series and performance.'
keywords: ['ferrifuzz faq', 'troubleshooting']
---

# FAQ & troubleshooting

## Installation

### `pip install ferrifuzz` installs nothing / an old version

The 0.2.0 demo release is on **TestPyPI**, not PyPI:

```bash
pip install -i https://test.pypi.org/simple/ "ferrifuzz==0.2.0"
```

See [Installation](./getting-started/installation.md).

### Do I need numpy?

No. Ferrifuzz has no required dependencies. With numpy installed, `compute_batch` returns
NumPy arrays and `mf.membership` accepts arrays; without it, `compute_batch` returns plain
lists. matplotlib is only needed for `ferrifuzz.plot`.

### Do I need Rust installed?

No, the wheels are prebuilt. You only need a Rust toolchain to build ferrifuzz from source
or to use the Rust crate.

## Errors

### My 0.1 code raises errors after upgrading

0.2 reports mistakes that 0.1 silently turned into wrong or missing numbers (missing
inputs, misspelled terms, unknown option names, ...). See
[Migrating from 0.1](./getting-started/migrating-from-0.1.md) for the full list and fixes.

### `InputError: missing input ...`

Every input variable registered with `add_input` must be in the dict you pass to
`compute`. Supply it, or remove the input from the system.

### `InputError: unknown input 'servce' (did you mean 'service'?)`

A key in the input dict is not a registered input, usually a typo. Names are case‑sensitive.

### `ModelError: ... input 'service' has no term 'excelent' ...`

A rule refers to a term (or variable) that doesn't exist. The error lists every problem in
the system at once; `print(system.validate())` shows them without raising.

### `FuzzyError: unknown defuzzification method 'centriod'`

A misspelled option. The message lists the valid names; they are also on the
[Python API overview](./python-api/overview.md#string-options).

### My rule string won't parse

Read the caret in the message: it points where parsing stopped. The most common causes are
multi‑word term names (use underscores: `very_high`), a missing `IS`, `NOT` in the wrong
place (it goes right after `IS`), and `OR` after `THEN`. See the table on the
[Rule syntax](./rule-syntax.md#parse-errors) page.

More on errors: [Reading error messages](./getting-started/error-messages.md).

## Results

### Why is an output `nan`?

No rule fired for that output: every rule concluding it has firing strength 0 for this
input. Your rule base has a gap. Add rules (or widen membership functions) so every part
of the input space is covered. `compute_batch` marks such rows with `nan` too.

### Why does an input of 150 behave like 100?

Inputs outside a variable's `[min_value, max_value]` are clamped to the nearest bound by
default. Create the system with `FuzzySystem(clamp_inputs=False)` to evaluate MFs at the
raw value instead. With clamping off, a value far outside the universe may fire no rule
at all.

### Why does `mom`/`som`/`lom` return 62.5 and not exactly the peak?

Mamdani defuzzification samples the output universe on a grid of `resolution + 1` points
(default `resolution=200`). `som`, `lom`, `mom` and `bisector` return grid points;
`centroid` is a sum over the grid. Increase `resolution` for finer results, or use Sugeno
(`defuzz_method="weighted_average"`), which is exact. See
[Defuzzification](./concepts/defuzzification.md).

### My Mamdani output never reaches the ends of the range

That's expected with `centroid`: the center of gravity of a set is always inside it, so an
output term `triangle(20, 25, 30)` alone gives at most 25. If the extremes matter, use
shoulder terms at the ends of the output universe, or Sugeno.

### My IT2 system raises "reduced with type_reduction ... not defuzz"

Interval type‑2 systems don't use `defuzz_method`. They compute a type‑reduced interval
$[y_l, y_r]$ (see `system.compute_interval`) and return its midpoint. Leave
`defuzz_method` at its default and choose how the interval is computed with
`type_reduction="km"` (Karnik–Mendel, default), `"cos"` (center of sets) or `"height"`.
A system becomes IT2 when any variable has an `ff.mf.it2(...)` term (with `type="auto"`)
or when you pass `type="it2"`. See [Interval type‑2](./concepts/interval-type-2.md).

### `ff.mf.it2` raises "are they swapped?"

The argument order is `it2(upper, lower)`: the wider MF first. The lower MF must never be
above the upper one.

### Changing a `Variable` after `add_input` has no effect

`add_input`/`add_output` copy the variable into the system. Modify the variable, then add
it again (it replaces the old one with the same name).

### Sugeno: `ModelError` about `add_consequent`

Linear consequents need a Sugeno system (`FuzzySystem(defuzz_method="sugeno")`), the
output named in `add_consequent` must be registered with `add_output`, and every name in
`coeffs` must be a registered input.

### My fuzzy time series forecasts are flat at the edges

Chen's model forecasts the average of partition centers, so it can never predict beyond
the outermost centers. Values outside the fitted universe are mapped to the nearest edge
partition. If the series trends upward, set a wider universe with `universe=(lo, hi)` or
a larger `margin`. See the [enrollment tutorial](./tutorials/enrollment-forecasting.md).

## Performance

### How fast is it?

A single `compute` call takes roughly **0.6–1.8 µs** for typical course‑sized systems: the
rule base is compiled once, the first time the system runs (and again only after you
change it), so each call just evaluates the compiled rules. Mamdani systems with a high
`resolution` cost more than Sugeno systems, which skip the sampling grid.

### How do I make many evaluations fast?

- **Many independent inputs** (sweeps, surfaces, datasets): use
  `system.compute_batch({...columns...})`. The loop runs in Rust on **all CPU cores**.
- **Simulation loops** where each step depends on the previous one: use
  `system.evaluate([x1, x2])`. It takes the inputs positionally (in `input_names()`
  order) and returns the outputs as a list, skipping dictionary handling, which makes it
  the fastest single call.
- Avoid rebuilding the system inside the loop: build it once, then call it.

<!-- skip-check -->
```python
controller.input_names()                 # ['error', 'd_error']
for step in range(n_steps):
    dq, = controller.evaluate([e, de])   # one output -> one-element list
    ...
```

## Citing and licensing

### How do I cite ferrifuzz in a report or thesis?

See [Cite & license](./cite-license.md) for BibTeX and a plain-text citation.

### Can I use ferrifuzz in my course project / commercial product?

Yes. Ferrifuzz is Apache‑2.0 licensed. If you redistribute it (or a modified version),
keep the `LICENSE` and `NOTICE` files. Details on [Cite & license](./cite-license.md).
