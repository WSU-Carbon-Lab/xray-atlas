"""
CLI entrypoint for kk-calc validation subprocesses invoked from Bun tests.

Subcommands print JSON to stdout so the TypeScript test can parse results without temp files.

**kkcalc2 optical beta + stoichiometry (`kkcalc-delta-optical-beta`)**

Atlas CSV optical-index ``beta`` is converted to imaginary ASF ``f_2`` via
``kkcalc2.conversions.refractive_to_ASF(..., density=<g/cm³>, stoichiometry=<formula>)``,
run through ``KK_PP`` on that grid, then mapped back with ``ASF_to_refractive(f_1 + i f_2, ...)``
with the same density and composition. Printed ``delta`` is the **real part** of the returned
complex refractive component (kkcalc2 convention ``n = 1 - delta + i beta``). ``numberDensity`` in the
JSON metadata is ``density * N_A / formula_mass`` (atoms/cm³).

**kkcalc2 KK_PP (`kkcalc-delta`)**

Fixture ``beta`` is passed to kkcalc2 ``asf_im(..., origin_dtype=KK_Datatype.ASF)`` as tabulated
imaginary atomic scattering factors ``f_2`` on the fixture energies; ``kk_transform`` yields real
``f_1`` on that grid (``KK_PP`` path).

**Dispersive ``delta`` from ``f_1``, ``f_2`` (kkcalc2 v2 conventions)**

``kkcalc2/models/factors.py`` documents (real ASF branch, refractive scaling via
``conversions.ASF_to_refractive``):

    n(E) = 1 - delta(E) + i beta(E)
         = 1 + (n_a r_e lambda^2)/(2 pi) (-f_1 + i f_2)

For a fixed energy and material, ``delta`` and ``beta`` share the same prefactor in ``f_1``, ``f_2``,
so the density-dependent factor cancels in the ratio::

    delta(E) = beta(E) * f_1(E) / f_2(E)

This matches ``ASF_to_refractive`` applied separately to ``f_1`` and ``f_2``: both divide ASF by the
same ``prefactor(E)`` from ``kkcalc2/conversions.py`` ``refractive_to_ASF(..., reverse=True)``.
When ``--number-density`` is set, this CLI instead evaluates ``ASF_to_refractive(energies, f_1 + i f_2, ...)``
and returns the real part (dispersive ``delta`` in absolute kkcalc units).

Atlas fixture ``beta`` is persisted imaginary optical index ``beta`` (see ``computeBetaIndex``); this
validation still feeds it into kkcalc as ASF ``f_2`` for parity with the prior KK_PP wiring. Any
systematic scale mismatch versus optical ``delta`` from discrete KK is therefore interpreted through
that bookkeeping plus TS tail anchoring, not bitwise equality.
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import sys
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path

import numpy as np
from scipy.constants import Avogadro as N_A
from scipy.interpolate import Akima1DInterpolator

from ts_discrete_kk_mirror import discrete_delta_from_beta


def _load_fixture(path: Path) -> tuple[np.ndarray, np.ndarray]:
    data = json.loads(path.read_text(encoding="utf-8"))
    e = np.asarray(data["energyEv"], dtype=np.float64)
    b = np.asarray(data["beta"], dtype=np.float64)
    return e, b


def _load_csv_energy_beta(path: Path) -> tuple[np.ndarray, np.ndarray]:
    """
    Load ascending photon energies and optical ``beta`` from a NEXAFS CSV export.

    Required columns: ``energy_eV``, ``beta`` (names match Atlas CSV exports).
    """
    with path.open(encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames is None:
            raise ValueError("CSV has no header row")
        lower = {h.lower(): h for h in reader.fieldnames}
        if "energy_ev" not in lower or "beta" not in lower:
            raise ValueError('CSV must include "energy_eV" and "beta" columns')
        e_col = lower["energy_ev"]
        b_col = lower["beta"]
        e_list: list[float] = []
        b_list: list[float] = []
        for row in reader:
            e_list.append(float(row[e_col]))
            b_list.append(float(row[b_col]))
    e = np.asarray(e_list, dtype=np.float64)
    b = np.asarray(b_list, dtype=np.float64)
    if e.size < 4:
        raise ValueError("At least four samples are required")
    if e.size != b.size:
        raise ValueError("energy_eV and beta columns must have the same length")
    if not np.all(np.isfinite(e)) or not np.all(np.isfinite(b)):
        raise ValueError("energy_eV and beta must contain only finite numbers")
    if not np.all(np.diff(e) > 0):
        raise ValueError("energy_eV must be strictly ascending")
    return e, b


def _kkcalc_delta_optical_beta_pipeline(
    e: np.ndarray,
    beta_optical: np.ndarray,
    formula: str,
    density_g_per_cm3: float,
) -> tuple[np.ndarray, float]:
    """
    Optical-index ``beta`` to dispersive ``delta`` via kkcalc2 stoichiometry-aware conversions.

    Converts ``beta`` to imaginary ASF ``f_2`` with ``refractive_to_ASF`` (density + formula),
    runs ``KK_PP`` on ``f_2``, then maps ``f_1 + i f_2`` back with ``ASF_to_refractive`` using the
    same density and composition. The returned ``delta`` array is the real part of that complex
    refractive component (kkcalc2 ``conversions`` convention ``n = 1 - delta + i beta``).
    """
    with redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
        from kkcalc2 import conversions
        from kkcalc2.models.factors import KK_Datatype, asf_im
        from kkcalc2.stoich import stoichiometry as kk_stoichiometry

        f2 = conversions.refractive_to_ASF(
            e,
            beta_optical,
            density=float(density_g_per_cm3),
            stoichiometry=formula,
        )
        f2r = np.asarray(f2, dtype=np.float64)
        im = asf_im(
            energies=e,
            factors=f2r,
            origin_dtype=KK_Datatype.ASF,
        )
        asp = im.to_atomic_scattering_polynomial()
        re = asp.kk_transform(
            target_energies=e,
            improve_accuracy=False,
            relativistic_correction=0.0,
        )
        f1 = np.asarray(re.factors, dtype=np.float64)
        refr = conversions.ASF_to_refractive(
            e,
            f1 + 1j * f2r,
            density=float(density_g_per_cm3),
            stoichiometry=formula,
        )
        delta = np.asarray(refr, dtype=np.complex128).real
        sto = kk_stoichiometry(formula)
        number_density = float(density_g_per_cm3) * float(N_A) / float(sto.formula_mass)
    return delta, number_density


def _kkcalc_f1_f2_on_grid(e: np.ndarray, b: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Return kkcalc2 KK_PP ``f_1`` and input ``f_2`` on ``e`` (stdout from kkcalc2 suppressed)."""
    with redirect_stdout(io.StringIO()):
        from kkcalc2.models.factors import KK_Datatype, asf_im

        im = asf_im(
            energies=e,
            factors=b,
            origin_dtype=KK_Datatype.ASF,
        )
        asp = im.to_atomic_scattering_polynomial()
        re = asp.kk_transform(
            target_energies=e,
            improve_accuracy=False,
            relativistic_correction=0.0,
        )
        f1 = np.asarray(re.factors, dtype=np.float64)
    f2 = np.asarray(b, dtype=np.float64)
    return f1, f2


