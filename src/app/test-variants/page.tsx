"use client";

import { useState } from "react";
import { trpc } from "~/trpc/client";
import {
  MoleculeDisplayHero,
  MoleculeDisplaySideBySide,
  MoleculeDisplayCompact,
} from "~/app/components/MoleculeDisplayVariants";
import { MoleculeDisplay } from "~/app/components/MoleculeDisplay";
import { MoleculeGridSkeleton } from "~/app/components/LoadingState";
import type { DisplayMolecule } from "~/app/components/MoleculeDisplay";

export default function TestVariantsPage() {
  const [variant, setVariant] = useState<"original" | "hero" | "sidebyside" | "compact">("hero");

  const { data, isLoading } = trpc.molecules.list.useQuery({
    limit: 4,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <MoleculeGridSkeleton count={4} />
      </div>
    );
  }

  const molecules = data?.molecules ?? [];
  if (molecules.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-gray-600 dark:text-gray-400">No molecules found.</p>
      </div>
    );
  }

  // Transform to DisplayMolecule format
  const transformMolecule = (
    molecule: (typeof molecules)[0],
  ): DisplayMolecule | null => {
    if (!molecule) return null;

    const allSynonyms = molecule.moleculesynonyms.map(
      (s: { synonym: string }) => s.synonym,
    );

    return {
      name: molecule.iupacname,
      commonName: allSynonyms.length > 0 ? allSynonyms : undefined,
      chemical_formula: molecule.chemicalformula,
      SMILES: molecule.smiles,
      InChI: molecule.inchi,
      pubChemCid: molecule.pubchemcid,
      casNumber: molecule.casnumber,
      imageUrl: (molecule as { imageurl?: string }).imageurl ?? undefined,
      experimentCount: 5, // Mock data for testing
    };
  };

  const displayMolecules = molecules
    .map(transformMolecule)
    .filter((m): m is DisplayMolecule => m !== null);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-4 text-3xl font-bold text-gray-900 dark:text-gray-100">
          Molecule Display Variants
        </h1>
        <p className="mb-6 text-gray-600 dark:text-gray-400">
          Test different visualization approaches inspired by Apple&apos;s Liquid Glass design system.
        </p>

        {/* Variant Selector */}
        <div className="mb-8 flex flex-wrap gap-3">
          <button
            onClick={() => setVariant("original")}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
              variant === "original"
                ? "border-wsu-crimson bg-wsu-crimson text-white"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            Original
          </button>
          <button
            onClick={() => setVariant("hero")}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
              variant === "hero"
                ? "border-wsu-crimson bg-wsu-crimson text-white"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            Hero (Image-First)
          </button>
          <button
            onClick={() => setVariant("sidebyside")}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
              variant === "sidebyside"
                ? "border-wsu-crimson bg-wsu-crimson text-white"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            Side-by-Side
          </button>
          <button
            onClick={() => setVariant("compact")}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
              variant === "compact"
                ? "border-wsu-crimson bg-wsu-crimson text-white"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            Compact
          </button>
        </div>
      </div>

      {/* Display Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {displayMolecules.map((molecule) => {
          if (variant === "original") {
            return (
              <MoleculeDisplay key={molecule.name} molecule={molecule} />
            );
          }
          if (variant === "hero") {
            return (
              <MoleculeDisplayHero key={molecule.name} molecule={molecule} />
            );
          }
          if (variant === "sidebyside") {
            return (
              <MoleculeDisplaySideBySide
                key={molecule.name}
                molecule={molecule}
              />
            );
          }
          if (variant === "compact") {
            return (
              <MoleculeDisplayCompact key={molecule.name} molecule={molecule} />
            );
          }
          return null;
        })}
      </div>

      {/* Variant Descriptions */}
      <div className="mt-12 space-y-6 rounded-xl border border-gray-200 bg-white/80 backdrop-blur-xl p-6 dark:border-gray-700 dark:bg-gray-800/80">
        <div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
            Design Philosophy
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            These variants are inspired by Apple&apos;s{" "}
            <a
              href="https://developer.apple.com/videos/play/wwdc2025/356/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-wsu-crimson hover:underline"
            >
              Liquid Glass design system
            </a>
            , emphasizing:
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-gray-600 dark:text-gray-400">
            <li>
              <strong>Concentricity:</strong> Shapes that nest comfortably using
              aligned radii and margins
            </li>
            <li>
              <strong>Liquid Glass:</strong> Backdrop blur effects creating
              depth and separation
            </li>
            <li>
              <strong>Image Prominence:</strong> Making the molecule structure
              the visual hero
            </li>
            <li>
              <strong>Content-First:</strong> UI supports interaction without
              stealing focus
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
            Variant Details
          </h3>
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <div>
              <strong className="text-gray-900 dark:text-gray-100">Hero:</strong>{" "}
              Large hero image with content floating below on a liquid glass
              background. Best for detailed views and single molecule focus.
            </div>
            <div>
              <strong className="text-gray-900 dark:text-gray-100">
                Side-by-Side:
              </strong>{" "}
              Image on left, content on right. Good for wider layouts and
              balanced information display.
            </div>
            <div>
              <strong className="text-gray-900 dark:text-gray-100">
                Compact:
              </strong>{" "}
              Space-efficient with thumbnail image. Perfect for grid layouts
              and list views.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
