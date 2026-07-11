/**
 * Client-safe public Atlas citation URLs for `/d/{id}`.
 *
 * Always uses the brand production origin ({@link site.url}), never the current
 * browser host, so Cite/copy targets match Zenodo `isIdenticalTo` links.
 */

import { site } from "~/app/brand";
import { atlasDatasetCitationHref } from "~/lib/nexafs-experiment-deep-link";

/**
 * Builds the absolute public citation URL for an Atlas dataset id.
 *
 * @param atlasDatasetId - Opaque 8-character Atlas dataset id.
 * @returns Absolute `https://…/d/{id}` on the brand public origin.
 */
export function buildPublicAtlasDatasetCitationUrl(
  atlasDatasetId: string,
): string {
  const origin = site.url.replace(/\/$/, "");
  return `${origin}${atlasDatasetCitationHref(atlasDatasetId)}`;
}
