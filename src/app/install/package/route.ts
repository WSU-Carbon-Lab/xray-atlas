/**
 * Gzip archive of the xatlas CLI package.
 *
 * The install scripts download this route, extract it, and run `install-bin`.
 */

import {
  buildCliPackageArchive,
  cliPackageIsPresent,
} from "~/server/cli/install-package";

/**
 * Returns the CLI package archive, or 404 when this checkout has no CLI tree.
 */
export async function GET(): Promise<Response> {
  if (!(await cliPackageIsPresent())) {
    return new Response("xatlas package is not published on this server.\n", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  const archive = await buildCliPackageArchive();
  return new Response(archive, {
    headers: {
      "Content-Type": "application/gzip",
      "Content-Disposition": 'attachment; filename="xatlas.tar.gz"',
      "Cache-Control": "public, max-age=300",
    },
  });
}
