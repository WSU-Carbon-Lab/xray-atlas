import React from "react";
import { MoleculeInfoCard } from "~/app/_components/molecule";
import { NexafsTable } from "~/app/_components/nexafs";
import { data } from "~/server/db";

export default async function Page({ params }: { params: { name: string } }) {
  const molecule = await data(params.name);
  if (!molecule) {
    return <div>404</div>;
  }
  return (
    <div className="... overflow-none flex h-screen justify-center bg-blue-50">
      <div className="... flex w-full justify-center bg-red-50 md:max-w-2xl">
        <div className="... h-50 mb-4 w-full gap-2">
          <MoleculeInfoCard
            molecule={molecule.header}
            className="... h-50 mb-4 w-full"
          />
          <NexafsTable molecule={molecule} />
        </div>
      </div>
    </div>
  );
}
