---
title: 'Installation'
sidebar_label: 'Installation'
description: 'Install the ferrifuzz fuzzy logic package for Python with pip or uv (prebuilt wheels for Python 3.9+, no Rust toolchain needed), add the numpy and matplotlib extras, or use the Rust crate.'
keywords: ['install ferrifuzz', 'pip install ferrifuzz', 'fuzzy logic python', 'rust crate']
---

# Installation

## Python

Ferrifuzz needs **Python 3.9 or newer** on Windows (x64), macOS (Intel or Apple Silicon) or
Linux (x86_64 / ARM64, glibc 2.17+). Wheels are prebuilt (one `abi3` wheel per platform covers
every Python version from 3.9 up), so you do **not** need a Rust toolchain.

Install it into a fresh virtual environment:

```bash
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
python -m pip install --upgrade pip
pip install ferrifuzz
```

Or with [uv](https://docs.astral.sh/uv/):

```bash
uv venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
uv pip install ferrifuzz
```

### Optional extras

Ferrifuzz has **no required dependencies**. Two optional ones unlock extra features:

| Package | What it enables | Without it |
|---|---|---|
| `numpy` | `compute_batch`, `output_set` and `mf.membership(array)` return NumPy arrays | they return plain lists |
| `matplotlib` (+ numpy) | the `ferrifuzz.plot` helpers (`plot_variable`, `plot_surface`, ...) | `ferrifuzz.plot` raises a clear `ImportError` when called |

The package defines matching extras:

```bash
pip install "ferrifuzz[plot]"     # numpy + matplotlib
pip install "ferrifuzz[numpy]"    # numpy only
pip install "ferrifuzz[all]"      # everything optional
```

### Troubleshooting

- **`No matching distribution found`** or an old version: check `python --version` (3.9+),
  run `python -m pip install --upgrade pip`, and with uv add `--refresh` so it re-reads the
  index instead of a cached copy.
- **`No module named ferrifuzz`** after installing: the virtual environment is not active in
  this terminal (or in your editor's interpreter setting). Activate it and check with
  `python -c "import sys; print(sys.prefix)"`.
- **Python older than 3.9**: `python --version`; install a newer Python (or `uv venv -p 3.12`).
- **Windows ARM, Alpine/musl Linux or PyPy**: no prebuilt wheel yet. Please report it; you can
  build from source (see below).

### Check the install

```python
import ferrifuzz as ff
print(ff.__version__)    # 0.2.1
```

## Rust

The crate is not on crates.io yet. Add it as a git dependency:

```toml
[dependencies]
ferrifuzz = { git = "https://github.com/ParsaBordbar/ferrifuzz" }
```

The core crate has zero dependencies and does not need Python. See the
[Rust API overview](../rust-api/overview.md).

## Editor support

If you use VS Code, install the ferrifuzz extension to get colored rule strings and
snippets. See [Editor support](../editor-support.md).

## Building from source (contributors)

```bash
git clone https://github.com/ParsaBordbar/ferrifuzz
cd ferrifuzz
uv venv && uv pip install maturin pytest numpy
.venv/bin/maturin develop --release     # builds the Rust extension into .venv
.venv/bin/pytest                        # Python tests
cargo test -p ferrifuzz                 # Rust core tests
```

Next: [build your first system](./first-system.md).
