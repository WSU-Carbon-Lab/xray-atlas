"use client";

import Link from "next/link";
import { Upload, Search } from "lucide-react";
import { MoleculeSearch } from "./components/MoleculeSearch";
import { MoleculeGrid } from "./components/MoleculeGrid";
import { DefaultButton as Button } from "./components/Button";

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
              <Link href="/upload">
                <Button variant="solid" className="w-full sm:w-auto">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Data
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

      {/* Featured Molecules Grid */}
      <section className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl dark:text-gray-100">
            Featured Molecules
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Explore our collection of molecules with X-ray absorption
            spectroscopy data.
          </p>
        </div>
        <MoleculeGrid limit={12} enableInfiniteScroll={true} />
      </section>
    </div>
  );
}
