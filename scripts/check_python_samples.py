"""Run every ```python block in docs/ against the installed ferrifuzz.

    python scripts/check_python_samples.py [docs]   # use the Python env that has ferrifuzz

Blocks on one page share a namespace, in order. A block followed directly by a ```text block
is treated as "code + expected output": printed stdout must match it (whitespace-trimmed,
lines compared; '...' at the end of a line matches anything after it).

Inline expectations are checked too: a single-line `print(x)  # 59.88...` or a bare expression
`ff.Hedge.very()(0.8)  # 0.64` compares the printed value (str for print, repr for an
expression) with the comment, when the comment starts like a value (number, [, {, (, quote,
True/False/None). Numbers match to the precision written; '...' ends the comparison.

Conventions (invisible to readers):
* `<!-- skip-check -->` on the line before a block skips it (signature listings).
* A block that raises passes when the ```text block after it (or a `# SomeError: message`
  comment inside it) names the exception — an error-message demo; the first line of the
  message must match ('...' allowed).
"""

import contextlib
import io
import os
import re
import sys
import traceback
from pathlib import Path

os.environ.setdefault("MPLBACKEND", "Agg")
FENCE = re.compile(r"```(python|text)[^\n]*\n(.*?)```", re.S)
VALUE_START = re.compile(r"""^(-?\d|\[|\{|\(|'|"|True|False|None|array\()""")
NUM = re.compile(r"-?\d+(?:\.\d+)?(?:e[-+]?\d+)?")


ANNOTATION = re.compile(r"\s{2,}|\s+(?:→|->|=)\s|\s+\((?=[A-Za-z|])")
PROSE_WORD = re.compile(r"(?<!['\"\w])(?!(?:True|False|None|array|nan|inf)\b)[A-Za-z]{2,}")


def expected_value(comment: str) -> str | None:
    """The value part of a comment, or None when the comment is prose / symbolic."""
    m = ANNOTATION.search(comment)
    value = comment[: m.start()] if m else comment
    unquoted = re.sub(r"'[^']*'|\"[^\"]*\"", "", value)
    if PROSE_WORD.search(unquoted):
        return None
    if not NUM.search(value) and not re.search(r"True|False|None|'|\"", value):
        return None
    return value.strip()


def values_match(expected: str, got: str) -> bool:
    """Compare a comment like "{'fan': 59.88...}" with an actual printed value.

    A number written with '...' after it is a truncation (digits must be a prefix); other
    numbers are compared to the precision written.
    """
    exp = expected.strip()
    cut = exp.rfind("...")
    trailing = cut >= 0 and exp[cut + 3:].strip() in ("", ")", "]", "}")
    exp_head = exp[:cut] if trailing else exp
    exp_nums = [(m.group(), exp_head[m.end():m.end() + 3] == "...") for m in NUM.finditer(exp_head)]
    if cut >= 0 and trailing and exp_nums:
        exp_nums[-1] = (exp_nums[-1][0], True)
    got_nums = NUM.findall(got)
    if len(got_nums) < len(exp_nums):
        return False
    for (e, truncated), g in zip(exp_nums, got_nums):
        decimals = len(e.split(".")[1]) if "." in e and "e" not in e else 0
        step = 10 ** (-decimals)
        if "e" in e:
            ok = abs(float(e) - float(g)) <= abs(float(e)) * 1e-3
        elif truncated:
            ok = abs(float(g) - float(e)) < step + 1e-12 and (float(g) - float(e)) * (1 if float(e) >= 0 else -1) >= -1e-12
        else:
            ok = abs(float(e) - float(g)) <= 0.5 * step + 1e-12
        if not ok:
            return False
    skel = lambda t: re.sub(r"\s+", "", NUM.sub("#", t)).replace("...", "")  # noqa: E731
    es, gs = skel(exp_head), skel(got)
    return gs.startswith(es) if (trailing or len(exp_nums) < len(got_nums)) else es == gs