def _energy_beta_from_fixture_or_csv(args: argparse.Namespace) -> tuple[np.ndarray, np.ndarray]:
    if getattr(args, "csv", None):
        return _load_csv_energy_beta(Path(args.csv))
    return _load_fixture(Path(args.fixture))


def cmd_discrete_mirror(args: argparse.Namespace) -> None:
    e, b = _energy_beta_from_fixture_or_csv(args)
    out = discrete_delta_from_beta(e, b)
    json.dump({"delta": out.tolist()}, sys.stdout)
    sys.stdout.write("\n")


def cmd_scipy_makima(args: argparse.Namespace) -> None:
    payload = json.loads(sys.stdin.read())
    target_x = np.asarray(payload["targetEnergyEv"], dtype=np.float64)
    source_x = np.asarray(payload["sourceEnergyEv"], dtype=np.float64)
    source_y = np.asarray(payload["sourceDelta"], dtype=np.float64)
    if source_x.size < 4:
        yq = np.interp(target_x, source_x, source_y)
        o0, o1 = float(source_x[0]), float(source_x[-1])
        yq = np.where((target_x < o0) | (target_x > o1), np.nan, yq)
    else:
        interp = Akima1DInterpolator(source_x, source_y, method="makima")
        yq = interp(target_x)
    json.dump({"delta": yq.tolist()}, sys.stdout)
    sys.stdout.write("\n")


def cmd_kkcalc_f1(args: argparse.Namespace) -> None:
    e, b = _load_fixture(Path(args.fixture))
    f1, _f2 = _kkcalc_f1_f2_on_grid(e, b)
    json.dump({"f1": f1.tolist()}, sys.stdout)
    sys.stdout.write("\n")


