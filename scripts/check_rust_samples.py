"""Compile every ```rust block in docs/ against the ferrifuzz crate.

    python scripts/check_rust_samples.py [path/to/ferrifuzz/crates/ferrifuzz]

Each block becomes an example in a scratch crate. A block without `fn main` is wrapped in
`fn main() -> Result<(), Box<dyn std::error::Error>> { ...; Ok(()) }` with the prelude
imported. Blocks after `<!-- skip-check -->` are skipped (signature listings).
Examples are also run, so a panic or an `Err` from `main` fails the check.
"""

import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

FENCE = re.compile(r"```rust[^\n]*\n(.*?)```", re.S)


def wrap(code: str) -> str:
    if "fn main" in code:
        return code if "use ferrifuzz" in code else "#[allow(unused_imports)]\nuse ferrifuzz::prelude::*;\n" + code
    uses = "\n".join(l for l in code.splitlines() if l.startswith("use "))
    body = "\n".join(l for l in code.splitlines() if not l.startswith("use "))
    body = re.sub(r"^#\s*Ok::<.*$", "", body, flags=re.M)
    return (f"#![allow(unused)]\nuse ferrifuzz::prelude::*;\n{uses}\n\n"
            f"fn main() -> Result<(), Box<dyn std::error::Error>> {{\n{body}\n    Ok(())\n}}\n")


def main():
    docs = Path("docs")
    crate = Path(sys.argv[1] if len(sys.argv) > 1 else "../ferrifuzz/crates/ferrifuzz").resolve()
    work = Path(tempfile.mkdtemp(prefix="ff-rust-docs-"))
    (work / "src").mkdir()
    (work / "src" / "lib.rs").write_text("")
    (work / "examples").mkdir()
    (work / "Cargo.toml").write_text(
        f'[package]\nname = "docs-check"\nversion = "0.0.0"\nedition = "2021"\npublish = false\n\n'
        f'[dependencies]\nferrifuzz = {{ path = "{crate}" }}\n')
    names = {}
    for page in sorted(docs.rglob("*.md")):
        text = page.read_text()
        for i, m in enumerate(FENCE.finditer(text)):
            before = text[: m.start()].rstrip().splitlines()[-1:] or [""]
            if "skip-check" in before[0]:
                continue
            name = re.sub(r"\W", "_", f"{page.relative_to(docs).with_suffix('')}_{i}")
            (work / "examples" / f"{name}.rs").write_text(wrap(m.group(1)))
            names[name] = f"{page}#{i}"
    ok = True
    r = subprocess.run(["cargo", "build", "--examples", "--quiet"], cwd=work, capture_output=True, text=True)
    if r.returncode != 0:
        ok = False
        for err in re.findall(r"(error(?:\[E\d+\])?: .*?\n\s*--> examples/(\w+)\.rs:(\d+))", r.stderr):
            print(f"COMPILE {names.get(err[1], err[1])} line {err[2]}: {err[0].splitlines()[0]}")
    else:
        for name, where in names.items():
            run = subprocess.run(["cargo", "run", "--quiet", "--example", name], cwd=work, capture_output=True, text=True)
            if run.returncode != 0:
                ok = False
                print(f"RUN     {where}: {(run.stderr.strip().splitlines() or ['?'])[-1]}")
    print(f"{len(names)} rust blocks checked: {'all ok' if ok else 'FAILED'}")
    shutil.rmtree(work, ignore_errors=True)
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
