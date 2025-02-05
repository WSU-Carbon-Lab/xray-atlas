// app/molecules/page.tsx (Server Component)
import { getMolecules } from "~/server/queries";
import { MoleculeRegistry } from "./_components/molecul-registry";

export default async function MoleculesPage() {
  const molecules = await getMolecules();

  return (
    <div className="container mx-auto px-4 py-8">
      <MoleculeRegistry molecules={molecules} />
    </div>
  );
}
