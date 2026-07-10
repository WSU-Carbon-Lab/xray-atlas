/**
 * Loads citation fields and the molecule deep-link target for `/d/{id}`.
 *
 * `/d/{id}` permanently redirects to `spectrumHref` (molecule page with the
 * matching dataset card expanded via `?nexafsExperiment=`).
 */

import { site } from "~/app/brand";
import { resolveCitationCreatorLabelFromPreferences } from "~/lib/dataset-attribution-claim";
import {
  buildNexafsDatasetCitationTitle,
  normalizeCitationCreatorNames,
} from "~/lib/dataset-citation";
import { normalizeDoi } from "~/lib/doi";
import { formatExperimentType } from "~/components/browse/nexafs-browse-experiment-utils";
import { slugifyMoleculeSynonym } from "~/lib/molecule-slug";
import { moleculeNexafsExperimentHref } from "~/lib/nexafs-experiment-deep-link";
import { normalizeAtlasDatasetId } from "~/lib/atlas-dataset-id";
import { loadContributorUserContextByOrcid } from "~/server/nexafs/datasetAttributionClaiming";
import { buildAtlasDatasetCitationUrl } from "~/server/zenodo/atlas-public-site-origin";
import type { PrismaClient } from "~/prisma/client";

export interface AtlasDatasetCitationPageModel {
  atlasDatasetId: string;
  experimentId: string;
  title: string;
  authors: string[];
  year: number;
  datasetDoi: string | null;
  atlasCitationUrl: string;
  /** Molecule page path that expands this experiment card. */
  spectrumHref: string;
  moleculeDisplayName: string;
  edgeLabel: string;
  instrumentName: string;
  facilityName: string | null;
  description: string;
}

/**
 * Resolves citation metadata and the molecule expand deep-link for an Atlas dataset id.
 *
 * @param db - Prisma client.
 * @param rawAtlasId - Path segment from `/d/{id}`.
 * @returns Page model, or `null` when the id is invalid or unknown.
 */
export async function loadAtlasDatasetCitationPage(
  db: PrismaClient,
  rawAtlasId: string,
): Promise<AtlasDatasetCitationPageModel | null> {
  const atlasDatasetId = normalizeAtlasDatasetId(rawAtlasId);
  if (!atlasDatasetId) return null;

  const experiment = await db.experiments.findFirst({
    where: { atlasdatasetid: atlasDatasetId },
    select: {
      id: true,
      createdat: true,
      experimenttype: true,
      samples: {
        select: {
          molecules: {
            select: {
              iupacname: true,
              moleculesynonyms: {
                select: { synonym: true, slug: true, order: true },
                orderBy: [{ order: "asc" }, { synonym: "asc" }],
                take: 1,
              },
            },
          },
        },
      },
      edges: { select: { targetatom: true, corestate: true } },
      instruments: {
        select: {
          name: true,
          facilities: { select: { name: true } },
        },
      },
      experimentmetrics: { select: { datasetdoi: true } },
      experimentzenododeposit: { select: { doi: true } },
      experimentcontributors: {
        select: {
          orcidid: true,
          claimstatus: true,
          ispublicprofilevisible: true,
          user: { select: { name: true } },
        },
        orderBy: { createdat: "asc" },
      },
    },
  });
  if (!experiment) return null;

  const molecule = experiment.samples.molecules;
  const primary = molecule.moleculesynonyms[0];
  const moleculeDisplayName =
    primary?.synonym?.trim() ?? molecule.iupacname.trim();
  const slug =
    primary?.slug?.trim() ??
    slugifyMoleculeSynonym(primary?.synonym ?? molecule.iupacname);
  const edgeLabel = `${experiment.edges.targetatom} ${experiment.edges.corestate}`;
  const instrumentName = experiment.instruments.name;
  const facilityName = experiment.instruments.facilities?.name ?? null;
  const experimentTypeLabel =
    formatExperimentType(experiment.experimenttype) ?? null;
  const datasetDoi =
    normalizeDoi(experiment.experimentzenododeposit?.doi) ??
    normalizeDoi(experiment.experimentmetrics?.datasetdoi);
  const year = experiment.createdat.getUTCFullYear();
  const userContextByOrcid = await loadContributorUserContextByOrcid(
    db,
    experiment.experimentcontributors.map((row) => row.orcidid),
  );
  const authors = normalizeCitationCreatorNames(
    experiment.experimentcontributors.map((row) => {
      const userContext = userContextByOrcid.get(row.orcidid);
      return resolveCitationCreatorLabelFromPreferences({
        orcid: row.orcidid,
        claimStatus: row.claimstatus,
        userName: row.user?.name,
        displayPreferences: userContext?.displayPreferences,
        roleSlugs: userContext?.roleSlugs,
      });
    }),
  );
  const title = buildNexafsDatasetCitationTitle({
    moleculeDisplayName,
    edgeLabel,
    instrumentName,
    facilityName,
    experimentTypeLabel,
  });
  const atlasCitationUrl = buildAtlasDatasetCitationUrl(atlasDatasetId);
  const spectrumHref = moleculeNexafsExperimentHref(slug, experiment.id);
  const description = [
    title,
    `Hosted on ${site.name}.`,
    datasetDoi ? `DOI: ${datasetDoi} (minted via Zenodo).` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    atlasDatasetId,
    experimentId: experiment.id,
    title,
    authors,
    year,
    datasetDoi,
    atlasCitationUrl,
    spectrumHref,
    moleculeDisplayName,
    edgeLabel,
    instrumentName,
    facilityName,
    description,
  };
}
