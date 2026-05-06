/**
 * About landing route presenting the database mission, documentation entry points,
 * stewardship listings, and collaboration calls-to-action.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { api } from "~/trpc/server";
import { AvatarGroup } from "~/components/ui/avatar";
import {
  ArrowTopRightOnSquareIcon,
  AcademicCapIcon,
  BookOpenIcon,
  InformationCircleIcon,
  RectangleStackIcon,
  SparklesIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";

export const metadata: Metadata = {
  title: "About Xray Atlas",
  description:
    "Learn the mission, data scope, and scientific workflows supported by the Xray Atlas NEXAFS and X-ray spectroscopy database.",
};

const aboutResourceCards = [
  {
    href: "/about/nexafs-wiki",
    title: "NEXAFS wiki (work in progress)",
    description:
      "Living reference for NEXAFS concepts, terminology, and spectroscopy workflows used throughout the platform.",
    icon: BookOpenIcon,
  },
  {
    href: "/about/data-representation",
    title: "Data representation and structure",
    description:
      "How molecules, samples, spectra, provenance fields, and quality signals are represented in the database.",
    icon: RectangleStackIcon,
  },
  {
    href: "/about/platform-features",
    title: "Platform features",
    description:
      "Search, browse, filtering, visualization, and analysis capabilities for NEXAFS and related X-ray datasets.",
    icon: SparklesIcon,
  },
  {
    href: "/about/contributions",
    title: "Database contributions",
    description:
      "Guidance for dataset contributors, metadata expectations, attribution, and scientific reproducibility practices.",
    icon: ArrowTopRightOnSquareIcon,
  },
] as const;

export default async function AboutPage() {
  const [collaboratorsData, coreMaintainers] = await Promise.all([
    api.collaborators.getAll(),
    api.users.getCoreMaintainers(),
  ]);

  const administrators = coreMaintainers.filter(
    (user) => user.lineageRoleSlug === "administrator",
  );
  const maintainers = coreMaintainers.filter(
    (user) => user.lineageRoleSlug === "maintainer",
  );
  const lineageUnassigned = coreMaintainers.filter(
    (user) => user.lineageRoleSlug === null,
  );

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 space-y-4 text-center">
          <h1 className="text-foreground mb-2 text-4xl font-bold sm:text-5xl">
            About X-ray Atlas
          </h1>
          <p className="text-muted mx-auto max-w-3xl text-lg">
            X-ray Atlas is an open NEXAFS and X-ray spectroscopy database that
            helps researchers discover, compare, and reuse molecule-resolved
            spectra with rich experimental metadata, facility provenance, and
            reproducible contribution workflows.
          </p>
          <p className="text-muted mx-auto max-w-3xl text-base">
            Our mission is to accelerate materials, chemistry, and soft-matter
            research by connecting high-quality spectroscopy datasets with the
            context needed for scientific interpretation and citation.
          </p>
        </div>

        <div className="space-y-12">
          <section>
            <h2 className="text-foreground mb-4 flex items-center gap-2 text-2xl font-semibold">
              <InformationCircleIcon className="text-accent h-6 w-6" />
              What the database includes
            </h2>
            <div className="text-muted space-y-4">
              <p>
                X-ray Atlas includes molecule records, sample descriptors, and
                spectrum traces with linked experimental conditions such as edge
                selection, geometry, instrument, facility, and detection mode.
              </p>
              <p>
                The platform is optimized for query-driven scientific use cases:
                finding comparable NEXAFS datasets, validating assignments
                across sources, and tracing data provenance from uploaded
                experiments to reusable, citable records.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-foreground mb-4 flex items-center gap-2 text-2xl font-semibold">
              <BookOpenIcon className="text-accent h-6 w-6" />
              Explore the documentation pages
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {aboutResourceCards.map((card) => (
                <Link
                  key={card.href}
                  href={card.href}
                  className="border-border bg-surface hover:bg-default rounded-lg border p-4 transition-colors"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <card.icon className="text-accent h-5 w-5" />
                    <h3 className="text-foreground font-semibold">{card.title}</h3>
                  </div>
                  <p className="text-muted text-sm">{card.description}</p>
                </Link>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-foreground mb-4 flex items-center gap-2 text-2xl font-semibold">
              <AcademicCapIcon className="text-accent h-6 w-6" />
              Maintainers and collaborators
            </h2>
            <div className="space-y-6">
              <div className="space-y-6">
                <div className="space-y-3">
                  <h3 className="text-foreground text-lg font-semibold">
                    Administrators
                  </h3>
                  <p className="text-muted text-sm">
                    Users assigned the administrator lineage role steward platform
                    operations alongside dataset publishing workflows.
                  </p>
                  {administrators.length > 0 ? (
                    <div className="space-y-3">
                      <AvatarGroup
                        users={administrators.map((user) => ({
                          id: user.id,
                          name: user.name ?? "User",
                          image: user.image,
                        }))}
                        size="md"
                        max={12}
                        tooltipVariant="name"
                      />
                      <ul className="text-muted grid gap-1 text-sm sm:grid-cols-2">
                        {administrators.map((user) => (
                          <li key={user.id}>
                            <Link
                              href={`/users/${user.id}`}
                              className="text-accent hover:underline"
                            >
                              {user.name ?? "User"}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-muted text-sm">
                      No administrators are listed yet.
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <h3 className="text-foreground text-lg font-semibold">
                    Core maintainers
                  </h3>
                  <p className="text-muted text-sm">
                    Maintainers guide scientific direction, review contributions,
                    and coordinate releases for the open spectroscopy catalog.
                  </p>
                  {maintainers.length > 0 || lineageUnassigned.length > 0 ? (
                    <div className="space-y-3">
                      <AvatarGroup
                        users={[...maintainers, ...lineageUnassigned].map((user) => ({
                          id: user.id,
                          name: user.name ?? "User",
                          image: user.image,
                        }))}
                        size="md"
                        max={12}
                        tooltipVariant="name"
                      />
                      <ul className="text-muted grid gap-1 text-sm sm:grid-cols-2">
                        {[...maintainers, ...lineageUnassigned].map((user) => (
                          <li key={user.id}>
                            <Link
                              href={`/users/${user.id}`}
                              className="text-accent hover:underline"
                            >
                              {user.name ?? "User"}
                            </Link>
                          </li>
                        ))}
                      </ul>
                      {lineageUnassigned.length > 0 ? (
                        <p className="text-muted text-xs">
                          Some stewardship profiles are shown here while lineage role
                          metadata finishes syncing.
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-muted text-sm">
                      Maintainer profiles will appear here as lineage roles are
                      assigned.
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-foreground text-lg font-semibold">
                  Project hosts and collaborators
                </h3>
                <div className="text-muted grid gap-4 sm:grid-cols-2">
                  <div>
                    <h4 className="text-foreground mb-2 font-medium">Hosted by</h4>
                    {collaboratorsData.hosts.length > 0 ? (
                      <ul className="space-y-1 text-sm">
                        {collaboratorsData.hosts.map((host) => (
                          <li key={host.id}>
                            {host.url ? (
                              <Link
                                href={host.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-accent hover:underline"
                              >
                                {host.name}
                              </Link>
                            ) : (
                              <span>{host.name}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm">No hosts listed yet.</p>
                    )}
                  </div>
                  <div>
                    <h4 className="text-foreground mb-2 font-medium">
                      Collaborators
                    </h4>
                    {collaboratorsData.collaborators.length > 0 ? (
                      <ul className="space-y-1 text-sm">
                        {collaboratorsData.collaborators.map((collaborator) => (
                          <li key={collaborator.id}>
                            {collaborator.url ? (
                              <Link
                                href={collaborator.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-accent hover:underline"
                              >
                                {collaborator.name}
                              </Link>
                            ) : (
                              <span>{collaborator.name}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm">No collaborators listed yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-foreground mb-4 flex items-center gap-2 text-2xl font-semibold">
              <UserGroupIcon className="text-accent h-6 w-6" />
              Join the project
            </h2>
            <div className="space-y-4">
              <p className="text-muted">
                You can contribute datasets immediately, and you can also reach
                out if you want to take on a sustained maintainer or
                collaborator role in data stewardship and platform development.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/contribute"
                  className="bg-accent text-accent-foreground rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
                >
                  Contribute data
                </Link>
                <Link
                  href="mailto:brian.collins@wsu.edu?subject=Maintainership%20Request%20for%20X-ray%20Atlas"
                  className="border-border bg-surface text-foreground hover:bg-default rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
                >
                  Become a maintainer
                </Link>
                <Link
                  href="mailto:brian.collins@wsu.edu?subject=Collaboration%20Request%20for%20X-ray%20Atlas"
                  className="border-border bg-surface text-foreground hover:bg-default rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
                >
                  Become a collaborator
                </Link>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-foreground mb-4 text-2xl font-semibold">
              Query-oriented summary
            </h2>
            <div className="text-muted space-y-3">
              <p>
                X-ray Atlas is designed for search and discovery of NEXAFS and
                related X-ray spectroscopy datasets by molecule, edge,
                instrument, facility, and data quality signals.
              </p>
              <p>
                It supports queryable links between molecular identifiers,
                spectrum traces, experimental conditions, and contribution
                provenance so researchers can evaluate context before reuse.
              </p>
              <p>
                The mission is practical and scientific: make high-quality
                spectroscopy data easier to find, easier to trust, and easier to
                cite.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
