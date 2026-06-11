import Link from "next/link";
import { buttonVariants, cn } from "@heroui/styles";

import { MoleculeDrawLab } from "~/features/molecule-sketcher";

/**
 * Sandbox route for the ChemDraw-style interactive molecule drawer.
 */
export default function SandboxMoleculeDrawPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4">
      <div>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Molecule drawer
        </h1>
        <p className="text-muted mt-2 max-w-2xl text-sm">
          Draw structures interactively, stabilize bond angles, export canonical
          SMILES, and classify polymer blocks with bookends or chunk cuts.
        </p>
      </div>
      <MoleculeDrawLab />
      <div className="flex flex-wrap gap-3">
        <Link
          href="/sandbox/molecule-structure"
          className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
        >
          Catalog + fragmentation lab
        </Link>
        <Link
          href="/sandbox"
          className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
        >
          Back to Sandbox
        </Link>
      </div>
    </div>
  );
}
