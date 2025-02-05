import React from "react";
import { MoleculeRegistry } from "~/app/_components/molecul-registry";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <div className="overflow-none flex h-full justify-center ...">
      <div className="flex h-full w-full justify-center ...">
        {/* TXS Error */}
        {<MoleculeRegistry />}
        {/* {test()} */}
      </div>
    </div>
  );
}
