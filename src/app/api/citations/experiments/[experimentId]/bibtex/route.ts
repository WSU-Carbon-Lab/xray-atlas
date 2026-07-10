/**
 * Serves Atlas-built BibTeX for one experiment as `application/x-bibtex`.
 *
 * Primary Zotero import path: authors (attribution display preferences),
 * separate experiment / sample / identifier notes, Zenodo DOI, and Atlas
 * `/d/{id}` URL in one `@dataset` entry.
 */

import { NextResponse } from "next/server";
import { resolveCitationCreatorLabelFromPreferences } from "~/lib/dataset-attribution-claim";
import { buildDatasetCitationBundle } from "~/lib/dataset-citation";
import { contributorCitationSortKey } from "~/lib/datacite-contributor-types";
import { normalizeDoi } from "~/lib/doi";
import { formatExperimentType } from "~/components/browse/nexafs-browse-experiment-utils";
import { ensureAtlasDatasetId } from "~/server/nexafs/atlas-dataset-id";
import { loadContributorUserContextByOrcid } from "~/server/nexafs/datasetAttributionClaiming";
import { buildAtlasDatasetCitationUrl } from "~/server/zenodo/atlas-public-site-origin";
import { db } from "~/server/db";

interface RouteContext {
  params: Promise<{ experimentId: string }>;
}

/**
 * Returns a `@dataset` BibTeX attachment for the given experiment UUID.
 */
export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  const { experimentId } = await context.params;
  const id = experimentId?.trim();
  if (!id) {
    return NextResponse.json(
      { error: "Missing experiment id" },
      { status: 400 },
    );
  }

  const experiment = await db.experiments.findUnique({
    where: { id },
    select: {
      id: true,
      createdat: true,
      experimenttype: true,
      samples: {
        select: {
          processmethod: true,
          substrate: true,
          patterninglayer: true,
          solvent: true,
          thickness: true,
          molecularweight: true,
          vendors: { select: { name: true } },
          molecules: {
            select: {
              iupacname: true,
              moleculesynonyms: {
                select: { synonym: true },
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
          role: true,
          claimstatus: true,
          user: { select: { name: true } },
        },
        orderBy: { createdat: "asc" },
      },
    },
  });
  if (!experiment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const molecule = experiment.samples.molecules;
  const moleculeDisplayName =
    molecule.moleculesynonyms[0]?.synonym?.trim() ?? molecule.iupacname;
  const datasetDoi =
    normalizeDoi(experiment.experimentzenododeposit?.doi) ??
    normalizeDoi(experiment.experimentmetrics?.datasetdoi);
  const atlasDatasetId = await ensureAtlasDatasetId(db, experiment.id);
  const atlasCitationUrl = buildAtlasDatasetCitationUrl(atlasDatasetId);

  const userContextByOrcid = await loadContributorUserContextByOrcid(
    db,
    experiment.experimentcontributors.map((row) => row.orcidid),
  );

  const creators = [...experiment.experimentcontributors]
    .sort((a, b) => {
      const keyDelta =
        contributorCitationSortKey([a.role]) -
        contributorCitationSortKey([b.role]);
      if (keyDelta !== 0) return keyDelta;
      return a.orcidid.localeCompare(b.orcidid);
    })
    .map((row) => {
      const userContext = userContextByOrcid.get(row.orcidid);
      return resolveCitationCreatorLabelFromPreferences({
        orcid: row.orcidid,
        claimStatus: row.claimstatus,
        userName: row.user?.name,
        displayPreferences: userContext?.displayPreferences,
        roleSlugs: userContext?.roleSlugs,
      });
    });

  const edgeLabel = `${experiment.edges.targetatom} ${experiment.edges.corestate}`;
  const instrumentName = experiment.instruments.name;
  const facilityName = experiment.instruments.facilities?.name ?? null;
  const experimentTypeLabel = formatExperimentType(experiment.experimenttype);

  const bibtex = buildDatasetCitationBundle({
    moleculeDisplayName,
    edgeLabel,
    instrumentName,
    facilityName,
    experimentTypeLabel,
    datasetDoi,
    atlasCitationUrl,
    creators,
    year: experiment.createdat.getUTCFullYear(),
    sample: {
      processMethod: experiment.samples.processmethod
        ? String(experiment.samples.processmethod)
        : null,
      substrate: experiment.samples.substrate,
      patterningLayer: experiment.samples.patterninglayer,
      solvent: experiment.samples.solvent,
      thicknessNm: experiment.samples.thickness,
      molecularWeightGPerMol: experiment.samples.molecularweight,
      vendorName: experiment.samples.vendors?.name ?? null,
    },
  }).bibtex;

  const filename = datasetDoi
    ? `atlas_${datasetDoi.replace(/[^a-zA-Z0-9]+/g, "_")}.bib`
    : `atlas_${atlasDatasetId}.bib`;

  return new Response(bibtex, {
    status: 200,
    headers: {
      "Content-Type": "application/x-bibtex; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
