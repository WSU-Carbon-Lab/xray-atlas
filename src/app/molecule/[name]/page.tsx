import React from "react";
import type { Metadata } from "next";
import { MoleculeDisplay } from "~/app/_components/molecule";
import { NexafsTable } from "~/app/_components/nexafs-table";
import { getMolecule } from "~/server/queries";

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ name: string }>;
}): Promise<Metadata> => {
  // Fetch molecule data
  const paramsResolved = await params;
  const molecule = await getMolecule(paramsResolved.name);

  return {
    title: `${molecule.name} | Xray Atlas`,
    description:
      molecule.description || "X-ray spectroscopy data for this molecule",
    openGraph: {
      title: `${molecule.name} | Xray Atlas`,
      description:
        molecule.description || "X-ray spectroscopy data for this molecule",
      images: [
        {
          url: molecule.img,
          width: 1200,
          height: 630,
          alt: `${molecule.name} structure`,
        },
      ],
    },
  };
};

export default async function Page({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const paramsResolved = await params;
  const molecule = await getMolecule(paramsResolved.name);
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex w-full flex-col gap-8 lg:flex-row">
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
