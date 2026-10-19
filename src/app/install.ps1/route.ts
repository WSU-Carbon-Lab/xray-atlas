/**
 * PowerShell installer for the xatlas CLI.
 *
 * `irm https://xrayatlas.wsu.edu/install.ps1 | iex` runs this script.
 * `?name=xa` selects `xa` or `atlas` instead of `xatlas`.
 */

import {
  buildPowerShellInstallScript,
  parseInstallCommandName,
  type InstallCommandName,
} from "~/server/cli/install-scripts";

/**
 * Returns the PowerShell installer for this request's origin.
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
  const script = buildPowerShellInstallScript(url.origin, name);
  return new Response(script, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
