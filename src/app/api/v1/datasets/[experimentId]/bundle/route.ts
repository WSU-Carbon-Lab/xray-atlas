/**
 * Serves the public dataset archive for one experiment on `/api/v1`.
 *
 * `experimentId` is the experiment UUID. The body is a gzip-compressed tar of
 * polarization CSVs plus committed auxiliary files. An invalid id returns 400
 * `Invalid experiment id`. An unknown experiment returns 404
 * `Experiment not found`.
 */
export { GET } from "~/app/api/nexafs/experiments/[experimentId]/all-data-bundle/route";