def instrument(code: str) -> str:
    """Wrap `print(x)  # value` and `expr  # value` lines so their values are checked."""
    out = []
    for n, line in enumerate(code.splitlines(), 1):
        m = re.match(r"^(\s*)(.+?)\s{2,}#\s*(.+)$", line)
        if not m or not VALUE_START.match(m.group(3)) or m.group(2).rstrip().endswith((",", "(", "[", "{")):
            out.append(line)
            continue
        indent, stmt, comment = m.groups()
        expected = expected_value(comment)
        if expected is None:
            out.append(line)
            continue
        pm = re.match(r"^print\((.*)\)$", stmt)
        try:
            if pm:
                compile(f"__chk_print({pm.group(1)})", "", "eval")
                out.append(f"{indent}__chk_print({pm.group(1)}, __expected={expected!r}, __line={n})")
            else:
                compile(stmt, "", "eval")
                out.append(f"{indent}__chk_expr(({stmt}), __expected={expected!r}, __line={n})")
        except SyntaxError:
            out.append(line)
    return "\n".join(out)


def lines_match(expected: str, got: str) -> bool:
    exp = [l.rstrip() for l in expected.strip().splitlines()]
    out = [l.rstrip() for l in got.strip().splitlines()]
    if len(exp) != len(out):
        return False
    for e, o in zip(exp, out):
        if e.endswith("..."):
            if not o.startswith(e[:-3]):
                return False
        elif e != o:
            return False
    return True


def check_page(path: Path) -> list[str]:
    if "matplotlib.pyplot" in sys.modules:  # each page starts with no open figures
        sys.modules["matplotlib.pyplot"].close("all")
    text = path.read_text()
    blocks = [(m.group(1), m.group(2), m.end(), m.start()) for m in FENCE.finditer(text)]
    problems = []

    def chk_print(*vals, __expected, __line):
        got = " ".join(str(v) for v in vals)
        print(got)
        if not values_match(__expected, got):
            problems.append(f"line {__line}: printed {got[:120]!r}, comment says {__expected!r}")

    def chk_expr(val, __expected, __line):
        got = repr(val)
        if not values_match(__expected, got):
            problems.append(f"line {__line}: value {got[:120]!r}, comment says {__expected!r}")

    ns: dict = {"__name__": "__doc__", "__chk_print": chk_print, "__chk_expr": chk_expr}
    for i, (lang, code, end, _) in enumerate(blocks):
        if lang != "python":
            continue
        before = text[: blocks[i][3]].rstrip().splitlines()[-1:] or [""]
        if "skip-check" in before[0]:
            continue
        nxt = blocks[i + 1] if i + 1 < len(blocks) else None
        expected = nxt[1] if nxt and nxt[0] == "text" and text[end:nxt[3]].strip() == "" else None
        expect_error = expected is not None and re.search(r"\b\w*Error\b", expected) is not None
        comment_error = re.search(r"^\s*#\s*((?:\w+\.)*\w*Error: .+)$", code, re.M)
        if not expect_error and comment_error:
            expect_error, expected = True, comment_error.group(1)
        out = io.StringIO()
        try:
            with contextlib.redirect_stdout(out):
                exec(compile(instrument(code), f"{path}#{i}", "exec"), ns)
            if expected is not None and not lines_match(expected, out.getvalue()):
                problems.append(f"block {i}: output differs\n--- expected\n{expected.strip()}\n--- got\n{out.getvalue().strip()}")
        except Exception as e:  # noqa: BLE001
            if expect_error:
                got = f"{type(e).__module__}.{type(e).__name__}: {e}".removeprefix("builtins.")
                exp_first = next(l for l in expected.strip().splitlines() if "Error" in l).strip()
                if exp_first.split(":")[0].split(".")[-1] != type(e).__name__ or not any(
                        lines_match(exp_first, cand) for cand in (got.splitlines()[0], got.split(": ", 1)[-1].splitlines()[0])):
                    problems.append(f"block {i}: error differs\n--- expected\n{exp_first}\n--- got\n{got.splitlines()[0]}")
                continue
            tb = traceback.format_exception_only(type(e), e)[-1].strip()
            problems.append(f"block {i}: {tb}")
    return problems


def main():
    root = Path(sys.argv[1] if len(sys.argv) > 1 else "docs")
    bad = 0
    for page in sorted(root.rglob("*.md")):
        problems = check_page(page)
        n = len(FENCE.findall(page.read_text()))
        if problems:
            bad += 1
            print(f"FAIL {page}")
            for p in problems:
                print("   " + p.replace("\n", "\n   "))
        elif n:
            print(f"ok   {page}")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
