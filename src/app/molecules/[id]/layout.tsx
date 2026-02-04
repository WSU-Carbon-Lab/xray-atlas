import { notFound } from "next/navigation";
import { api } from "~/trpc/server";
import { MoleculeDetailLayoutClient } from "@/components/browse/molecule-detail-layout-client";

export default async function MoleculeDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id: moleculeId } = await params;
  let molecule;
  try {
    molecule = await api.molecules.getById({ id: moleculeId });
  } catch (err: unknown) {
    const code = (err as { data?: { code?: string } })?.data?.code;
    if (code === "NOT_FOUND") {
      notFound();
    }
    throw err;
  }
  if (!molecule) {
    notFound();
  }
  return (
    <MoleculeDetailLayoutClient molecule={molecule} moleculeId={moleculeId}>
      {children}
    </MoleculeDetailLayoutClient>
  );
}
