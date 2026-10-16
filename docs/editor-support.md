---
title: 'Editor support (VS Code)'
sidebar_label: 'Editor Support'
description: 'The ferrifuzz VS Code extension: rule-string highlighting inside Python, snippets for the whole API, and how to install it from a .vsix file.'
---

# Editor support (VS Code)

The **Ferrifuzz** VS Code extension makes rule strings readable and saves typing:

- **Rule highlighting**: inside Python strings, rule keywords, variables, `NOT`, hedges and
  terms each get their own color.
- **Snippets** for every part of the API, with dropdowns for method names.

Method‑name arguments (`defuzz_method=`, `and_method=`, ...) also autocomplete without the
extension, through the type stubs shipped with the `ferrifuzz` package (Pylance/Pyright).

## Install

The extension is not on the VS Code Marketplace yet. Install it from the `.vsix` package
built from the ferrifuzz repository:

```bash
cd editors/vscode
npm install
npm run package                                  # → ferrifuzz-vscode-<version>.vsix
code --install-extension ferrifuzz-vscode-*.vsix
```

If you were given a ready-made `ferrifuzz-vscode-0.2.0.vsix` (for example by your
instructor), skip the build: run `code --install-extension ferrifuzz-vscode-0.2.0.vsix`,
or in VS Code open the Extensions view, click **⋯ → Install from VSIX…** and pick the file.
Reload the window afterwards.

## Rule highlighting

Rule strings inside Python are highlighted: keywords, variables, `NOT`, hedges, terms,
parentheses and `WITH` weights each get their own color.

<!-- skip-check -->
```python
system += "IF temp IS NOT very hot OR hum IS high THEN fan IS slow AND alarm IS on"
system += "if (temp is hot or temp is very warm) and wind is calm then fan is fast with 0.8"

RULES = """
IF service IS poor THEN tip IS low
IF service IS excellent THEN tip IS high
"""
```

A string (or a line of a triple‑quoted string) counts as a rule only if it **starts with
`IF <var> IS`**, optionally with an opening parenthesis (`IF (<var> IS ...`), and contains
`THEN` later on. Keywords are matched in any case, like the parser does. Ordinary strings,
docstrings and f‑strings keep their normal color.

| Part | TextMate scope |
|---|---|
| `IF`, `THEN` | `keyword.control.conditional.ferrifuzz` |
| `AND`, `OR` | `keyword.operator.logical.ferrifuzz` |
| `IS`, `WITH` | `keyword.operator.word.ferrifuzz` |
| weight number | `constant.numeric.ferrifuzz` |
| `(`, `)` | `punctuation.section.parens.ferrifuzz` |
| `NOT` | `keyword.operator.logical.negation.ferrifuzz` |
| variable | `variable.other.input.ferrifuzz` |
| hedge (`very`, `somewhat`, ...) | `storage.modifier.hedge.ferrifuzz` |
| term | `entity.name.type.term.ferrifuzz` |

If your theme makes the colors too subtle, override them in `settings.json`:

```json
"editor.tokenColorCustomizations": {
  "textMateRules": [
    { "scope": "entity.name.type.term.ferrifuzz", "settings": { "foreground": "#C586C0" } },
    { "scope": "storage.modifier.hedge.ferrifuzz", "settings": { "fontStyle": "italic" } }
  ]
}
```

## Snippets

Type a prefix in a Python file and press <kbd>Tab</kbd>. Placeholders let you
<kbd>Tab</kbd> through the parameters; method names (t‑norms, defuzzifiers, type
reduction, ...) are offered as dropdowns. There are 33 snippets:

| Prefix | Inserts |
|---|---|
| `ffimport` | `import ferrifuzz as ff` |
| `ffmamdani` | complete Mamdani system (operator and defuzzifier pickers) |
| `ffsugeno` | complete Sugeno/TSK system with a linear consequent |
| `ffit2sys` | complete interval type‑2 system with an FOU helper and `compute_interval` |
| `ffvar` | variable with low/medium/high terms |
| `ffautovar` | `ff.Variable(...).automf(3 \| 5 \| 7, shape=...)` |
| `ffterm` | `var["term"] = ff.mf.triangle(...)` |
| `fftri` `fftrap` `ffgauss` `ffbell` `ffsig` `ffsingleton` `ffit2` | membership functions |
| `ffrule` `ffrule2` `ffrules` `ffruleobj` | one rule, two‑clause rule, rule list, weighted `Rule(...)` |
| `ffcompute` `ffbatch` `ffloop` | one row, a NumPy column, a closed‑loop simulation with `evaluate` |
| `ffvalidate` `fftry` `ffstrengths` | list errors/warnings, catch `ModelError`/`InputError`, print rule firing strengths |
| `ffhedge` `ffand` `ffor` | hedge / t‑norm / t‑conorm on raw degrees |
| `ffplotvar` `ffplotout` `ffplotcurve` `ffsurface` `ffshow` | `ferrifuzz.plot`: terms, output set, response curve, 3‑D surface, `plt.show()` |
| `fffts` | fuzzy time series forecast + `evaluate` on the Alabama enrollment data |

The plotting snippets need matplotlib (`pip install "ferrifuzz[plot]"`).
