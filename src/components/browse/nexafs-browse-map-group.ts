/**
 * Maps a grouped NEXAFS browse row from tRPC to props for `NexafsExperimentCompactCard`.
 */

import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "~/server/api/root";
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
      href: `/molecules/${moleculePath}?nexafsExperiment=${encodeURIComponent(group.experimentId)}`,
      experimentId: group.experimentId,
      moleculeId: molecule.id,
      displayName: molecule.displayName,
      iupacname: molecule.iupacname,
      chemicalformula: molecule.chemicalformula,
      imageurl: molecule.imageurl,
      inchi: molecule.inchi,
      smiles: molecule.smiles,
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
      commentCount: group.commentCount,
    },
  };
}
