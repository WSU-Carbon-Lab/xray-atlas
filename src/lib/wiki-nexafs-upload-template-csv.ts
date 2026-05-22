/**
 * Minimal NEXAFS upload CSV template aligned with contribute column mapping (`energy_eV`, `mu`, optional channels).
 */

const TEMPLATE_HEADER =
  "energy_eV,mu,i0,theta_deg,phi_deg,od,mass_absorption,beta,delta";

const TEMPLATE_ROWS: readonly string[] = [
  "280.000000,0.012000,1.000000,55,0,,,,",
  "285.000000,0.045000,1.000000,55,0,,,,",
  "290.000000,0.120000,1.000000,55,0,,,,",
  "295.000000,0.085000,1.000000,55,0,,,,",
  "300.000000,0.040000,1.000000,55,0,,,,",
];

/**
 * Builds a UTF-8 CSV string for the wiki input-spectroscopy template download.
 */
export function buildWikiNexafsUploadTemplateCsv(): string {
  return [TEMPLATE_HEADER, ...TEMPLATE_ROWS].join("\n");
}

export const WIKI_NEXAFS_UPLOAD_TEMPLATE_FILENAME = "nexafs-upload-template.csv";
