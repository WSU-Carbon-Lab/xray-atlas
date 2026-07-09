import { buttonVariants, cn } from "@heroui/styles";
import type { ReactElement } from "react";
import { NEXAFS_UPLOAD_TEMPLATE_COLUMNS } from "~/lib/nexafs-upload-template-columns";

const exampleColumns = NEXAFS_UPLOAD_TEMPLATE_COLUMNS.map((col) => ({
  column: col.label,
  required: col.required ? "Yes" : "No",
  mapsTo:
    col.key === "energy_eV"
      ? "spectrumpoints.energyev (strictly ascending)"
      : col.key === "mu"
        ? "spectrumpoints.rawabs (primary native trace when mu is the primary; optional when a processed channel is supplied)"
        : col.key === "mu_err"
          ? "spectrumpoints.rawabserr"
          : col.key === "theta_deg" || col.key === "phi_deg"
            ? "polarization geometry"
            : col.key === "od_err"
              ? "spectrumpoints.oderr"
              : col.key === "mass_absorption_err"
                ? "spectrumpoints.massabsorptionerr"
                : col.key === "beta_err"
                  ? "spectrumpoints.betaerr"
                  : col.key === "delta_err"
                    ? "spectrumpoints.deltaerr"
                    : `spectrumpoints.${col.key.replace(/_deg$/, "").replace(/_absorption$/, "absorption")}`,
}));

/**
 * Renders the wiki upload column mapping table and template CSV download control for MDX articles.
 */
export function UploadColumnsReference(): ReactElement {
  return (
    <div className="border-border bg-surface rounded-lg border p-4">
      <div className="overflow-x-auto">
        <table className="border-border w-full min-w-[28rem] border text-left text-sm">
          <thead>
            <tr className="border-border bg-background border-b">
              <th className="text-foreground px-3 py-2 font-medium">
                CSV column
              </th>
              <th className="text-foreground px-3 py-2 font-medium">
                Required
              </th>
              <th className="text-foreground px-3 py-2 font-medium">
                Persisted field
              </th>
            </tr>
          </thead>
          <tbody>
            {exampleColumns.map((row) => (
              <tr
                key={row.column}
                className="border-border border-b last:border-b-0"
              >
                <td className="text-foreground px-3 py-2 align-top font-mono text-xs">
                  {row.column}
                </td>
                <td className="text-muted px-3 py-2 align-top">
                  {row.required}
                </td>
                <td className="text-muted px-3 py-2 align-top">{row.mapsTo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4">
        <a
          href="/wiki/atlas/uploading-data/template"
          download
          className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
        >
          Download template CSV
        </a>
      </div>
    </div>
  );
}
