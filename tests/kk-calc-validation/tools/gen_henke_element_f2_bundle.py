"""
Emit `src/features/kk-calc/kkcalc-henke-element-f2.bundle.json` from LBL CXRO Henke `.nff` tables
(`https://henke.lbl.gov/optical_constants/sf/<element>.nff`), matching `~/lib/henke-nff-cxro.ts` and
`~/server/utils/cxro.ts` so KK tail extension and bare-atom step-edge overlays share one database.

Subsampling keeps client bundle size bounded while preserving tabulated edge structure.
Run from repo root (requires network):

    uv run python tests/kk-calc-validation/tools/gen_henke_element_f2_bundle.py

When the output JSON already exists, its element keys are refreshed in-place (same coverage as the
previous bundle). Otherwise the bundled default element list (92 symbols) is used.
"""

from __future__ import annotations

import json
import re
import urllib.error
import urllib.request
from pathlib import Path

_ENERGY_LEAD = re.compile(r"^[-+]?\d")

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "src/features/kk-calc/kkcalc-henke-element-f2.bundle.json"
CXRO_BASE = "https://henke.lbl.gov/optical_constants/sf"

DEFAULT_ELEMENT_SYMBOLS: tuple[str, ...] = (
    "Ac",
    "Ag",
    "Al",
    "Ar",
    "As",
    "At",
    "Au",
    "B",
    "Ba",
    "Be",
    "Bi",
    "Br",
    "C",
    "Ca",
    "Cd",
    "Ce",
    "Cl",
    "Co",
    "Cr",
    "Cs",
    "Cu",
    "Dy",
    "Er",
    "Eu",
    "F",
    "Fe",
    "Fr",
    "Ga",
    "Gd",
    "Ge",
    "H",
    "He",
    "Hf",
    "Hg",
    "Ho",
    "I",
    "In",
    "Ir",
    "K",
    "Kr",
    "La",
    "Li",
    "Lu",
    "Mg",
    "Mn",
    "Mo",
    "N",
    "Na",
    "Nb",
    "Nd",
    "Ne",
    "Ni",
    "O",
    "Os",
    "P",
    "Pa",
    "Pb",
    "Pd",
    "Pm",
    "Po",
    "Pr",
    "Pt",
    "Ra",
    "Rb",
    "Re",
    "Rh",
    "Rn",
    "Ru",
    "S",
    "Sb",
    "Sc",
    "Se",
    "Si",
    "Sm",
    "Sn",
    "Sr",
    "Ta",
    "Tb",
    "Tc",
    "Te",
    "Th",
    "Ti",
    "Tl",
    "Tm",
    "U",
    "V",
    "W",
    "Xe",
    "Y",
    "Yb",
    "Zn",
    "Zr",
)


def load_nff_from_cxro(symbol: str) -> tuple[list[float], list[float]]:
    stem = symbol.strip()
    if not stem:
        raise ValueError("empty element symbol")
    url = f"{CXRO_BASE}/{stem.lower()}.nff"
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "xray-atlas-henke-bundle-gen/1.0"},
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        text = resp.read().decode("utf-8")
    e_list: list[float] = []
    f2_list: list[float] = []
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.upper().startswith("E(") or line.lower().startswith("energy"):
            continue
        parts = line.split()
        if len(parts) < 3 or not _ENERGY_LEAD.match(parts[0]):
            continue
        ev = float(parts[0])
        f2 = float(parts[2])
        e_list.append(ev)
        f2_list.append(f2)
    if not e_list:
        raise RuntimeError(f"no rows parsed for {url}")
    return e_list, f2_list


def subsample(e: list[float], f2: list[float], max_points: int) -> tuple[list[float], list[float]]:
    n = len(e)
    if n <= max_points:
        return e, f2
    idx = sorted({round(i * (n - 1) / (max_points - 1)) for i in range(max_points)})
    return [e[i] for i in idx], [f2[i] for i in idx]


def main() -> None:
    symbol_set: set[str] = set(DEFAULT_ELEMENT_SYMBOLS)
    if OUT.exists():
        try:
            prev = json.loads(OUT.read_text(encoding="utf-8"))
            if isinstance(prev, dict) and prev:
                symbol_set |= {str(k) for k in prev}
        except (json.JSONDecodeError, OSError, TypeError):
            pass
    symbols = sorted(symbol_set, key=lambda s: (len(s), s))

    out: dict[str, dict[str, list[float]]] = {}
    for sym in symbols:
        try:
            e, f2 = load_nff_from_cxro(sym)
        except (urllib.error.HTTPError, urllib.error.URLError, ValueError, RuntimeError) as ex:
            print(f"skip {sym}: {ex}")
            continue
        e, f2 = subsample(e, f2, max_points=10_000)
        out[sym] = {"energiesEv": e, "f2": f2}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {OUT} ({len(out)} elements)")


if __name__ == "__main__":
    main()
