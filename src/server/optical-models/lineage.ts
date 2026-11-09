/**
 * Ancestor lineage of an optical model version.
 *
 * Owns the walk over `optical_model_version_parent` links and the per-viewer redaction of
 * ancestors. Ancestors the viewer cannot see are counted, never described. Does not decide who
 * may fork or publish.
 */

import type { PrismaClient } from "~/prisma/client";
import {
  visibleModelWhere,
  type ModelViewer,
} from "~/server/optical-models/visibility";

/** One visible ancestor of a version. `kind` is how it entered the lineage. */
export interface LineageNode {
  tag: string;
  versionNumber: number;
  ownerOrcid: string;
  title: string;
  kind: "fork" | "merge";
}

/** Visible ancestors, newest first, plus the number the viewer cannot see. */
export interface Lineage {
  ancestors: LineageNode[];
  hiddenAncestors: number;
}

/**
 * Every ancestor version of `versionId`, redacted for `viewer`.
 *
 * The walk is iterative with a visited set, so it terminates on any data. Ancestors are ordered by
 * creation time, newest first. Ancestors whose model the viewer cannot see, and ancestors that are
 * unpublished, are counted in `hiddenAncestors` and omitted from `ancestors`. A visible ancestor
 * whose own parent is hidden is still listed; only the hidden count reveals the gap.
 *
 * @param db - Shared Prisma client.
 * @param viewer - The caller reading the lineage.
 * @param versionId - Version whose ancestors to list.
 * @returns The visible ancestors and the hidden count.
 */
export async function loadLineage(
  db: PrismaClient,
  viewer: ModelViewer,
  versionId: string,
): Promise<Lineage> {
  const seen = new Set<string>([versionId]);
  const kindByVersion = new Map<string, "fork" | "merge">();
  let frontier = [versionId];
  while (frontier.length > 0) {
    const links = await db.opticalModelVersionParent.findMany({
      where: { versionId: { in: frontier } },
      select: { parentVersionId: true, kind: true },
    });
    const next: string[] = [];
    for (const link of links) {
      if (seen.has(link.parentVersionId)) continue;
      seen.add(link.parentVersionId);
      kindByVersion.set(link.parentVersionId, link.kind);
      next.push(link.parentVersionId);
    }
    frontier = next;
  }

  const ancestorIds = [...kindByVersion.keys()];
  if (ancestorIds.length === 0) {
    return { ancestors: [], hiddenAncestors: 0 };
  }

  const versions = await db.opticalModelVersion.findMany({
    where: { id: { in: ancestorIds }, model: visibleModelWhere(viewer) },
    include: {
      model: { select: { tag: true, ownerOrcid: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const ancestors: LineageNode[] = [];
  for (const version of versions) {
    if (version.versionNumber === null) continue;
    ancestors.push({
      tag: version.model.tag,
      versionNumber: version.versionNumber,
      ownerOrcid: version.model.ownerOrcid,
      title: version.model.title,
      kind: kindByVersion.get(version.id) ?? "fork",
    });
  }
  return {
    ancestors,
    hiddenAncestors: ancestorIds.length - ancestors.length,
  };
}
