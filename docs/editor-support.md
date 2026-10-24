---
title: 'Editor support (VS Code)'
sidebar_label: 'Editor Support'
description: 'The ferrifuzz VS Code extension: completion, checks and highlighting inside fuzzy rule strings, snippets for the whole API, and a Python interpreter check.'
keywords: ['ferrifuzz vs code extension', 'visual studio code', 'rule highlighting']
---

# Editor support (VS Code)

The **Ferrifuzz** VS Code extension helps you write rules and catches mistakes as you type:

- **Rule completion**: variables, terms, hedges and keywords inside rule strings.
- **Rule checks**: unknown terms, misspelled variables and inputs / outputs on the wrong side
  of `THEN`, with "did you mean" quick fixes.
- **Rule highlighting**: keywords, variables, `NOT`, hedges and terms each get their own color.
- **Snippets** for every part of the API, with dropdowns for method names.
- **Interpreter check**: a warning when VS Code's Python has no ferrifuzz, so completions
  can't work.

Hover docs and completion of the API itself (`ff.`, `system.compute(`, `defuzz_method="` →
`centroid`, ...) need no extension: they come from the type stubs shipped with the `ferrifuzz`
package, in VS Code (Pylance), PyCharm and Jupyter.

## Install

Search for **Ferrifuzz** in the Extensions view, or:

- VS Code: [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=ParsaBordbar2003.ferrifuzz), or `code --install-extension ParsaBordbar2003.ferrifuzz`
- Cursor, VSCodium, Windsurf: [Open VSX](https://open-vsx.org/?search=ferrifuzz)

It needs the Python extension and ferrifuzz 0.2.0 or newer in the interpreter VS Code uses
(`pip install ferrifuzz`).

## Rule completion and checks

Inside a rule string the editor suggests what can come next, read from the `ff.Variable(...)`
definitions, `var["term"] = ...` / `.automf(...)` terms and `add_input` / `add_output` calls in
the same file. Type a space to see the next suggestions:

| After | Suggests |
|---|---|
| `IF` / `AND` / `OR` / `(` | input variables |
| `THEN` / `AND` after `THEN` | output variables |
| a variable | `IS` |
| `IS` / `IS NOT` | that variable's terms, `NOT`, hedges |
| a hedge | that variable's terms |
| a term | `AND` `OR` `THEN` before `THEN`; `AND` `WITH` after |

Rule strings that go into a system in the same file (`system += "..."`, `add_rule`,
`add_rules`) are checked as you type:

<!-- skip-check -->
```python
system += "IF service IS excelent THEN tip IS high"   # 'service' has no term 'excelent'. Did you mean 'excellent'?
system += "IF servise IS good THEN tip IS medium"     # Unknown variable 'servise'. Did you mean 'service'?
system += "IF tip IS low THEN service IS good"        # 'tip' is an output; before THEN use an input
```

Press <kbd>Cmd</kbd>/<kbd>Ctrl</kbd>+<kbd>.</kbd> on a "did you mean" warning to apply the fix.
The checks stay quiet about anything the file does not pin down: variables imported from
another module, terms added in a loop, rules parsed on their own with `Rule.from_string`.

## Interpreter check

Completions and hover docs come from the installed package, so they only work when the
interpreter selected in VS Code has ferrifuzz. When a file imports ferrifuzz and that
interpreter has none, or a version older than 0.2.0, a warning offers **Use .venv** (when the
project's `.venv` has ferrifuzz) or **Select Interpreter**. Run *Ferrifuzz: Check Interpreter
for Completions* from the Command Palette to check at any time.

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
