/**
 * Shared contracts for NEXAFS grouped browse rows surfaced through tRPC (`experiments.browseList` /
 * `browseSearch`). Kept free of server-only imports so client cards can consume the same shapes.
 */

/** Publication metadata attached to a grouped browse experiment via `experimentpublications`. */
export interface NexafsBrowseLinkedPublication {
  doi: string;
  title: string;
  journal: string | null;
  year: number | null;
  /** Stored JSON; callers format citations defensively. */
  authors?: unknown;
}
