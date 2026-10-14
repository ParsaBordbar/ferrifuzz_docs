---
title: 'How to cite & license'
sidebar_label: 'Cite & License'
description: 'How to cite ferrifuzz (BibTeX and plain text), and what the Apache-2.0 license and NOTICE file require.'
---

# How to cite & license

## Citing ferrifuzz

If you use ferrifuzz in research, coursework or a thesis, please cite it. The repository
contains a `CITATION.cff` file with the canonical metadata; GitHub's **"Cite this
repository"** button reads it once the repository is public.

### BibTeX

```bibtex
@software{bordbar_ferrifuzz_2026,
  author    = {Bordbar, Parsa},
  title     = {ferrifuzz: fast fuzzy logic for Python and Rust},
  version   = {0.2.0},
  year      = {2026},
  month     = oct,
  date      = {2026-10-04},
  license   = {Apache-2.0},
  url       = {https://github.com/ParsaBordbar/ferrifuzz},
  keywords  = {fuzzy logic, fuzzy inference, interval type-2 fuzzy sets, fuzzy time series, rust, python}
}
```

With classic BibTeX styles that don't know `@software`, use `@misc` with the same fields
and add `howpublished = {\url{https://github.com/ParsaBordbar/ferrifuzz}}`.

### Plain text

> Bordbar, P. (2026). *ferrifuzz: fast fuzzy logic for Python and Rust* (Version 0.2.0)
> [Computer software]. https://github.com/ParsaBordbar/ferrifuzz

Please cite the **version you used** (`import ferrifuzz; ferrifuzz.__version__`) so your
results can be reproduced.

### Citing the methods

Ferrifuzz implements published methods. When your work depends on one, cite the original
paper as well:

| Method | Reference |
|---|---|
| Fuzzy sets | L. A. Zadeh, "Fuzzy sets," *Information and Control*, 8(3), 1965. |
| Mamdani inference | E. H. Mamdani and S. Assilian, "An experiment in linguistic synthesis with a fuzzy logic controller," *Int. J. Man‑Machine Studies*, 7(1), 1975. |
| Sugeno / TSK inference | T. Takagi and M. Sugeno, "Fuzzy identification of systems and its applications to modeling and control," *IEEE Trans. SMC*, 15(1), 1985. |
| Karnik–Mendel type reduction | N. N. Karnik and J. M. Mendel, "Centroid of a type‑2 fuzzy set," *Information Sciences*, 132, 2001. |
| Fuzzy time series | Q. Song and B. S. Chissom, "Fuzzy time series and its models," *Fuzzy Sets and Systems*, 54(3), 1993. |
| Chen's FTS method | S.‑M. Chen, "Forecasting enrollments based on fuzzy time series," *Fuzzy Sets and Systems*, 81(3), 1996. |

## License

Ferrifuzz is licensed under the **Apache License, Version 2.0**
([full text](https://www.apache.org/licenses/LICENSE-2.0)). In short, you may use, modify
and redistribute it, including in commercial and closed‑source work, provided that you:

- include a copy of the license with any redistribution;
- keep the copyright and attribution notices, including the **`NOTICE`** file;
- state clearly that you changed files, if you distribute modified versions.

The license comes with no warranty and grants a patent license from contributors.

### The NOTICE file

Section 4(d) of the license requires redistributions to carry the `NOTICE` file (or its
attribution text). Its content is:

```text
ferrifuzz
Copyright 2025-2026 Parsa Bordbar and the ferrifuzz contributors
https://github.com/ParsaBordbar/ferrifuzz

This product includes software developed by Parsa Bordbar (parsab71@gmail.com).
```

Using ferrifuzz as a dependency of your own project (for example `pip install` in a course
assignment) is not redistribution and needs no action. Citing it in your report is still
appreciated.

This documentation site is part of the ferrifuzz project and is covered by the same
license.
