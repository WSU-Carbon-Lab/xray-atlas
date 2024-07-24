import React from "react";
import { MoleculePost } from "~/app/_components/molecule";
import { SamplePicker, ExperimentPicker } from "~/app/_components/nexafs";
import { getMolecule } from "~/server/queries";

export default async function Page({ params }: { params: { name: string } }) {
  const molecule = await getMolecule(params.name);
  if (!molecule) {
    return <div>404</div>;
  }
  return (
    <div className="... overflow-none flex h-screen justify-center">
      <div className="... flex w-full justify-center md:max-w-2xl">
        <div className="... h-50 mb-4 w-full gap-2 bg-green-50">
          <MoleculePost
            molecule={molecule}
            className="... h-50 mb-4 w-full bg-red-50"
          />
          <div className="h-50 mb-4 w-full bg-red-400"></div>
        </div>
      </div>
    </div>
  );
}
