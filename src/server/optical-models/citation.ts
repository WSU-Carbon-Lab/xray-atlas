/**
 * BibTeX citation of an optical model version.
 *
 * Owns the `@misc` record: the version's signed authors, the model's public short URL, the linked
 * dataset revisions with their Atlas URLs and DOIs, and the visible fork ancestors as
 * acknowledged parents. Does not mint DOIs. Dataset contributors are cited through the dataset
 * records, not listed as authors of the model. Ancestors the viewer cannot see are omitted.
 */

import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "~/prisma/client";
import { site } from "~/app/brand";
import { authorsForVersion } from "~/server/optical-models/dto";
import { loadLineage } from "~/server/optical-models/lineage";
import {
  loadModelVersion,
  type ModelVersionSelector,
} from "~/server/optical-models/read";
import type { ModelViewer } from "~/server/optical-models/visibility";
import { formatDatasetVersion } from "~/server/nexafs/dataset-versioning";
import { getAtlasPublicSiteOrigin } from "~/server/zenodo/atlas-public-site-origin";

function escapeBibtex(value: string): string {
  return value.replace(/[\\{}%&#_$~^]/g, (char) => {
    switch (char) {
      case "\\":
        return "\\textbackslash{}";
      case "{":
        return "\\textbraceleft{}";
      case "}":
        return "\\textbraceright{}";
      case "~":
        return "\\textasciitilde{}";
      case "^":
        return "\\textasciicircum{}";
      default:
        return `\\${char}`;
    }
  });
}

/**
 * BibTeX `@misc` record for a published model version.
 *
 * @param db - Shared Prisma client.
 * @param viewer - The caller reading the model.
 * @param input - The model tag and the version (default `latest`; drafts cannot be cited).
 * @returns The BibTeX text.
 * @throws TRPCError `NOT_FOUND` when the model or version is not visible, `BAD_REQUEST` when the
 * selected version is a draft or has no publication timestamp.
 */
export async function buildModelBibtex(
  db: PrismaClient,
  viewer: ModelViewer,
  input: { tag: string; version?: ModelVersionSelector },
): Promise<string> {
  const { model, version } = await loadModelVersion(
    db,
    viewer,
    input.tag,
    input.version ?? "latest",
  );
  if (
    version.status !== "published" ||
    version.versionNumber === null ||
    version.publishedAt === null
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Only published versions can be cited.",
    });
  }
  const number = version.versionNumber;
  const origin = getAtlasPublicSiteOrigin();
  const authors = authorsForVersion(version, [])
    .filter((author) => author.signed)
    .map((author) => {
      const name = author.name?.trim();
      return `{${escapeBibtex(name && name.length > 0 ? name : author.orcid)}}`;
    });

  const lineage = await loadLineage(db, viewer, version.id);
  const datasets = await db.opticalModelDataset.findMany({
    where: { versionId: version.id },
    select: {
      experimentId: true,
      pinnedMajor: true,
      pinnedMinor: true,
      pinnedPatch: true,
      experiment: {
        select: {
          atlasdatasetid: true,
          experimentzenododeposit: { select: { doi: true } },
        },
      },
    },
  });

  const derived = datasets.map((entry) => {
    const pinned = formatDatasetVersion({
      major: entry.pinnedMajor,
      minor: entry.pinnedMinor,
      patch: entry.pinnedPatch,
    });
    const id = entry.experiment.atlasdatasetid;
    if (!id) return `dataset ${entry.experimentId} v${pinned}`;
    const doi = entry.experiment.experimentzenododeposit?.doi;
    return `${origin}/d/${id} v${pinned}${doi ? ` (doi:${doi})` : ""}`;
  });
  const forks = lineage.ancestors
    .filter((ancestor) => ancestor.kind === "fork")
    .map(
      (ancestor) =>
        `${ancestor.tag} v${ancestor.versionNumber} (ORCID ${ancestor.ownerOrcid})`,
    );
  const merges = lineage.ancestors
    .filter((ancestor) => ancestor.kind === "merge")
    .map(
      (ancestor) =>
        `${ancestor.tag} v${ancestor.versionNumber} (ORCID ${ancestor.ownerOrcid})`,
    );

  const noteParts = [`Version ${number}.`];
  if (derived.length > 0) noteParts.push(`Derived from ${derived.join(", ")}.`);
  if (forks.length > 0) noteParts.push(`Forked from ${forks.join(", ")}.`);
  if (merges.length > 0) {
    noteParts.push(`Includes contributions merged from ${merges.join(", ")}.`);
  }
  const year = version.publishedAt.getUTCFullYear();

  const fields = [
    `  title = {Optical model: ${escapeBibtex(model.title)}}`,
    ...(authors.length > 0 ? [`  author = {${authors.join(" and ")}}`] : []),
    `  year = {${year}}`,
    `  howpublished = {${escapeBibtex(site.name)} optical model}`,
    `  publisher = {${escapeBibtex(site.name)}}`,
    `  url = {${origin}/m/${model.tag}}`,
    `  note = {${escapeBibtex(noteParts.join(" "))}}`,
  ];
  return `@misc{atlas-model-${model.tag}-v${number},\n${fields.join(",\n")}\n}\n`;
}
