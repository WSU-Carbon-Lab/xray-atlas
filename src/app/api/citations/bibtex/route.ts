/**
 * Echoes client-supplied BibTeX as `application/x-bibtex` for Zotero Connector
 * interception on the same origin (hidden iframe POST; no new browser tab).
 *
 * Does not look up experiments. Callers must supply already-built BibTeX from
 * the Cite popover. Rejects payloads that are empty, not BibTeX-shaped, or
 * larger than the size cap.
 */

import { NextResponse } from "next/server";

const MAX_BIBTEX_CHARS = 100_000;

function sanitizeBibFilename(raw: string | null): string {
  const trimmed = raw?.trim() ?? "";
  const base = trimmed
    .replace(/\.bib$/i, "")
    .replace(/[^\w.\-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
  return `${base || "atlas-dataset"}.bib`;
}

/**
 * Accepts `multipart/form-data` or JSON `{ bibtex, filename? }` and returns the
 * BibTeX body with bibliographic Content-Type / Content-Disposition headers.
 */
export async function POST(request: Request): Promise<Response> {
  const contentType = request.headers.get("content-type") ?? "";
  let bibtex = "";
  let filenameRaw: string | null = null;

  try {
    if (contentType.includes("application/json")) {
      const body = (await request.json()) as {
        bibtex?: unknown;
        filename?: unknown;
      };
      bibtex = typeof body.bibtex === "string" ? body.bibtex : "";
      filenameRaw = typeof body.filename === "string" ? body.filename : null;
    } else {
      const form = await request.formData();
      const value = form.get("bibtex");
      bibtex = typeof value === "string" ? value : "";
      const nameValue = form.get("filename");
      filenameRaw = typeof nameValue === "string" ? nameValue : null;
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const trimmed = bibtex.trim();
  if (!trimmed.startsWith("@") || !trimmed.includes("{")) {
    return NextResponse.json({ error: "Invalid BibTeX" }, { status: 400 });
  }
  if (trimmed.length > MAX_BIBTEX_CHARS) {
    return NextResponse.json({ error: "BibTeX too large" }, { status: 413 });
  }

  const filename = sanitizeBibFilename(filenameRaw);
  return new Response(trimmed, {
    status: 200,
    headers: {
      "Content-Type": "application/x-bibtex; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
