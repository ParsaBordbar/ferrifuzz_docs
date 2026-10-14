---
title: 'Installation'
sidebar_label: 'Installation'
description: 'Install the ferrifuzz Python package from TestPyPI, add the optional numpy and matplotlib extras, or use the Rust crate.'
---

# Installation

## Python

Ferrifuzz needs **Python 3.9 or newer** on Windows (x64), macOS (Intel or Apple Silicon) or
Linux (x86_64 / ARM64, glibc 2.17+). Wheels are prebuilt (one `abi3` wheel per platform covers
every Python version from 3.9 up), so you do **not** need a Rust toolchain.

The 0.2.0 pre-release is published on **TestPyPI** while the API settles. Install it into a
fresh virtual environment:

```bash
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
python -m pip install --upgrade pip
pip install -i https://test.pypi.org/simple/ "ferrifuzz==0.2.0"
```

Or with [uv](https://docs.astral.sh/uv/):

```bash
uv venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
uv pip install -i https://test.pypi.org/simple/ "ferrifuzz==0.2.0"
```

:::note Why TestPyPI?
TestPyPI is a sandbox copy of PyPI. Installing from it only changes where `pip` looks for
`ferrifuzz`; the package itself is the same. Once the library is published to the real
PyPI, the command becomes plain `pip install ferrifuzz`.
:::

### Optional extras

Ferrifuzz has **no required dependencies**. Two optional ones unlock extra features:

| Package | What it enables | Without it |
|---|---|---|
| `numpy` | `compute_batch`, `output_set` and `mf.membership(array)` return NumPy arrays | they return plain lists |
| `matplotlib` (+ numpy) | the `ferrifuzz.plot` helpers (`plot_variable`, `plot_surface`, ...) | `ferrifuzz.plot` raises a clear `ImportError` when called |

numpy and matplotlib are not on TestPyPI, so install them from the regular PyPI first, then
ferrifuzz from TestPyPI:

```bash
pip install numpy matplotlib
pip install -i https://test.pypi.org/simple/ "ferrifuzz==0.2.0"
```

Installing them separately keeps TestPyPI from supplying anything except ferrifuzz itself.
After the PyPI release the extras work in one step: `pip install "ferrifuzz[plot]"` (numpy +
matplotlib), `ferrifuzz[numpy]` or `ferrifuzz[all]`.

### Troubleshooting

- **`ferrifuzz==0.1.0 depends on Python>=3.13`** or **`No matching distribution found`**:
  you are not getting 0.2.0. Keep the `==0.2.0` pin, run `python -m pip install --upgrade pip`,
  and with uv add `--refresh` so it re-reads the index instead of a cached copy.
- **`No module named ferrifuzz`** after installing: the virtual environment is not active in
  this terminal (or in your editor's interpreter setting). Activate it and check with
  `python -c "import sys; print(sys.prefix)"`.
- **Python older than 3.9**: `python --version`; install a newer Python (or `uv venv -p 3.12`).
- **Windows ARM, Alpine/musl Linux or PyPy**: no prebuilt wheel yet. Please report it; you can
  build from source (see below).

### Check the install

```python
import ferrifuzz as ff
print(ff.__version__)    # 0.2.0
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
