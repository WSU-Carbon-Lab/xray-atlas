/**
 * Shell and PowerShell installers for the xatlas CLI.
 *
 * The scripts download the package from the same origin that served them,
 * extract it under the user data directory, and run the CLI's own
 * `install-bin` entry. They do not clone a git repository. Command names
 * match the CLI installer: `xatlas`, `xa`, and `atlas`.
 */

const INSTALL_COMMAND_NAMES = ["xatlas", "xa", "atlas"] as const;

/** Command name the installer may link into the Bun bin directory. */
export type InstallCommandName = (typeof INSTALL_COMMAND_NAMES)[number];

/**
 * Resolves an installer command name.
 *
 * @param value - Raw `name` query or argument. Empty and omitted values select `xatlas`.
 * @returns The allowed command name.
 * @throws {Error} when `value` is not `xatlas`, `xa`, or `atlas`.
 */
export function parseInstallCommandName(value: string | null): InstallCommandName {
  if (value === null || value.length === 0 || value === "xatlas") {
    return "xatlas";
  }
  if (value === "xa" || value === "atlas") {
    return value;
  }
  throw new Error("Command name must be xatlas, xa, or atlas.");
}

/**
 * Builds the POSIX installer.
 *
 * @param origin - Site origin with no trailing slash, such as `https://xrayatlas.wsu.edu`.
 * @param defaultName - Name used when the script is started with no argument.
 * @returns A bash script. `bash -s -- xa` overrides `defaultName`.
 */
export function buildPosixInstallScript(
  origin: string,
  defaultName: InstallCommandName,
): string {
  const originLiteral = shellSingleQuote(origin);
  return `#!/usr/bin/env bash
set -euo pipefail

name="\${1:-${defaultName}}"
case "$name" in
  xatlas|xa|atlas) ;;
  *)
    echo "Command name must be xatlas, xa, or atlas." >&2
    exit 1
    ;;
esac

if ! command -v bun >/dev/null 2>&1; then
  echo "Bun is required. Install it from https://bun.sh, then run this script again." >&2
  exit 1
fi
if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required." >&2
  exit 1
fi
if ! command -v tar >/dev/null 2>&1; then
  echo "tar is required." >&2
  exit 1
fi

origin=${originLiteral}
dest="\${XDG_DATA_HOME:-$HOME/.local/share}/xatlas/cli"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

if ! curl -fsSL "$origin/install/package" -o "$tmp/xatlas.tar.gz"; then
  echo "Could not download the xatlas package from $origin/install/package." >&2
  exit 1
fi

rm -rf "$dest"
mkdir -p "$dest"
tar -xzf "$tmp/xatlas.tar.gz" -C "$dest"
(
  cd "$dest"
  bun install --production
  bun ./src/install-bin.ts "$name"
)
`;
}

/**
 * Builds the PowerShell installer.
 *
 * @param origin - Site origin with no trailing slash.
 * @param defaultName - Name used when the script is invoked with no argument.
 * @returns A PowerShell script. `iex "& {$(irm <url>)} xa"` overrides `defaultName`.
 */
export function buildPowerShellInstallScript(
  origin: string,
  defaultName: InstallCommandName,
): string {
  const originLiteral = powershellSingleQuote(origin);
  const nameLiteral = powershellSingleQuote(defaultName);
  return `param(
  [Parameter(Position = 0)]
  [string]$Name = ${nameLiteral}
)

$ErrorActionPreference = 'Stop'

if ($Name -notin @('xatlas', 'xa', 'atlas')) {
  Write-Error 'Command name must be xatlas, xa, or atlas.'
  exit 1
}

if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
  Write-Error 'Bun is required. Install it from https://bun.sh, then run this script again.'
  exit 1
}
if (-not (Get-Command curl -ErrorAction SilentlyContinue)) {
  Write-Error 'curl is required.'
  exit 1
}
if (-not (Get-Command tar -ErrorAction SilentlyContinue)) {
  Write-Error 'tar is required.'
  exit 1
}

$origin = ${originLiteral}
if ($env:OS -eq 'Windows_NT') {
  $dest = Join-Path $env:LOCALAPPDATA 'xatlas\\cli'
} else {
  $base = if ($env:XDG_DATA_HOME) { $env:XDG_DATA_HOME } else { Join-Path $HOME '.local/share' }
  $dest = Join-Path $base 'xatlas/cli'
}

$tmp = Join-Path ([System.IO.Path]::GetTempPath()) ([guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $tmp | Out-Null
$archive = Join-Path $tmp 'xatlas.tar.gz'

try {
  & curl.exe -fsSL "$origin/install/package" -o $archive
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Could not download the xatlas package from $origin/install/package."
    exit 1
  }
  if (Test-Path $dest) {
    Remove-Item -Recurse -Force $dest
  }
  New-Item -ItemType Directory -Path $dest | Out-Null
  & tar.exe -xzf $archive -C $dest
  if ($LASTEXITCODE -ne 0) {
    Write-Error 'Could not extract the xatlas package.'
    exit 1
  }
  Push-Location $dest
  try {
    & bun install --production
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    & bun ./src/install-bin.ts $Name
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  } finally {
    Pop-Location
  }
} finally {
  if (Test-Path $tmp) {
    Remove-Item -Recurse -Force $tmp
  }
}
`;
}

function shellSingleQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function powershellSingleQuote(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}
