import {
  buildWikiNexafsUploadTemplateCsv,
  WIKI_NEXAFS_UPLOAD_TEMPLATE_FILENAME,
} from "~/lib/wiki-nexafs-upload-template-csv";

/**
 * Serves the wiki NEXAFS upload CSV template (energy, absorption, optional auxiliary columns).
 */
export function GET(): Response {
  const csv = buildWikiNexafsUploadTemplateCsv();
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${WIKI_NEXAFS_UPLOAD_TEMPLATE_FILENAME}"`,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
