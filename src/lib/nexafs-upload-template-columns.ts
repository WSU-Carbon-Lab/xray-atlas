/**
 * Column semantics and example rows for NEXAFS CSV upload templates (contribute portal, public CSV, wiki).
 *
 * Required ingest fields are energy and a primary absorption column (`mu` in the template);
 * optional channels match `CSVColumnMappings` and `detectAuxiliarySpectrumColumnNames`.
 */

export type NexafsUploadTemplateColumn = {
  readonly key: string;
  readonly label: string;
  readonly required: boolean;
  /** Reader-facing explanation for contribute portal tooltips and wiki copy. */
  readonly tooltip: string;
};

export const NEXAFS_UPLOAD_TEMPLATE_CSV_PUBLIC_PATH =
  "/nexafs-upload-template.csv";

export const NEXAFS_UPLOAD_TEMPLATE_CSV_WIKI_PATH =
  "/wiki/atlas/uploading-data/template";

export const NEXAFS_UPLOAD_TEMPLATE_COLUMNS: readonly NexafsUploadTemplateColumn[] =
  [
    {
      key: "energy_eV",
      label: "energy_eV",
      required: true,
      tooltip:
        "Incident photon energy (eV) on the spectrum axis. Required. Maps to Energy in the column mapper; headers containing energy, ev, or photon are auto-matched (for example Energy). Values should increase monotonically along the scan.",
    },
    {
      key: "mu",
      label: "mu",
      required: true,
      tooltip:
        "Primary absorption trace proportional to mass absorption with arbitrary sample density, thickness, and instrument scaling — not already a physical mass absorption coefficient. Required. Maps to Absorption in the column mapper (persisted as rawabs); aliases include Absorption, abs, intensity, signal, and mu.",
    },
    {
      key: "mu_err",
      label: "mu_err",
      required: false,
      tooltip:
        "Optional per-point uncertainty on the primary absorption trace (1 sigma). Maps to raw absorption error at ingest. Auto-matched aliases include muerr, muerror, abserr, abserror, rawabserr, and rawabserror; assign manually if your header uses sigma or another name.",
    },
    {
      key: "i0",
      label: "i0",
      required: false,
      tooltip:
        "Optional monitor or reference intensity (I0) for normalization context. Aliases: i0, i_0.",
    },
    {
      key: "theta_deg",
      label: "theta_deg",
      required: false,
      tooltip:
        "Optional polar angle of the X-ray electric field (degrees). Headers containing theta are auto-matched; omit when all traces share one geometry and set fixed angles in the UI.",
    },
    {
      key: "phi_deg",
      label: "phi_deg",
      required: false,
      tooltip:
        "Optional azimuthal angle (degrees). Headers containing phi are auto-matched. Pair with theta_deg for angle-resolved uploads.",
    },
    {
      key: "od",
      label: "od",
      required: false,
      tooltip:
        "Optional trace already on a 0–1 normalization scale (optical-density-style plateau normalization). Aliases: od and names containing opticaldensity. Used when OD is uploaded instead of or alongside mu.",
    },
    {
      key: "od_err",
      label: "od_err",
      required: false,
      tooltip:
        "Optional uncertainty on the OD column (1 sigma). Auto-matched aliases: oderr, oderror, and names containing opticaldensityerr.",
    },
    {
      key: "mass_absorption",
      label: "mass_absorption",
      required: false,
      tooltip:
        "Optional proper mass absorption coefficient when already normalized to unit sample thickness and mass density 1 g/cm³ (areal density 1 g/cm² basis). Aliases: mass_absorption, massabsorption, mu_a, mua, mac. Used for bare-atom-aligned normalization workflows.",
    },
    {
      key: "mass_absorption_err",
      label: "mass_absorption_err",
      required: false,
      tooltip:
        "Optional uncertainty on mass_absorption (1 sigma). Auto-matched aliases include massabsorptionerr, massabsorptionerror, mu_aerr, and muaerr.",
    },
    {
      key: "beta",
      label: "beta",
      required: false,
      tooltip:
        "Optional imaginary refractive index (beta) when precomputed. Header beta is auto-matched. Kramers-Kronig delta can be derived in-app when beta is present.",
    },
    {
      key: "beta_err",
      label: "beta_err",
      required: false,
      tooltip:
        "Optional uncertainty on beta (1 sigma). Auto-matched aliases: betaerr, betaerror.",
    },
    {
      key: "delta",
      label: "delta",
      required: false,
      tooltip:
        "Optional real refractive index (delta) when precomputed. Aliases: delta, kkdelta, kk_delta. Otherwise delta may be calculated from beta at upload or later.",
    },
    {
      key: "delta_err",
      label: "delta_err",
      required: false,
      tooltip:
        "Optional uncertainty on delta (1 sigma). Auto-matched aliases: deltaerr, deltaerror, and names containing deltaerr.",
    },
  ];

