import { type Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { api } from "~/trpc/server";
import { MoleculeDetailLayoutClient } from "@/components/browse/molecule-detail-layout-client";
import Link from "next/link";
import { canonicalMoleculeSlugFromView, slugifyMoleculeSynonym } from "~/lib/molecule-slug";
import {
  buildMoleculeChemicalSubstanceJsonLd,
  buildMoleculeDetailSeoText,
  serializeMoleculeJsonLdScriptContent,
} from "~/lib/molecule-schema-org";

function isSlugCollision(
  v: Awaited<ReturnType<typeof api.molecules.getBySlug>>,
): v is {
  kind: "slug_collision";
  slug: string;
  candidates: Array<{ id: string; name: string; iupacName: string; slug: string }>;
} {
  return typeof v === "object" && v != null && "kind" in v;
}

async function resolveMoleculeByRouteId(routeId: string) {
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      routeId,
    );

  if (isUuid) {
    return await api.molecules.getById({ id: routeId });
  }

  const normalizedSlug = slugifyMoleculeSynonym(routeId);
  return await api.molecules.getBySlug({ slug: normalizedSlug });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id: routeId } = await params;

  try {
    const resolved = await resolveMoleculeByRouteId(routeId);
    if (!resolved || isSlugCollision(resolved)) {
      return {
        title: "Molecule not found",
        robots: { index: false, follow: false },
      };
    }

    const canonicalSlug = canonicalMoleculeSlugFromView(resolved);
    const { title, description } = buildMoleculeDetailSeoText(resolved);
    const moleculeName = resolved.name.trim();

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
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      routeId,
    );

  let molecule: Awaited<ReturnType<typeof api.molecules.getById>> | null = null;

  try {
    const resolved = await resolveMoleculeByRouteId(routeId);
    if (isSlugCollision(resolved)) {
      const collision = resolved;
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
    molecule = resolved;
  } catch (err: unknown) {
    const code = (err as { data?: { code?: string } })?.data?.code;
    if (code === "NOT_FOUND") notFound();
    throw err;
  }

  if (!molecule) notFound();

  const canonicalSlug = canonicalMoleculeSlugFromView(molecule);
  if (isUuid || routeId !== canonicalSlug) {
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
