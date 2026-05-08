import type { Metadata } from "next";
import { site } from "~/app/brand";

export const metadata: Metadata = {
  title: "API reference",
  description:
    `REST API reference for ${site.name} researcher workflows, including DOI-first discovery, filtered dataset summaries, and export endpoints under /api/v1.`,
  alternates: {
    canonical: "/wiki/api-reference",
  },
};

export default function ApiReferencePage() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <h1 className="text-foreground text-4xl font-bold">API reference</h1>
      <p className="text-muted">
        This page documents the researcher-facing REST endpoints under{" "}
        <code>/api/v1</code>. It is located in the Wiki (instead of About)
        because it is operational reference material with versioned endpoint
        contracts, query parameter details, response examples, and error
        semantics that evolve with implementation.
      </p>

      <section className="border-border bg-surface rounded-lg border p-4">
        <h2 id="overview" className="text-foreground mb-2 text-lg font-semibold">
          Overview
        </h2>
        <ul className="text-muted ml-6 list-disc space-y-1 text-sm">
          <li>
            <strong className="text-foreground">Audience:</strong> Researchers
            discovering and exporting spectroscopy datasets programmatically.
          </li>
          <li>
            <strong className="text-foreground">Base URL:</strong>{" "}
            <code>/api/v1</code>
          </li>
          <li>
            <strong className="text-foreground">Authentication:</strong> Public
            read access for the endpoints on this page.
          </li>
          <li>
            <strong className="text-foreground">Content types:</strong>{" "}
            <code>application/json</code> for standard responses and{" "}
            <code>text/csv</code> for CSV export mode.
          </li>
          <li>
            <strong className="text-foreground">Versioning:</strong> URL path
            versioning with <code>v1</code>.
          </li>
          <li>
            <strong className="text-foreground">Deprecation policy:</strong>{" "}
            Backward-compatible additions can ship within <code>v1</code>;
            breaking changes require a new major path version.
          </li>
        </ul>
      </section>

      <section className="border-border bg-surface rounded-lg border p-4">
        <h2 id="molecule-catalog" className="text-foreground mb-2 text-lg font-semibold">
          GET /api/v1/molecules
        </h2>
        <p className="text-muted text-sm leading-relaxed">
          Returns a paginated molecule catalog with optional researcher filters.
        </p>
        <ul className="text-muted mt-2 ml-6 list-disc space-y-1 text-sm leading-relaxed">
          <li>
            Query params: <code>q</code>, <code>hasCas</code>,{" "}
            <code>synonymsCountMax</code>, <code>synonymsLimit</code>,{" "}
            <code>limit</code>, <code>offset</code>
          </li>
          <li>
            Filter behavior: <code>hasCas=true</code> keeps molecules with a
            non-empty CAS; <code>synonymsCountMax</code> limits the maximum
            synonym count for each returned molecule.
          </li>
          <li>
            Pagination: <code>nextOffset</code> is present when more rows remain.
          </li>
        </ul>
        <div className="border-border bg-default mt-3 rounded-md border p-3 text-xs">
          <p className="text-foreground mb-2 font-semibold">Example request</p>
          <code>
            GET /api/v1/molecules?q=benzene&amp;hasCas=true&amp;synonymsCountMax=8&amp;synonymsLimit=3&amp;limit=25&amp;offset=0
          </code>
        </div>
        <div className="border-border bg-default mt-3 rounded-md border p-3 text-xs">
          <p className="text-foreground mb-2 font-semibold">Example response (200)</p>
          <pre className="overflow-x-auto whitespace-pre-wrap">
{`{
  "data": [
    {
      "id": "04bc7f30-c6c8-49f2-a8b8-57cf4bf6c9fe",
      "iupacName": "benzene",
      "inchi": "InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H",
      "smiles": "c1ccccc1",
      "chemicalFormula": "C6H6",
      "casNumber": "71-43-2",
      "pubChemCid": "241",
      "favoriteCount": 18,
      "viewCount": 124,
      "synonymsCount": 6,
      "sampleCount": 11,
      "synonyms": ["benzene", "benzol", "cyclohexatriene"],
      "createdAt": "2026-01-05T18:03:11.423Z",
      "updatedAt": "2026-04-17T22:14:09.119Z"
    }
  ],
  "pagination": { "limit": 25, "offset": 0, "nextOffset": 25 },
  "filters": { "q": "benzene", "hasCas": true, "synonymsCountMax": 8, "synonymsLimit": 3 }
}`}
          </pre>
        </div>
      </section>

      <section className="border-border bg-surface rounded-lg border p-4">
        <h2 id="edge-summary" className="text-foreground mb-2 text-lg font-semibold">
          GET /api/v1/molecules/{`{moleculeId}`}/edges
        </h2>
        <p className="text-muted text-sm leading-relaxed">
          Returns edge-level dataset counts for one molecule. Supports optional
          DOI scoping via <code>doi</code>.
        </p>
        <ul className="text-muted mt-2 ml-6 list-disc space-y-1 text-sm leading-relaxed">
          <li>Path params: <code>moleculeId</code> (UUID)</li>
          <li>
            Query params: <code>doi</code> (canonical DOI or DOI URL)
          </li>
        </ul>
        <div className="border-border bg-default mt-3 rounded-md border p-3 text-xs">
          <p className="text-foreground mb-2 font-semibold">Example request</p>
          <code>
            GET /api/v1/molecules/04bc7f30-c6c8-49f2-a8b8-57cf4bf6c9fe/edges?doi=https://doi.org/10.1038/example
          </code>
        </div>
        <div className="border-border bg-default mt-3 rounded-md border p-3 text-xs">
          <p className="text-foreground mb-2 font-semibold">Example response (200)</p>
          <pre className="overflow-x-auto whitespace-pre-wrap">
{`{
  "molecule": { "id": "04bc7f30-c6c8-49f2-a8b8-57cf4bf6c9fe", "iupacName": "benzene" },
  "filters": { "doi": "10.1038/example" },
  "data": [
    {
      "edgeId": "0f6d8769-11ab-4cf8-bdf3-cae66f9f2f40",
      "targetAtom": "C",
      "coreState": "K",
      "label": "C(K)",
      "datasetCount": 9
    }
  ]
}`}
          </pre>
        </div>
      </section>

      <section className="border-border bg-surface rounded-lg border p-4">
        <h2 id="dataset-summaries" className="text-foreground mb-2 text-lg font-semibold">
          GET /api/v1/datasets
        </h2>
        <p className="text-muted text-sm leading-relaxed">
          Returns paginated dataset summaries filterable by molecule, edge, and DOI.
        </p>
        <ul className="text-muted mt-2 ml-6 list-disc space-y-1 text-sm leading-relaxed">
          <li>
            Query params: <code>moleculeId</code>, <code>edgeId</code>,{" "}
            <code>doi</code>, <code>limit</code>, <code>offset</code>
          </li>
          <li>
            DOI handling: accepts canonical DOI values and DOI URLs (for example{" "}
            <code>https://doi.org/10.1234/example</code>).
          </li>
        </ul>
        <div className="border-border bg-default mt-3 rounded-md border p-3 text-xs">
          <p className="text-foreground mb-2 font-semibold">Example request</p>
          <code>
            GET /api/v1/datasets?moleculeId=04bc7f30-c6c8-49f2-a8b8-57cf4bf6c9fe&amp;edgeId=0f6d8769-11ab-4cf8-bdf3-cae66f9f2f40&amp;doi=10.1038/example&amp;limit=20&amp;offset=0
          </code>
        </div>
        <div className="border-border bg-default mt-3 rounded-md border p-3 text-xs">
          <p className="text-foreground mb-2 font-semibold">Example response (200)</p>
          <pre className="overflow-x-auto whitespace-pre-wrap">
{`{
  "data": [
    {
      "datasetId": "96828cd4-467c-44f8-b8f9-f4e6138be8eb",
      "experimentType": "TEY",
      "edge": { "id": "0f6d8769-11ab-4cf8-bdf3-cae66f9f2f40", "targetAtom": "C", "coreState": "K", "label": "C(K)" },
      "molecule": { "id": "04bc7f30-c6c8-49f2-a8b8-57cf4bf6c9fe", "iupacName": "benzene" },
      "sample": { "id": "7b801fdf-eec2-4cea-b02c-f3e7b00f1d28", "identifier": "BENZENE_SAMPLE_01" },
      "instrument": { "id": "als-8-0-1", "name": "Beamline 8.0.1" },
      "facility": { "id": "d12fe499-cf90-4f9b-8e49-a3e2855f87c5", "name": "ALS" },
      "spectrumPointCount": 1287,
      "createdAt": "2026-03-01T09:32:10.112Z",
      "publications": [{ "id": "be57b165-21f5-4d9b-81f8-2f2f8ed2c68e", "doi": "10.1038/example", "title": "Example paper", "year": 2025, "role": "cited" }]
    }
  ],
  "pagination": { "limit": 20, "offset": 0, "nextOffset": 20 },
  "filters": { "moleculeId": "04bc7f30-c6c8-49f2-a8b8-57cf4bf6c9fe", "edgeId": "0f6d8769-11ab-4cf8-bdf3-cae66f9f2f40", "doi": "10.1038/example" }
}`}
          </pre>
        </div>
      </section>

      <section className="border-border bg-surface rounded-lg border p-4">
        <h2 id="doi-discovery" className="text-foreground mb-2 text-lg font-semibold">
          GET /api/v1/datasets/discover
        </h2>
        <p className="text-muted text-sm leading-relaxed">
          DOI-first discovery endpoint. Requires <code>doi</code> and returns
          publication metadata plus matching dataset summaries.
        </p>
        <ul className="text-muted mt-2 ml-6 list-disc space-y-1 text-sm leading-relaxed">
          <li>
            Required query param: <code>doi</code>
          </li>
          <li>
            Optional query params: <code>moleculeId</code>, <code>edgeId</code>
          </li>
        </ul>
        <div className="border-border bg-default mt-3 rounded-md border p-3 text-xs">
          <p className="text-foreground mb-2 font-semibold">Example request</p>
          <code>GET /api/v1/datasets/discover?doi=https://doi.org/10.1038/example</code>
        </div>
        <div className="border-border bg-default mt-3 rounded-md border p-3 text-xs">
          <p className="text-foreground mb-2 font-semibold">Example response (200)</p>
          <pre className="overflow-x-auto whitespace-pre-wrap">
{`{
  "publication": { "id": "be57b165-21f5-4d9b-81f8-2f2f8ed2c68e", "doi": "10.1038/example", "title": "Example paper", "journal": "Nature", "year": 2025 },
  "filters": { "moleculeId": null, "edgeId": null },
  "data": [
    {
      "datasetId": "96828cd4-467c-44f8-b8f9-f4e6138be8eb",
      "experimentType": "TEY",
      "edge": { "id": "0f6d8769-11ab-4cf8-bdf3-cae66f9f2f40", "targetAtom": "C", "coreState": "K", "label": "C(K)" },
      "molecule": { "id": "04bc7f30-c6c8-49f2-a8b8-57cf4bf6c9fe", "iupacName": "benzene" },
      "sample": { "id": "7b801fdf-eec2-4cea-b02c-f3e7b00f1d28", "identifier": "BENZENE_SAMPLE_01" },
      "instrument": { "id": "als-8-0-1", "name": "Beamline 8.0.1" },
      "facility": { "id": "d12fe499-cf90-4f9b-8e49-a3e2855f87c5", "name": "ALS" },
      "spectrumPointCount": 1287,
      "createdAt": "2026-03-01T09:32:10.112Z"
    }
  ]
}`}
          </pre>
        </div>
      </section>

      <section className="border-border bg-surface rounded-lg border p-4">
        <h2 id="dataset-export" className="text-foreground mb-2 text-lg font-semibold">
          GET /api/v1/datasets/export
        </h2>
        <p className="text-muted text-sm leading-relaxed">
          Returns a full tabular export suitable for pandas ingestion.
        </p>
        <ul className="text-muted mt-2 ml-6 list-disc space-y-1 text-sm leading-relaxed">
          <li>
            Supports <code>format=json</code> (default) and{" "}
            <code>format=csv</code>.
          </li>
          <li>
            JSON export returns <code>columns</code> and <code>rows</code>.
          </li>
          <li>
            CSV export returns one row per spectrum point with metadata columns.
          </li>
          <li>
            Query params: <code>moleculeId</code>, <code>edgeId</code>,{" "}
            <code>doi</code>, <code>limit</code>, <code>format</code>.
          </li>
        </ul>
        <div className="border-border bg-default mt-3 rounded-md border p-3 text-xs">
          <p className="text-foreground mb-2 font-semibold">Example requests</p>
          <div className="space-y-1">
            <code>GET /api/v1/datasets/export?doi=10.1038/example&amp;format=json&amp;limit=5000</code>
            <br />
            <code>GET /api/v1/datasets/export?moleculeId=04bc7f30-c6c8-49f2-a8b8-57cf4bf6c9fe&amp;format=csv</code>
          </div>
        </div>
        <div className="border-border bg-default mt-3 rounded-md border p-3 text-xs">
          <p className="text-foreground mb-2 font-semibold">Example JSON response (200)</p>
          <pre className="overflow-x-auto whitespace-pre-wrap">
{`{
  "columns": ["dataset_id", "experiment_type", "sample_id", "sample_identifier", "molecule_id", "molecule_iupac_name", "edge_id", "edge_label", "instrument_id", "instrument_name", "facility_id", "facility_name", "publication_dois", "energy_ev", "raw_abs", "i0", "od", "mass_absorption", "beta", "created_at"],
  "rowCount": 2,
  "filters": { "moleculeId": null, "edgeId": null, "doi": "10.1038/example" },
  "rows": [
    {
      "dataset_id": "96828cd4-467c-44f8-b8f9-f4e6138be8eb",
      "experiment_type": "TEY",
      "sample_id": "7b801fdf-eec2-4cea-b02c-f3e7b00f1d28",
      "sample_identifier": "BENZENE_SAMPLE_01",
      "molecule_id": "04bc7f30-c6c8-49f2-a8b8-57cf4bf6c9fe",
      "molecule_iupac_name": "benzene",
      "edge_id": "0f6d8769-11ab-4cf8-bdf3-cae66f9f2f40",
      "edge_label": "C(K)",
      "instrument_id": "als-8-0-1",
      "instrument_name": "Beamline 8.0.1",
      "facility_id": "d12fe499-cf90-4f9b-8e49-a3e2855f87c5",
      "facility_name": "ALS",
      "publication_dois": "10.1038/example",
      "energy_ev": 284.5,
      "raw_abs": 0.057,
      "i0": 1.01,
      "od": 0.12,
      "mass_absorption": 0.34,
      "beta": 0.0019,
      "created_at": "2026-03-01T09:32:10.112Z"
    }
  ]
}`}
          </pre>
        </div>
      </section>

      <section className="border-border bg-surface rounded-lg border p-4">
        <h2 id="compatibility" className="text-foreground mb-2 text-lg font-semibold">
          Compatibility and transition
        </h2>
        <p className="text-muted text-sm leading-relaxed">
          Existing molecule redirect search remains available at{" "}
          <code>/api/molecules/search</code>. A compatibility route at{" "}
          <code>/api/v1/molecules/search</code> forwards to the legacy endpoint
          with query parameters preserved for a seamless transition.
        </p>
        <div className="border-border bg-default mt-3 rounded-md border p-3 text-xs">
          <p className="text-foreground mb-2 font-semibold">Compatibility request</p>
          <code>GET /api/v1/molecules/search?q=benzene</code>
        </div>
      </section>

      <section className="border-border bg-surface rounded-lg border p-4">
        <h2 id="errors" className="text-foreground mb-2 text-lg font-semibold">
          Status codes and errors
        </h2>
        <ul className="text-muted ml-6 list-disc space-y-1 text-sm leading-relaxed">
          <li>
            <code>200</code>: Successful response
          </li>
          <li>
            <code>400</code>: Query validation error (invalid parameter shape)
          </li>
          <li>
            <code>404</code>: Resource not found (for example unknown molecule)
          </li>
          <li>
            <code>500</code>: Unexpected server error
          </li>
        </ul>
        <div className="border-border bg-default mt-3 rounded-md border p-3 text-xs">
          <p className="text-foreground mb-2 font-semibold">Error response shape</p>
          <pre className="overflow-x-auto whitespace-pre-wrap">{`{ "error": "Human-readable error message" }`}</pre>
        </div>
      </section>
    </div>
  );
}
