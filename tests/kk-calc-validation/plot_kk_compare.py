"""
Overlay persisted dispersive ``delta`` from an Atlas NEXAFS CSV export (TS / DB column) versus
``delta`` recomputed by kkcalc2 from the same CSV ``beta`` column using stoichiometry and mass
density (Ben Watts pipeline: ``refractive_to_ASF`` → ``KK_PP`` → ``ASF_to_refractive``).

Residual row: ``delta_kkcalc − delta_CSV`` on identical ``energy_eV`` samples (no discrete KK
recompute on the TS side — the CSV ``delta`` is source of truth for what was stored).
"""

from __future__ import annotations

import argparse
import csv
import json
import subprocess
import sys
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np


_VALIDATION_DIR = Path(__file__).resolve().parent
_REPO_ROOT = _VALIDATION_DIR.parent.parent
_DEFAULT_CSV = (
    _REPO_ROOT
    / "src"
    / "features"
    / "kk-calc"
    / "__fixtures__"
    / "nexafs-experiment-30539a6a-pol-86906b55-th55-ph0.csv"
)

_DEFAULT_FORMULA = "C72H14O2"
_DEFAULT_DENSITY = 1.0


def load_csv_energy_beta_delta(path: Path) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    with path.open(encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames is None:
            raise ValueError("CSV has no header row")
        lower = {h.lower(): h for h in reader.fieldnames}
        for req in ("energy_ev", "beta", "delta"):
            if req not in lower:
                raise ValueError(f'CSV must include column for "{req}"')
        e_col = lower["energy_ev"]
        b_col = lower["beta"]
        d_col = lower["delta"]
        e_list: list[float] = []
        b_list: list[float] = []
        d_list: list[float] = []
        for row in reader:
            e_list.append(float(row[e_col]))
            b_list.append(float(row[b_col]))
            d_list.append(float(row[d_col]))
    e = np.asarray(e_list, dtype=np.float64)
    b = np.asarray(b_list, dtype=np.float64)
    d = np.asarray(d_list, dtype=np.float64)
    if e.size < 4 or e.size != b.size or e.size != d.size:
        raise ValueError("energy_eV, beta, delta must be parallel arrays with length ≥ 4")
    if not np.all(np.isfinite(e)) or not np.all(np.isfinite(b)) or not np.all(np.isfinite(d)):
        raise ValueError("columns must be finite")
    if not np.all(np.diff(e) > 0):
        raise ValueError("energy_eV must be strictly ascending")
    return e, b, d


def run_kkcalc_delta_optical_beta(
    csv_path: Path,
    formula: str,
    density: float,
) -> np.ndarray:
    r = subprocess.run(
        [
            "uv",
            "run",
            "python",
            "run_reference.py",
            "kkcalc-delta-optical-beta",
            "--csv",
            str(csv_path),
            "--formula",
            formula,
            "--density",
            str(density),
        ],
        cwd=str(_VALIDATION_DIR),
        check=False,
        capture_output=True,
        text=True,
    )
    if r.returncode != 0:
        msg = r.stderr.strip() or r.stdout.strip() or f"exit {r.returncode}"
        raise RuntimeError(f"kkcalc-delta-optical-beta failed: {msg}")
    data = json.loads(r.stdout)
    return np.asarray(data["delta"], dtype=np.float64)


def plot_comparison(
    csv_path: Path,
    out_path: Path,
    formula: str,
    density: float,
) -> None:
    energy_ev, _beta, delta_csv = load_csv_energy_beta_delta(csv_path)
    delta_kkcalc = run_kkcalc_delta_optical_beta(csv_path, formula, density)
    if delta_kkcalc.shape != energy_ev.shape:
        raise RuntimeError(
            f"length mismatch: energy {energy_ev.size}, kkcalc delta {delta_kkcalc.size}",
        )

    residual = delta_kkcalc - delta_csv
    residual_alt = delta_kkcalc + delta_csv

    fig, axes = plt.subplots(
        2,
        1,
        sharex=True,
        figsize=(7.5, 6.5),
        layout="constrained",
    )
    ax0, ax1 = axes[0], axes[1]
    axkk = ax0.twinx()

    ax0.plot(
        energy_ev,
        delta_csv,
        color="C0",
        lw=1.2,
        ls="--",
        label=r"Atlas $\delta$ (CSV / TS persisted)",
    )
    axkk.plot(
        energy_ev,
        delta_kkcalc,
        color="0.15",
        lw=1.2,
        label=(
            rf"kkcalc2 $\delta$ from $\beta$ ({formula}, "
            rf"$\rho$={density:g} g/cm$^3$)"
        ),
    )
    ax0.plot(
        energy_ev,
        -delta_csv,
        color="C1",
        lw=1.2,
        ls="--",
        label=r"Atlas $-\delta$ (CSV / TS persisted)",
    )
    ax0.set_ylabel(r"$\delta$")
    ax0.legend(frameon=False, fontsize=8)
    ax0.set_title(csv_path.name)

    ax1.plot(energy_ev, residual, color="C3", lw=1.0)
    ax1.plot(energy_ev, residual_alt, color="C4", lw=1.0)
    ax1.axhline(0.0, color="0.5", lw=0.6, ls=":")
    ax1.set_xlabel("Energy (eV)")
    ax1.set_ylabel(r"$\delta_{\mathrm{kkcalc}} - \delta_{\mathrm{CSV}}$")

    fig.suptitle(
        "KK comparison: persisted TS delta vs kkcalc2 delta recomputed from optical beta",
        fontsize=10,
    )
    fig.savefig(out_path, dpi=200)


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument(
        "--csv",
        type=Path,
        default=_DEFAULT_CSV,
        help=f"path to NEXAFS CSV with energy_eV, beta, delta (default: {_DEFAULT_CSV.relative_to(_REPO_ROOT)})",
    )
    p.add_argument(
        "--out",
        type=Path,
        default=None,
        help="output PNG path (default: kk_compare_<csv-stem>.png beside this script)",
    )
    p.add_argument("--formula", type=str, default=_DEFAULT_FORMULA)
    p.add_argument("--density", type=float, default=_DEFAULT_DENSITY)
    ns = p.parse_args(argv)

    csv_path = ns.csv.resolve()
    if not csv_path.is_file():
        print(f"CSV not found: {csv_path}", file=sys.stderr)
        return 1

    out_path = ns.out
    if out_path is None:
        out_path = _VALIDATION_DIR / f"kk_compare_{csv_path.stem}.png"
    else:
        out_path = out_path.resolve()

    plot_comparison(csv_path, out_path, ns.formula, float(ns.density))
    print(str(out_path))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
