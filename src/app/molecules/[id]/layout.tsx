import { type Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { MoleculeDetailLayoutClient } from "~/components/browse/molecule-detail-layout-client";
import Link from "next/link";
import { canonicalMoleculeSlugFromView } from "~/lib/molecule-slug";
import {
  buildMoleculeChemicalSubstanceJsonLd,
  buildMoleculeDetailSeoText,
  serializeMoleculeJsonLdScriptContent,
} from "~/lib/molecule-schema-org";
import {
  moleculeRouteNeedsCanonicalRedirect,
  resolveMoleculeByRouteId,
} from "./molecule-detail-request";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id: routeId } = await params;

  try {
    const resolved = await resolveMoleculeByRouteId(routeId);
    if (resolved.status !== "found") {
      return {
        title: "Molecule not found",
        robots: { index: false, follow: false },
      };
    }

    const molecule = resolved.molecule;
    const canonicalSlug = canonicalMoleculeSlugFromView(molecule);
    const { title, description } = buildMoleculeDetailSeoText(molecule);
    const moleculeName = molecule.name.trim();

    return {
      title,
      description,
      alternates: {
        canonical: `/molecules/${canonicalSlug}`,
      },
      openGraph: {
        title: `${moleculeName} | X-ray Atlas`,
        description,
        url: `/molecules/${canonicalSlug}`,
      },
      twitter: {
        card: "summary_large_image",
        title: `${moleculeName} | X-ray Atlas`,
        description,
      },
    };
  } catch {
    return {
      title: "Molecule not found",
      robots: { index: false, follow: false },
    };
  }
}

export default async function MoleculeDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id: routeId } = await params;

  let resolved: Awaited<ReturnType<typeof resolveMoleculeByRouteId>>;
  try {
    resolved = await resolveMoleculeByRouteId(routeId);
  } catch (err: unknown) {
    const record = err as { code?: string; data?: { code?: string } };
    const code = record.code ?? record.data?.code;
    if (code === "NOT_FOUND") notFound();
    throw err;
  }

  if (resolved.status === "not_found") notFound();
  if (resolved.status === "collision") {
    const collision = resolved.collision;
    return (
        <div className="py-8">
          <div className="mx-auto max-w-3xl space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white p-8 dark:border-gray-700 dark:bg-gray-800">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Molecule name collision
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                The molecule slug &quot;{collision.slug}&quot; matches multiple
                molecules. Pick the correct molecule below.
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

  const molecule = resolved.molecule;
  const canonicalSlug = canonicalMoleculeSlugFromView(molecule);
  if (moleculeRouteNeedsCanonicalRedirect(routeId, canonicalSlug)) {
    redirect(`/molecules/${canonicalSlug}`);
  }

  const moleculeJsonLd = serializeMoleculeJsonLdScriptContent(
    buildMoleculeChemicalSubstanceJsonLd(molecule, canonicalSlug),
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: moleculeJsonLd }}
      />
      <MoleculeDetailLayoutClient molecule={molecule} moleculeId={molecule.id}>
        {children}
      </MoleculeDetailLayoutClient>
    </>
  );
}
