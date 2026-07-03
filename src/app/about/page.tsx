/**
 * About landing route presenting the database mission, documentation entry points,
 * stewardship listings, and collaboration calls-to-action.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ORCIDIcon } from "~/components/icons";
import { AboutWikiEntry } from "~/components/about/about-wiki-entry";
import { attribution, mission, site } from "~/app/brand";
import {
  getCachedAboutCollaborators,
  getCachedCoreMaintainers,
} from "~/server/cache/about-public-cache";
import {
  ArrowTopRightOnSquareIcon,
  AcademicCapIcon,
  BookOpenIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon,
  LockOpenIcon,
  ArrowsRightLeftIcon,
  ArrowPathIcon,
  RectangleStackIcon,
  SparklesIcon,
  UserGroupIcon,
  CodeBracketIcon,
  MapIcon,
} from "@heroicons/react/24/outline";

export const metadata: Metadata = {
  title: `About ${site.name}`,
  description: `Learn how ${site.name} supports FAIR-aligned spectroscopy discovery, attribution, and reuse across the synchrotron community.`,
};

export const revalidate = 3600;

const aboutResourceCards = [
  {
    href: "/about/roadmap",
    title: "Roadmap",
    description:
      "Publication timeline, platform milestones, DataCite decisions, and live GitHub activity.",
    icon: MapIcon,
  },
  {
    href: "/wiki",
    title: "Start here",
    description:
      "Wiki landing page with scope, the NEXAFS and Atlas branches, and how to cite hosted data.",
    icon: BookOpenIcon,
  },
  {
    href: "/wiki/nexafs",
    title: "Introduction to NEXAFS",
    description:
      "Core-level absorption, near-edge spectrum anatomy, and what NEXAFS measures in practice.",
    icon: RectangleStackIcon,
  },
  {
    href: "/wiki/nexafs/quantities",
    title: "Measured and derived quantities",
    description:
      "Definitions and interrelations for every absorption channel the catalog stores or derives.",
    icon: SparklesIcon,
  },
  {
    href: "/wiki/atlas",
    title: "Using X-ray Atlas",
    description:
      "Platform overview: search, visualization, quality signals, contribution flows, and the API.",
    icon: MagnifyingGlassIcon,
  },
  {
    href: "/wiki/atlas/contributing",
    title: "Contributing datasets",
    description:
      "Guidance for dataset contributors, metadata expectations, attribution, and reproducibility practices.",
    icon: ArrowTopRightOnSquareIcon,
  },
  {
    href: "/wiki/api",
    title: "API",
    description:
      "Versioned REST API documentation for researcher workflows, DOI-driven discovery, and pandas-ready dataset export.",
    icon: CodeBracketIcon,
  },
] as const;

const fairPrinciples = [
  {
    title: "Findable",
    description:
      "Molecule records, spectra, and experimental metadata are indexed for search by identifiers, chemical context, edge, instrument, facility, and quality-oriented filters.",
    icon: MagnifyingGlassIcon,
  },
  {
    title: "Accessible",
    description:
      "Datasets are available through the web interface and API-based workflows so researchers can retrieve records and associated context across computational environments.",
    icon: LockOpenIcon,
  },
  {
    title: "Interoperable",
    description:
      "Records preserve structured molecular, experimental, and provenance metadata designed for integration with analysis pipelines and external research tooling.",
    icon: ArrowsRightLeftIcon,
  },
  {
    title: "Reusable",
    description:
      "Contribution workflows emphasize attribution, provenance, and citable context so data can be interpreted and reused with clear scientific traceability.",
    icon: ArrowPathIcon,
  },
] as const;

type CoreMaintainerRow = Awaited<
  ReturnType<typeof getCachedCoreMaintainers>
>[number];

function initialsFromName(name: string | null): string {
  return (name ?? "User")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function ProfileCard({ user }: { user: CoreMaintainerRow }) {
  const name = user.name ?? "User";
  const imageSrc = user.image?.trim() ? user.image.trim() : null;
  const orcid = user.id.trim() ? user.id.trim() : null;

  return (
    <div className="border-border bg-surface rounded-xl border p-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <Link
          href={`/users/${user.id}`}
          className="ring-accent/30 focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          aria-label={`Open profile for ${name}`}
        >
          {imageSrc ? (
            <span
              role="img"
              aria-label={name}
              className="border-border inline-flex h-16 w-16 rounded-full border bg-cover bg-center"
              style={{ backgroundImage: `url("${imageSrc}")` }}
            />
          ) : (
            <span className="border-border bg-default text-foreground inline-flex h-16 w-16 items-center justify-center rounded-full border text-lg font-semibold">
              {initialsFromName(name)}
            </span>
          )}
        </Link>
        <div className="inline-flex items-center gap-1.5">
          <Link
            href={`/users/${user.id}`}
            className="text-foreground hover:text-accent text-sm font-medium"
          >
            {name}
          </Link>
          {orcid ? (
            <a
              href={`https://orcid.org/${orcid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted hover:text-accent inline-flex items-center"
              aria-label={`Open ORCID profile for ${name}`}
              title={`ORCID profile for ${name}`}
            >
              <ORCIDIcon className="h-4 w-4" authenticated />
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default async function AboutPage() {
  const [collaboratorsData, coreMaintainers] = await Promise.all([
    getCachedAboutCollaborators(),
    getCachedCoreMaintainers(),
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
  const maintainersForDisplay = [...maintainers, ...lineageUnassigned];

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 space-y-6">
          <div className="space-y-4 text-center">
            <h1 className="text-foreground mb-2 text-4xl font-bold sm:text-5xl">
              About {site.name}
            </h1>
            <p className="text-muted mx-auto max-w-4xl text-left text-base leading-relaxed sm:text-lg">
              {mission.canonical}
            </p>
          </div>
          <AboutWikiEntry />
        </div>

        <div className="space-y-12">
          <section>
            <h2 className="text-foreground mb-4 text-2xl font-semibold">
              FAIR data alignment
            </h2>
            <div className="space-y-4">
              <p className="text-muted">
                {site.name} aligns with the FAIR guiding principles for
                scientific data stewardship.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {fairPrinciples.map((principle) => (
                  <article
                    key={principle.title}
                    className="border-border bg-surface rounded-xl border p-4"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <principle.icon className="text-accent h-5 w-5" />
                      <h3 className="text-foreground text-lg font-semibold">
                        {principle.title}
                      </h3>
                    </div>
                    <p className="text-muted text-sm">
                      {principle.description}
                    </p>
                  </article>
                ))}
              </div>
              <p className="text-muted">
                FAIR reference:{" "}
                <Link
                  href="https://www.nature.com/articles/sdata201618"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground hover:text-accent underline-offset-2 hover:underline"
                >
                  Wilkinson et al., The FAIR Guiding Principles for scientific
                  data management and stewardship (Scientific Data, 2016)
                </Link>
              </p>
            </div>
          </section>

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
              <p>
                X-ray Atlas also provides an interactive visual platform for
                parsing, comparing, and distinguishing datasets directly in the
                browser, alongside API access for programmatic integration into
                individual analysis workflows, experimental software, and other
                research tooling.
              </p>
              <div className="border-border bg-surface rounded-xl border p-4">
                <h3 className="text-foreground mb-3 text-lg font-semibold">
                  Hosted by {attribution.lab}
                </h3>
                {collaboratorsData.hosts.length > 0 ? (
                  <ul className="space-y-2 text-sm">
                    {collaboratorsData.hosts.map((host) => (
                      <li
                        key={host.id}
                        className="border-border bg-default rounded-lg border px-3 py-2"
                      >
                        {host.url ? (
                          <Link
                            href={host.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-foreground hover:text-accent underline-offset-2 hover:underline"
                          >
                            {host.name}
                          </Link>
                        ) : (
                          <span className="text-foreground">{host.name}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted text-sm">No hosts listed yet.</p>
                )}
              </div>
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
                    <h3 className="text-foreground font-semibold">
                      {card.title}
                    </h3>
                  </div>
                  <p className="text-muted text-sm">{card.description}</p>
                </Link>
              ))}
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-foreground mb-4 flex items-center gap-2 text-2xl font-semibold">
              <AcademicCapIcon className="text-accent h-6 w-6" />
              Maintainers and collaborators
            </h2>
            <div className="space-y-8">
              <div className="border-border bg-surface/50 space-y-6 rounded-2xl border p-6">
                <div className="space-y-4">
                  <h3 className="text-foreground text-lg font-semibold">
                    Administrators
                  </h3>
                  <p className="text-muted text-sm">
                    Users assigned the administrator lineage role steward
                    platform operations alongside dataset publishing workflows.
                  </p>
                  {administrators.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {administrators.map((user) => (
                        <ProfileCard key={user.id} user={user} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted text-sm">
                      No administrators are listed yet.
                    </p>
                  )}
                </div>

                <div className="space-y-4">
                  <h3 className="text-foreground text-lg font-semibold">
                    Core maintainers
                  </h3>
                  <p className="text-muted text-sm">
                    Maintainers guide scientific direction, review
                    contributions, and coordinate releases for the open
                    spectroscopy catalog.
                  </p>
                  {maintainersForDisplay.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {maintainersForDisplay.map((user) => (
                        <ProfileCard key={user.id} user={user} />
                      ))}
                      {lineageUnassigned.length > 0 ? (
                        <p className="text-muted col-span-full text-xs">
                          Some stewardship profiles are shown here while lineage
                          role metadata finishes syncing.
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

              <div className="space-y-4">
                <h3 className="text-foreground text-lg font-semibold">
                  Collaborating institutions
                </h3>
                <div className="border-border bg-surface rounded-xl border p-4">
                  {collaboratorsData.collaborators.length > 0 ? (
                    <ul className="space-y-2 text-sm">
                      {collaboratorsData.collaborators.map((collaborator) => (
                        <li
                          key={collaborator.id}
                          className="border-border bg-default rounded-lg border px-3 py-2"
                        >
                          {collaborator.url ? (
                            <Link
                              href={collaborator.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-foreground hover:text-accent underline-offset-2 hover:underline"
                            >
                              {collaborator.name}
                            </Link>
                          ) : (
                            <span className="text-foreground">
                              {collaborator.name}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted text-sm">
                      No collaborating institutions listed yet.
                    </p>
                  )}
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
