/**
 * Maps a grouped NEXAFS browse row from tRPC to props for `NexafsExperimentCompactCard`.
 */

import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "~/server/api/root";
import { moleculeNexafsExperimentHref } from "~/lib/nexafs-experiment-deep-link";
import { canonicalMoleculeSlugFromView } from "~/lib/molecule-slug";
import { formatExperimentType } from "./nexafs-browse-experiment-utils";

type RouterOutputs = inferRouterOutputs<AppRouter>;

export type NexafsBrowseGroup =
  RouterOutputs["experiments"]["browseList"]["groups"][number];

export function mapNexafsBrowseGroupToCard(group: NexafsBrowseGroup) {
  const molecule = group.molecule;
  const edgeLabel = `${group.edge.targetatom} ${group.edge.corestate}`;

  const moleculePath = canonicalMoleculeSlugFromView({
    name: molecule.displayName,
    iupacName: molecule.iupacname,
  });

  return {
    key: group.experimentId,
    props: {
      moleculeHref: moleculeNexafsExperimentHref(
        moleculePath,
        group.experimentId,
      ),
      experimentId: group.experimentId,
      moleculeId: molecule.id,
      displayName: molecule.displayName,
      iupacname: molecule.iupacname,
      chemicalformula: molecule.chemicalformula,
      imageurl: molecule.imageurl,
      casNumber: molecule.casNumber,
      pubChemCid: molecule.pubChemCid,
      favoriteCount: group.favoriteCount,
      userHasFavorited: group.userHasFavorited,
      edgeLabel,
      instrumentName: group.instrument.name,
      facilityName: group.instrument.facilityName,
      experimentTypeLabel: formatExperimentType(group.experimenttype),
      experimentContributorUsers: group.contributorUsers,
      polarizationCount: group.polarizationCount,
      linkedPublications: group.linkedPublications,
      sourcePublications: group.sourcePublications,
      ingestVerified: group.ingestVerified,
      atlasDatasetId: group.atlasDatasetId,
      datasetDoi: group.datasetDoi,
      zenodoRecordUrl: group.zenodoRecordUrl,
      zenodoDepositState: group.zenodoDepositState,
      datasetMetrics: group.datasetMetrics,
      citationSample: group.sample,
      citationYear: new Date(group.createdat).getUTCFullYear(),
    },
  };
}
