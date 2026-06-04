/**
 * Minimal NEXAFS upload CSV template aligned with contribute column mapping (`energy_eV`, `mu`, optional channels).
 */

import { buildNexafsUploadTemplateCsv } from "~/lib/nexafs-upload-template-columns";

/**
 * Builds a UTF-8 CSV string for the wiki input-spectroscopy template download.
 */
export function buildWikiNexafsUploadTemplateCsv(): string {
  return buildNexafsUploadTemplateCsv();
}

export const WIKI_NEXAFS_UPLOAD_TEMPLATE_FILENAME = "nexafs-upload-template.csv";
