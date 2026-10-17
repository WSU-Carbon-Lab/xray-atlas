/**
 * Serves the Atlas `@dataset` BibTeX record for one experiment on `/api/v1`.
 *
 * `experimentId` is the experiment UUID. The body is `application/x-bibtex`.
 * An invalid id returns 400 `{ error: "Invalid experiment id" }`. An unknown
 * experiment returns 404 `{ error: "Not found" }`.
 */
export { GET } from "~/app/api/citations/experiments/[experimentId]/bibtex/route";
