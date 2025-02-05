import React from "react";
import { MoleculeDisplay } from "~/app/_components/molecule";
import { NexafsTable } from "~/app/_components/nexafs_table";
import { getMolecule } from "~/server/queries";

export default async function Page({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const name = (await params).name;
  const molecule = await getMolecule(name);
  return (
    <div className="mx-auto max-w-[1800px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Sidebar - Molecule Card */}
        <div className="w-full lg:w-[400px] xl:w-[450px]">
          <div className="sticky top-8">
            <MoleculeDisplay molecule={molecule} />
          </div>
        </div>

        {/* Main Content - Table */}
        <div className="flex-1">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-6 text-2xl font-semibold text-gray-900">
              Experimental Data
            </h2>
            <NexafsTable molecule={molecule} />
          </div>
        </div>
      </div>
    </div>
  );
}
