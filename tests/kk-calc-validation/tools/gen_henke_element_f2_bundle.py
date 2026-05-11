"""
Emit `src/features/kk-calc/kkcalc-henke-element-f2.bundle.json` from kkcalc2 Henke `.nff` tables.

Subsampling keeps client bundle size bounded while preserving tabulated edge structure.
Run from repo root:

    uv run python tests/kk-calc-validation/tools/gen_henke_element_f2_bundle.py
"""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
NFF_DIR = ROOT / "tests/kk-calc-validation/kkcalc/kkcalc2/asf_database/db_data"
OUT = ROOT / "src/features/kk-calc/kkcalc-henke-element-f2.bundle.json"

SYMBOL_RE = re.compile(r"^([a-z]{1,2})\.nff$")


def load_nff(path: Path) -> tuple[list[float], list[float]]:
    e_list: list[float] = []
    f2_list: list[float] = []
    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("E("):
                continue
            parts = line.split()
            if len(parts) < 3:
                continue
            ev = float(parts[0])
            f2 = float(parts[2])
            e_list.append(ev)
            f2_list.append(f2)
    return e_list, f2_list


def subsample(e: list[float], f2: list[float], max_points: int) -> tuple[list[float], list[float]]:
    n = len(e)
    if n <= max_points:
        return e, f2
    idx = sorted({round(i * (n - 1) / (max_points - 1)) for i in range(max_points)})
    return [e[i] for i in idx], [f2[i] for i in idx]


def main() -> None:
    out: dict[str, dict[str, list[float]]] = {}
    for p in sorted(NFF_DIR.glob("*.nff")):
        m = SYMBOL_RE.match(p.name)
        if not m:
            continue
        raw = m.group(1).lower()
        sym = raw[0].upper() + (raw[1] if len(raw) > 1 else "")
        e, f2 = load_nff(p)
        e, f2 = subsample(e, f2, max_points=10_000)
        out[sym] = {"energiesEv": e, "f2": f2}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {OUT} ({len(out)} elements)")


if __name__ == "__main__":
    main()
