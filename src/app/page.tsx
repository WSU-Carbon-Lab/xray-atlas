import React from "react";
import { MoleculeRegistry } from "~/app/_components/molecule";

export const dynamic = "force-dynamic";

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