def cmd_kkcalc_delta_optical_beta(args: argparse.Namespace) -> None:
    """
    kkcalc2 dispersive ``delta`` from optical-index ``beta`` using density and stoichiometry.

    Reads energies and ``beta`` from ``--csv`` (columns ``energy_eV``, ``beta``) or from stdin JSON
    ``{\"energyEv\": [...], \"beta\": [...]}`` when ``--csv`` is omitted.
    """
    if args.csv is not None:
        e, b = _load_csv_energy_beta(Path(args.csv))
    else:
        payload = json.loads(sys.stdin.read())
        if not isinstance(payload, dict):
            raise ValueError("stdin JSON must be an object")
        raw_e = payload.get("energyEv")
        raw_b = payload.get("beta")
        if not isinstance(raw_e, list) or not isinstance(raw_b, list):
            raise ValueError('stdin JSON must include "energyEv" and "beta" arrays')
        e = np.asarray(raw_e, dtype=np.float64)
        b = np.asarray(raw_b, dtype=np.float64)
        if e.size < 4:
            raise ValueError("At least four samples are required")
        if e.size != b.size:
            raise ValueError("energyEv and beta must have the same length")
        if not np.all(np.isfinite(e)) or not np.all(np.isfinite(b)):
            raise ValueError("energyEv and beta must contain only finite numbers")
        if not np.all(np.diff(e) > 0):
            raise ValueError("energyEv must be strictly ascending")

    delta, nd = _kkcalc_delta_optical_beta_pipeline(
        e,
        b,
        formula=str(args.formula),
        density_g_per_cm3=float(args.density),
    )
    json.dump(
        {
            "delta": delta.tolist(),
            "formula": str(args.formula),
            "density_g_per_cm3": float(args.density),
            "numberDensity_atoms_per_cm3": nd,
        },
        sys.stdout,
    )
    sys.stdout.write("\n")


def cmd_kkcalc_delta(args: argparse.Namespace) -> None:
    """
    Emit kkcalc-derived dispersive delta on the kkcalc energy grid after KK_PP.

    Uses ratio cancellation ``delta = beta * f_1 / f_2`` by default; optional absolute conversion
    via ``ASF_to_refractive`` when ``--number-density`` is provided.
    """
    e, b = _energy_beta_from_fixture_or_csv(args)
    f1, f2 = _kkcalc_f1_f2_on_grid(e, b)
    nd = getattr(args, "number_density", None)
    if nd is not None:
        from kkcalc2 import conversions

        delta = np.asarray(
            conversions.ASF_to_refractive(
                e,
                f1 + 1j * f2,
                number_density=float(nd),
            ),
            dtype=np.complex128,
        ).real
    else:
        delta = b * (f1 / f2)
    payload: dict[str, object] = {"delta": delta.tolist()}
    if nd is not None:
        payload["numberDensity"] = float(nd)
    json.dump(payload, sys.stdout)
    sys.stdout.write("\n")


def main() -> None:
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="cmd", required=True)

    p_dm = sub.add_parser(
        "discrete-mirror",
        help='Mirror TS discrete KK on fixture or CSV; prints {"delta":[...]}.',
    )
    g_dm = p_dm.add_mutually_exclusive_group(required=True)
    g_dm.add_argument("--fixture", type=str, help="JSON with energyEv and beta arrays.")
    g_dm.add_argument(
        "--csv",
        type=str,
        help='CSV with columns "energy_eV" and "beta".',
    )
    p_dm.set_defaults(func=cmd_discrete_mirror)

    p_sm = sub.add_parser(
        "scipy-makima",
        help="Read JSON stdin with targetEnergyEv, sourceEnergyEv, sourceDelta; prints makima values.",
    )
    p_sm.set_defaults(func=cmd_scipy_makima)

    p_kk = sub.add_parser(
        "kkcalc-f1",
        help='Run kkcalc2 KK_PP on fixture beta treated as tabulated f2; prints {"f1":[...]}.',
    )
    p_kk.add_argument("--fixture", required=True)
    p_kk.set_defaults(func=cmd_kkcalc_f1)

    p_kd = sub.add_parser(
        "kkcalc-delta",
        help='KK_PP f_1 plus factors.py delta conversion; prints {"delta":[...]}.',
    )
    g_kd = p_kd.add_mutually_exclusive_group(required=True)
    g_kd.add_argument("--fixture", type=str, help="JSON with energyEv and beta.")
    g_kd.add_argument("--csv", type=str, help='CSV with "energy_eV" and "beta".')
    p_kd.add_argument(
        "--number-density",
        type=float,
        default=None,
        help=(
            "atoms per cm^3 for ASF_to_refractive(E, f_1+i f_2, ...); omit to use "
            "density-independent delta = beta*f_1/f_2 (common prefactor cancellation)."
        ),
    )
    p_kd.set_defaults(func=cmd_kkcalc_delta)

    p_ob = sub.add_parser(
        "kkcalc-delta-optical-beta",
        help=(
            "Optical beta -> refractive_to_ASF -> KK_PP -> ASF_to_refractive dispersive delta "
            "(stoichiometry + mass density)."
        ),
    )
    p_ob.add_argument(
        "--csv",
        type=str,
        default=None,
        help=(
            'CSV with columns "energy_eV" and "beta". If omitted, read JSON stdin '
            '{"energyEv":[],"beta":[]}.'
        ),
    )
    p_ob.add_argument(
        "--formula",
        type=str,
        default="C72H14O2",
        help="Chemical formula for kkcalc2 stoichiometry (default C72H14O2).",
    )
    p_ob.add_argument(
        "--density",
        type=float,
        default=1.0,
        help="Mass density in g/cm^3 for kkcalc2 conversions.refractive_to_ASF (default 1).",
    )
    p_ob.set_defaults(func=cmd_kkcalc_delta_optical_beta)

    args = p.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
