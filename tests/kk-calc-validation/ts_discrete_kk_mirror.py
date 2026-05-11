"""
NumPy mirror of ``computeDeltaFromBetaDiscreteKK`` in ``src/features/kk-calc/kk-discrete-henke.ts``.

Keep this loop algebra identical to the TypeScript implementation when validating the port.
"""

from __future__ import annotations

import numpy as np
import numpy.typing as npt

TWO_OVER_PI = 2.0 / np.pi


def discrete_delta_from_beta(
    energy_ev_asc: npt.NDArray[np.float64],
    beta: npt.NDArray[np.float64],
) -> npt.NDArray[np.float64]:
    n = int(energy_ev_asc.shape[0])
    if n != int(beta.shape[0]):
        raise ValueError("energy_ev_asc and beta must have the same length")
    if n < 4:
        raise ValueError("At least four samples are required")
    if not (np.all(np.isfinite(energy_ev_asc)) and np.all(np.isfinite(beta))):
        raise ValueError("energy_ev_asc and beta must contain only finite numbers")
    if not np.all(np.diff(energy_ev_asc) > 0):
        raise ValueError("energy_ev_asc must be strictly ascending")

    raw = np.zeros(n, dtype=np.float64)
    for i in range(n):
        ei = float(energy_ev_asc[i])
        bi = float(beta[i])
        acc = 0.0
        for j in range(n):
            if i == j:
                continue
            ej = float(energy_ev_asc[j])
            bj = float(beta[j])
            num = ej * bj - ei * bi
            den = ej * ej - ei * ei
            acc += TWO_OVER_PI * num / den
        raw[i] = acc

    anchor_start = int(np.floor(n * 0.9))
    tail_count = max(1, n - anchor_start)
    tail_mean = float(np.sum(raw[anchor_start:]) / tail_count)
    return raw - tail_mean
