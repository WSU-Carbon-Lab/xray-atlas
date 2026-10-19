/**
 * Builds the gzip archive served at `/install/package`.
 *
 * The archive is the `extensions/cli` tree with `node_modules` and `.git`
 * omitted. The install scripts extract it and run `install-bin` from that tree.
 */

import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";

/** Absolute path of the xatlas package inside this repository. */
export function cliPackageRoot(): string {
  return path.join(process.cwd(), "extensions", "cli");
}

/**
 * Reports whether the CLI package is present in this checkout.
 *
 * @returns `true` when `extensions/cli/package.json` can be read.
 */
export async function cliPackageIsPresent(): Promise<boolean> {
  try {
    await access(path.join(cliPackageRoot(), "package.json"));
    return true;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

/**
 * Archives the CLI package as gzip.
 *
 * @returns The raw `.tar.gz` bytes.
 * @throws {Error} when `tar` exits non-zero or the package directory is missing.
 */
export async function buildCliPackageArchive(): Promise<Uint8Array> {
  const root = cliPackageRoot();
  if (!(await cliPackageIsPresent())) {
    throw new Error("xatlas package is not present in this checkout.");
  }
  return runTar(root);
}

function runTar(root: string): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "tar",
      ["-czf", "-", "--exclude", "node_modules", "--exclude", ".git", "-C", root, "."],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    const chunks: Buffer[] = [];
    const errors: Buffer[] = [];
    child.stdout.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      errors.push(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        const detail = Buffer.concat(errors).toString("utf8").trim();
        reject(new Error(detail.length > 0 ? detail : `tar exited ${code ?? "null"}.`));
        return;
      }
      resolve(new Uint8Array(Buffer.concat(chunks)));
    });
  });
}
