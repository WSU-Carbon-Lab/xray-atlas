/**
 * Wiki subtopic describing uploaded NEXAFS spectroscopy inputs and CSV layout.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants, cn } from "@heroui/styles";
import { site } from "~/app/brand";

export const metadata: Metadata = {
  title: "Input spectroscopy",
  description: `How ${site.name} ingests NEXAFS energy-intensity tables, optional auxiliary columns, and geometry metadata.`,
  alternates: {
    canonical: "/wiki/data-representation/input-spectroscopy",
  },
};

const exampleColumns: readonly {
  readonly column: string;
  readonly required: string;
  readonly mapsTo: string;
}[] = [
  { column: "energy_eV", required: "Yes", mapsTo: "spectrumpoints.energyev (strictly ascending)" },
  {
    column: "mu (or mapped absorption column)",
    required: "Yes",
    mapsTo: "spectrumpoints.rawabs (primary upload trace)",
  },
  { column: "i0", required: "No", mapsTo: "spectrumpoints.i0" },
  { column: "theta_deg", required: "No", mapsTo: "polarization geometry (theta)" },
  { column: "phi_deg", required: "No", mapsTo: "polarization geometry (phi)" },
  { column: "od", required: "No", mapsTo: "spectrumpoints.od" },
  { column: "mass_absorption", required: "No", mapsTo: "spectrumpoints.massabsorption" },
  { column: "beta", required: "No", mapsTo: "spectrumpoints.beta" },
  { column: "delta", required: "No", mapsTo: "spectrumpoints.delta" },
];

export default function WikiInputSpectroscopyPage() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <div id="input-spectroscopy" className="sr-only" aria-hidden>
        Input spectroscopy
      </div>
      <h1 className="text-foreground text-4xl font-bold">Input spectroscopy</h1>
      <p className="text-muted max-w-none text-sm leading-relaxed">
        Each uploaded trace is a table of photon-energy samples. The contribute flow maps CSV
        headers to <code className="text-foreground">spectrumpoints</code> rows; energies must
        increase monotonically. Angle-resolved uploads use separate traces per geometry when{" "}
        <code className="text-foreground">theta_deg</code> and{" "}
        <code className="text-foreground">phi_deg</code> vary, or fixed angles in the UI when
        those columns are omitted.
      </p>

      <section
        id="upload-columns"
        className="border-border bg-surface rounded-lg border p-4"
      >
        <h2 className="text-foreground mb-2 text-lg font-semibold">
          Expected column layout
        </h2>
        <p className="text-muted mb-3 text-sm leading-relaxed">
          Header names are matched flexibly in the contribute mapper; this table lists the
          conventional names used in exports and the wiki template.
        </p>
        <div className="overflow-x-auto">
          <table className="border-border w-full min-w-[28rem] border text-left text-sm">
            <thead>
              <tr className="border-border bg-background border-b">
                <th className="text-foreground px-3 py-2 font-medium">CSV column</th>
                <th className="text-foreground px-3 py-2 font-medium">Required</th>
                <th className="text-foreground px-3 py-2 font-medium">Persisted field</th>
              </tr>
            </thead>
            <tbody>
              {exampleColumns.map((row) => (
                <tr key={row.column} className="border-border border-b last:border-b-0">
                  <td className="text-foreground px-3 py-2 align-top font-mono text-xs">
                    {row.column}
                  </td>
                  <td className="text-muted px-3 py-2 align-top">{row.required}</td>
                  <td className="text-muted px-3 py-2 align-top">{row.mapsTo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4">
          <a
            href="/wiki/data-representation/input-spectroscopy/template"
            download
            className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
          >
            Download template CSV
          </a>
        </div>
      </section>

      <p className="text-muted text-sm">
        Related:{" "}
        <Link
          href="/wiki/data-representation/optical-constants"
          className="text-accent hover:underline"
        >
          Optical constants and plot views
        </Link>
        ,{" "}
        <Link href="/contribute/nexafs" className="text-accent hover:underline">
          NEXAFS contribute
        </Link>
        ,{" "}
        <Link href="/wiki/data-representation" className="text-accent hover:underline">
          Data representation overview
        </Link>
        .
      </p>
    </div>
  );
}
