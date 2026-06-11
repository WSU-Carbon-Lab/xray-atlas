/**
 * Node/Bun OpenChemLib resource registration for tests and server-side callers.
 * Resolves `resources.json` from the installed package (same file as `/api/ocl-resources`).
 */

import { createRequire } from "node:module";
import path from "node:path";

import { Resources } from "openchemlib";

let nodeResourcesRegistered = false;

/**
 * Resolves the absolute path to `openchemlib/dist/resources.json`.
 *
 * @returns Filesystem path to the bundled MMFF and conformer resource tables.
 */
export function openChemLibResourcesPath(): string {
  const require = createRequire(import.meta.url);
  try {
    const main = require.resolve("openchemlib");
    return path.join(path.dirname(main), "resources.json");
  } catch {
    return path.join(
      process.cwd(),
      "node_modules",
      "openchemlib",
      "dist",
      "resources.json",
    );
  }
}

/**
 * Registers OpenChemLib static resources in Node/Bun runtimes (tests, scripts).
 * No-op after the first successful registration in the process.
 */
export function ensureOclResourcesNode(): void {
  if (nodeResourcesRegistered) {
    return;
  }
  Resources.registerFromNodejs(openChemLibResourcesPath());
  nodeResourcesRegistered = true;
}
