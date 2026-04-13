import Link from "next/link";
import { buttonVariants, cn } from "@heroui/styles";
import { MoleculeSketcherLab } from "~/features/molecule-sketcher";

/**
 * Molecule structure lab: load catalog molecules, preview stored SVGs, and host
 * the future in-browser sketcher without using production contribute flows.
 */
export default function SandboxMoleculeStructurePage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4">
      <div>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Molecule structure lab
        </h1>
        <p className="text-muted mt-2 max-w-2xl text-sm">
          Prototype surface for the structure pipeline. Nothing here is guaranteed
          to be stable.
        </p>
      </div>
      <MoleculeSketcherLab />
      <div className="flex flex-wrap gap-3">
        <Link
          href="/sandbox"
          className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
        >
          Back to Sandbox
        </Link>
        <Link
          href="/"
          className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
