import React from "react";
import { s3, s3List, registry } from "~/server/db";
import { MoleculeRegistry } from "~/app/_components/molecule";

export const dynamic = "force-dynamic";

function test() {
  const mols = registry;
  const list = s3List;
  console.log(list);
  console.log(mols);
  return null;
}

export default function HomePage() {
  return (
    <div className="... overflow-none flex h-full justify-center">
      <div className="... flex h-full w-full justify-center md:max-w-2xl">
        {<MoleculeRegistry />}
        {/* {test()} */}
      </div>
    </div>
  );
}
