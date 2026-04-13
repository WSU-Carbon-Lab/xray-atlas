import path from "node:path";
import { createRequire } from "node:module";
import { Molecule, Resources } from "openchemlib";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";

let oclResourcesRegistered = false;

const require = createRequire(import.meta.url);

/**
 * Absolute path to `openchemlib/dist/resources.json`. The library's default
 * `registerFromNodejs()` breaks under Next.js bundling (undefined path); resolving
 * from the installed package matches `/api/ocl-resources` and local `bun` tests.
 */
function openChemLibResourcesPath(): string {
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

function ensureOclResources(): void {
  if (oclResourcesRegistered) {
    return;
  }
  Resources.registerFromNodejs(openChemLibResourcesPath());
  oclResourcesRegistered = true;
}

/**
 * Cheminformatics helpers for the molecule sketcher pipeline (lab and future
 * contribute flows). Uses OpenChemLib on the server for deterministic parsing.
 */
export const moleculeStructureRouter = createTRPCRouter({
  /**
   * Parses an MDL molfile (V2000 or V3000), then returns OpenChemLib isomeric
   * SMILES and a stable OCL idcode for the current graph. Rejects malformed
   * structures with `BAD_REQUEST` (salts, multi-fragment edge cases may still
   * parse; see product rules for multi-component handling later).
   *
   * @param input.molfile - Raw molfile text from the sketcher export (size-capped).
   */
  canonicalizeMolfile: protectedProcedure
    .input(
      z.object({
        molfile: z.string().min(1).max(512_000),
      }),
    )
    .mutation(({ input }) => {
      ensureOclResources();
      try {
        const mol = Molecule.fromMolfile(input.molfile);
        const isomericSmiles = mol.toIsomericSmiles();
        const idCode = mol.getIDCode();
        return { isomericSmiles, idCode };
      } catch (cause) {
        const detail =
          cause instanceof Error ? cause.message : "Invalid molfile or structure.";
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Structure parse failed: ${detail}`,
          cause,
        });
      }
    }),
});
