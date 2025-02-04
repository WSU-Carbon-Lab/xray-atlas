// This remains a server component
import { getMolecules } from "~/server/queries";
import { MoleculeInfoCard } from "./molecule";

export const MoleculeRegistry = async () => {
  const molecules = await getMolecules();
  return (
    <div className="grid h-full w-full grid-cols-1 gap-8 lg:grid-cols-2 xl:grid-cols-3 2xl:gap-10">
      {molecules.map((molecule) => (
        <MoleculeInfoCard
          molecule={molecule}
          key={molecule.name}
          className="hover:shadow-blue-100/30"
        />
      ))}
    </div>
  );
};
