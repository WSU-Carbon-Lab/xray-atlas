import React from "react";
import { MoleculeInfoCard } from "~/app/_components/molecule";
import { NexafsTable } from "~/app/_components/nexafs";
import { getMolecule } from "~/server/queries";

export default async function Page({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const name = (await params).name;
  const molecule = await getMolecule(name);
  return (
    <div className="overflow-none flex h-screen justify-center ...">
      <div className="flex w-full justify-center md:max-w-2xl ...">
        <div className="h-50 mb-4 w-full gap-2 ...">
          <MoleculeInfoCard
            molecule={molecule}
            className="h-50 mb-4 w-full ..."
          />
          <NexafsTable molecule={molecule} className="h-50 mb-4 ..." />
        </div>
      </div>
    </div>
  );
}
