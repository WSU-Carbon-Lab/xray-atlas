/**
 * Resolves a molecule search on `/api/v1` with the same redirect rules as
 * `/api/molecules/search`.
 *
 * One of `q`, `query`, `search`, or `s` is required. A single confident match
 * redirects to that molecule page. Several matches redirect to
 * `/browse/molecules` with `q` preserved. An empty query returns 400.
 */
export { GET } from "~/app/api/molecules/search/route";
