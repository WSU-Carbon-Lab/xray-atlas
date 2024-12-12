import React from "react";
import { MoleculeInfoCard } from "~/app/_components/molecule";
import { NexafsTable } from "~/app/_components/nexafs";
import { getMolecule } from "~/server/queries";

type Params = Promise<{ slug: string }>;

export default async function Page(props: { params: Params }) {
  const params = await props.params;
  const name = params.slug;
  const molecule = await getMolecule(name);
  console.log(molecule);
  return (
    <div className="... overflow-none flex h-screen justify-center">
      <div className="... flex w-full justify-center md:max-w-2xl">
        <div className="... h-50 mb-4 w-full gap-2">
          <MoleculeInfoCard
            molecule={molecule}
            className="... h-50 mb-4 w-full"
          />
          <NexafsTable molecule={molecule} className="... h-50 mb-4" />
        </div>
      </div>
    </div>
  );
}
