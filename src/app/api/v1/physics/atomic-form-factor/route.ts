/**
 * Serves Henke atomic form-factor tables on `/api/v1`.
 *
 * `atom` is a one- or two-letter element symbol. The response body is the CXRO
 * `.nff` text. A missing or invalid symbol returns 400.
 */
export { GET } from "~/app/api/physics/atomic-form-factor/route";
