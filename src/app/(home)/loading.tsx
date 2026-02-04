import { MoleculeGridSkeleton } from "@/components/feedback/loading-state";
import { MoleculeSearch } from "@/components/molecules/molecule-search";
import { DefaultButton as Button } from "@/components/ui/button";
import Link from "next/link";
import { Search, Upload } from "lucide-react";

const CONTENT_MAX_WIDTH = "max-w-7xl";

export default function HomeLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      <section className="border-b border-gray-200 from-gray-50 to-white py-16 sm:py-24 dark:border-gray-700 dark:from-gray-900 dark:to-gray-800">
        <div className={`mx-auto w-full ${CONTENT_MAX_WIDTH} px-4`}>
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="mb-4 text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl dark:text-gray-100">
              X-ray Atlas
            </h1>
            <p className="mb-8 text-lg text-gray-600 sm:text-xl dark:text-gray-400">
              Advancing material research through collaborative data.
            </p>
            <div className="mb-8 flex justify-center">
              <MoleculeSearch
                placeholder="Search molecules by name, formula, CAS number..."
                className="w-full max-w-2xl"
              />
            </div>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/contribute">
                <Button variant="primary" className="w-full sm:w-auto">
                  <Upload className="mr-2 h-4 w-4" />
                  Contribute
                </Button>
              </Link>
              <Link href="/browse">
                <Button variant="outline" className="w-full sm:w-auto">
                  <Search className="mr-2 h-4 w-4" />
                  Browse Database
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
      <section className={`mx-auto w-full ${CONTENT_MAX_WIDTH} px-4 py-12`}>
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl dark:text-gray-100">
            Popular Molecules
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Explore our most popular molecules.
          </p>
        </div>
        <MoleculeGridSkeleton count={4} variant="full" />
      </section>
    </div>
  );
}
