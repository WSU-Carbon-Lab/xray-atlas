/**
 * CSV serialization for spectrum tables and downloads (clipboard or file).
 */
import type { SpectrumPoint } from "~/components/plots/types";

function escapeCsvCell(v: string): string {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function fmtOpt(n: number | undefined): string {
  return typeof n === "number" && Number.isFinite(n) ? String(n) : "";
}

/**
 * Builds a CSV document with stable columns: energy, primary mu (`absorption`), optional OD, mass absorption, beta, I0, theta, phi.
 *
 * @param points Spectrum samples in display order (caller may sort by energy).
 * @returns RFC-4180 style lines joined with `\n`, including a header row.
 */
export function spectrumPointsToDetailedCsv(points: SpectrumPoint[]): string {
  const header =
    "energy_eV,mu,od,mass_absorption,beta,i0,theta_deg,phi_deg";
  const lines = points.map((p) =>
    [
      p.energy.toFixed(6),
      p.absorption.toExponential(8),
      fmtOpt(p.od),
      fmtOpt(p.massabsorption),
      fmtOpt(p.beta),
      fmtOpt(p.i0),
      fmtOpt(p.theta),
      fmtOpt(p.phi),
    ]
      .map(escapeCsvCell)
      .join(","),
  );
  return [header, ...lines].join("\n");
}
