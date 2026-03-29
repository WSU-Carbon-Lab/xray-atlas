import { notFound } from "next/navigation";
import { api } from "~/trpc/server";
import { MoleculeDetailLayoutClient } from "@/components/browse/molecule-detail-layout-client";
import Link from "next/link";
import { canonicalMoleculeSlugFromView, slugifyMoleculeSynonym } from "~/lib/molecule-slug";

function isSlugCollision(
  v: Awaited<ReturnType<typeof api.molecules.getBySlug>>,
): v is {
  kind: "slug_collision";
  slug: string;
  candidates: Array<{ id: string; name: string; iupacName: string; slug: string }>;
} {
  return typeof v === "object" && v != null && "kind" in v;
}

export default async function MoleculeDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id: routeId } = await params;
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      routeId,
    );

  let molecule: Awaited<ReturnType<typeof api.molecules.getById>> | null = null;

  if (isUuid) {
    try {
      molecule = await api.molecules.getById({ id: routeId });
    } catch (err: unknown) {
      const code = (err as { data?: { code?: string } })?.data?.code;
      if (code === "NOT_FOUND") notFound();
      throw err;
    }
  } else {
    const normalizedSlug = slugifyMoleculeSynonym(routeId);
    const result = await api.molecules.getBySlug({ slug: normalizedSlug });
    if (isSlugCollision(result)) {
      const collision = result;
      return (
        <div className="py-8">
          <div className="mx-auto max-w-3xl space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white p-8 dark:border-gray-700 dark:bg-gray-800">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Molecule name collision
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                The molecule slug &quot;{collision.slug}&quot; matches multiple molecules. Pick the
                correct molecule below.
              </p>
              <div className="mt-6 space-y-2">
                {collision.candidates.map((c) => (
                  <Link
                    key={c.id}
                    href={`/molecules/${c.slug}`}
                    className="block rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-100 dark:hover:bg-gray-900/50"
                  >
                    <div className="font-semibold">{c.name}</div>
                    <div className="mt-1 font-mono text-xs text-gray-600 dark:text-gray-400">
                      {c.iupacName}
                    </div>
                  </Link>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap gap-4 text-sm">
                <Link
                  href="/browse/molecules"
                  className="hover:text-accent dark:hover:text-accent-light font-medium text-gray-600 dark:text-gray-400"
                >
                  Browse molecules
                </Link>
                <Link
                  href="/"
                  className="hover:text-accent dark:hover:text-accent-light font-medium text-gray-600 dark:text-gray-400"
                >
                  Back to home
                </Link>
              </div>
            </div>
          </div>
        </div>
      );
    }
    molecule = result;
  }

  if (!molecule) notFound();

  const canonicalSlug = canonicalMoleculeSlugFromView(molecule);
  if (!isUuid && routeId !== canonicalSlug) {
    // Intentionally not redirecting yet; we keep behavior stable until we decide
    // whether canonical redirects are desired in this route.
  }

  return (
    <MoleculeDetailLayoutClient molecule={molecule} moleculeId={molecule.id}>
      {children}
    </MoleculeDetailLayoutClient>
  );
}