export type NexafsUploadTemplateExampleRow = Record<string, string>;

/** Synthetic preview rows aligned with the downloadable CSV template. */
export const NEXAFS_UPLOAD_TEMPLATE_EXAMPLE_ROWS: readonly NexafsUploadTemplateExampleRow[] =
  [
    {
      energy_eV: "280.0",
      mu: "0.012",
      mu_err: "0.001",
      i0: "1.0",
      theta_deg: "55",
      phi_deg: "0",
      od: "0.011",
      od_err: "0.0008",
      mass_absorption: "0.018",
      mass_absorption_err: "0.0012",
      beta: "0.000011",
      beta_err: "0.000001",
      delta: "0.000016",
      delta_err: "0.000001",
    },
    {
      energy_eV: "285.0",
      mu: "0.045",
      mu_err: "0.002",
      i0: "1.0",
      theta_deg: "55",
      phi_deg: "0",
      od: "0.041",
      od_err: "0.0015",
      mass_absorption: "0.068",
      mass_absorption_err: "0.0025",
      beta: "0.000042",
      beta_err: "0.000004",
      delta: "0.000051",
      delta_err: "0.000004",
    },
    {
      energy_eV: "290.0",
      mu: "0.120",
      mu_err: "0.004",
      i0: "1.0",
      theta_deg: "55",
      phi_deg: "0",
      od: "0.112",
      od_err: "0.0035",
      mass_absorption: "0.182",
      mass_absorption_err: "0.0055",
      beta: "0.000118",
      beta_err: "0.000010",
      delta: "0.000142",
      delta_err: "0.000009",
    },
    {
      energy_eV: "295.0",
      mu: "0.085",
      mu_err: "0.003",
      i0: "1.0",
      theta_deg: "55",
      phi_deg: "0",
      od: "0.079",
      od_err: "0.0028",
      mass_absorption: "0.128",
      mass_absorption_err: "0.0042",
      beta: "0.000083",
      beta_err: "0.000007",
      delta: "0.000099",
      delta_err: "0.000007",
    },
    {
      energy_eV: "300.0",
      mu: "0.040",
      mu_err: "0.002",
      i0: "1.0",
      theta_deg: "55",
      phi_deg: "0",
      od: "0.037",
      od_err: "0.0012",
      mass_absorption: "0.060",
      mass_absorption_err: "0.0020",
      beta: "0.000039",
      beta_err: "0.000003",
      delta: "0.000047",
      delta_err: "0.000003",
    },
  ];

function formatNexafsUploadTemplateCsvCell(
  columnKey: string,
  raw: string,
): string {
  if (raw.length === 0) {
    return "";
  }
  if (columnKey === "theta_deg" || columnKey === "phi_deg") {
    return raw;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return raw;
  }
  return parsed.toFixed(6);
}

/**
 * Builds the UTF-8 CSV body for the public contribute template and wiki download route.
 */
export function buildNexafsUploadTemplateCsv(): string {
  const header = NEXAFS_UPLOAD_TEMPLATE_COLUMNS.map(
    (column) => column.key,
  ).join(",");
  const body = NEXAFS_UPLOAD_TEMPLATE_EXAMPLE_ROWS.map((row) =>
    NEXAFS_UPLOAD_TEMPLATE_COLUMNS.map((column) =>
      formatNexafsUploadTemplateCsvCell(column.key, row[column.key] ?? ""),
    ).join(","),
  );
  return [header, ...body].join("\n");
}
