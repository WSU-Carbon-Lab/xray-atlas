import { readFile } from "node:fs/promises";
import path from "node:path";
import type { NextRequest } from "next/server";

/**
 * Serves OpenChemLib `resources.json` from the installed package so the browser
 * can call `Resources.registerFromUrl` same-origin without checking a 1.3MB file
 * into `public/` or depending on a third-party CDN.
 */
export async function GET(_req: NextRequest) {
  const filePath = path.join(
    process.cwd(),
    "node_modules",
    "openchemlib",
    "dist",
    "resources.json",
  );
  const body = await readFile(filePath, "utf8");
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
