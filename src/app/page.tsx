"use client";

import Link from "next/link";
import { Upload, Search } from "lucide-react";
import { MoleculeSearch } from "./components/MoleculeSearch";
import { MoleculeDisplay, type DisplayMolecule } from "./components/MoleculeDisplay";
import { MoleculeGridSkeleton } from "./components/LoadingState";
import { ErrorState } from "./components/ErrorState";
import { DefaultButton as Button } from "./components/Button";
import { trpc } from "~/trpc/client";
import { useRouter } from "next/navigation";

function TopUpvotedMolecules() {
  const router = useRouter();
  const { data, isLoading, isError, error } = trpc.molecules.getTopUpvoted.useQuery({
    limit: 4,
  });

  if (isLoading) {
    return <MoleculeGridSkeleton count={4} />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to load molecules"
        message={error?.message || "An error occurred while loading molecules."}
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (!data || data.molecules.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
        <p className="text-gray-600 dark:text-gray-400">
          No molecules found in the database.
        </p>
      </div>
    );
  }

  // Transform to DisplayMolecule format
  const displayMolecules = data.molecules.map((molecule) => {
    const synonyms = molecule.moleculesynonyms.map((s) => s.synonym);
    const primarySynonym = molecule.moleculesynonyms.find((s) => s.order === 0);
    const displayName = primarySynonym?.synonym ?? synonyms[0] ?? molecule.iupacname;

    return {
      name: displayName,
      commonName: synonyms.length > 0 ? synonyms : undefined,
      chemical_formula: molecule.chemicalformula,
      SMILES: molecule.smiles,
      InChI: molecule.inchi,
      pubChemCid: molecule.pubchemcid,
      casNumber: molecule.casnumber,
      imageUrl: molecule.imageurl ?? undefined,
      id: molecule.id,
      upvoteCount: molecule.upvoteCount,
      userHasUpvoted: false,
      createdBy: null,
    } satisfies DisplayMolecule;
  });

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {displayMolecules.map((molecule) => (
        <div
          key={molecule.id}
          onClick={() => router.push(`/molecules/${molecule.id}`)}
          className="cursor-pointer transition-transform hover:scale-[1.02]"
        >
          <MoleculeDisplay molecule={molecule} />
        </div>
      ))}
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <section className="border-b border-gray-200 from-gray-50 to-white py-16 sm:py-24 dark:border-gray-700 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="mb-4 text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl dark:text-gray-100">
              X-ray Atlas
            </h1>
            <p className="mb-8 text-lg text-gray-600 sm:text-xl dark:text-gray-400">
              Advancing material research through collaborative data.
            </p>

            {/* Search Bar */}
            <div className="mb-8 flex justify-center">
              <MoleculeSearch
                placeholder="Search molecules by name, formula, CAS number..."
                className="w-full max-w-2xl"
              />
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/contribute">
                <Button variant="solid" className="w-full sm:w-auto">
                  <Upload className="mr-2 h-4 w-4" />
                  Contribute
                </Button>
              </Link>
              <Link href="/browse">
                <Button variant="bordered" className="w-full sm:w-auto">
                  <Search className="mr-2 h-4 w-4" />
                  Browse Database
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Top Upvoted Molecules */}
      <section className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl dark:text-gray-100">
            Most Upvoted Molecules
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Explore our most popular molecules with X-ray absorption
            spectroscopy data.
          </p>
        </div>
        <TopUpvotedMolecules />
      </section>
    </div>
  );
}
