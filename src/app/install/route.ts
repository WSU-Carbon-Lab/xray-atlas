/**
 * POSIX installer for the xatlas CLI.
 *
 * `curl -fsSL https://xrayatlas.wsu.edu/install | bash` runs this script.
 * `?name=xa` selects `xa` or `atlas` instead of `xatlas`.
 */

import {
  buildPosixInstallScript,
  parseInstallCommandName,
  type InstallCommandName,
} from "~/server/cli/install-scripts";

/**
 * Returns the bash installer for this request's origin.
 */
export function GET(request: Request): Response {
  const url = new URL(request.url);
  let name: InstallCommandName;
  try {
    name = parseInstallCommandName(url.searchParams.get("name"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid command name.";
    return new Response(`${message}\n`, {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  const script = buildPosixInstallScript(url.origin, name);
  return new Response(script, {
    headers: {
      "Content-Type": "text/x-shellscript; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
