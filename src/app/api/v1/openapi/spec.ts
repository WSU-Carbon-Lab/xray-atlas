/**
 * OpenAPI 3.1 contract for the public `GET /api/v1` catalog routes.
 *
 * Describes the query parameters, status codes, and JSON or CSV bodies
 * implemented by the handlers under `src/app/api/v1`. Catalog GET operations
 * set `security` to an empty array. `GET /me` and `DELETE /me` require the
 * `xatlas` read credential.
 */
export const openApiV1Spec = {
  openapi: "3.1.0",
  info: {
    title: "X-ray Atlas Public Research API",
    version: "1.0.0",
    summary:
      "Public catalog, citation, physics, and download contract for X-ray Atlas.",
    description:
      'Public read contract under /api/v1 for molecules, datasets, BibTeX, dataset archives, and Henke atomic form factors. Catalog GET routes do not require an API key. GET /me and DELETE /me require Authorization: Bearer with a read credential minted by xatlas login after a passkey confirmation. The token starts with xra_ and is stored by the CLI. A malformed, unknown, or revoked key on /me returns 401 { error: "Unauthorized" } with WWW-Authenticate: Bearer. Molecule and dataset list routes stay public when no Authorization header is sent; a presented key that is malformed, unknown, or revoked returns the same 401. The website writes through the signed-in session, not these keys.',
  },
  servers: [{ url: "/api/v1", description: "Versioned API base path" }],
  tags: [
    { name: "Molecules", description: "Molecule catalog and edge summaries." },
    {
      name: "Datasets",
      description:
        "Dataset summaries, DOI discovery, exports, BibTeX, and archives.",
    },
    {
      name: "Physics",
      description: "Henke atomic form-factor tables.",
    },
    {
      name: "Compatibility",
      description: "Molecule search redirects used by browser search engines.",
    },
    { name: "Contract", description: "OpenAPI contract discovery endpoint." },
    {
      name: "Account",
      description: "Identity for a xatlas read credential.",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        description:
          "Read credential minted by xatlas login after a passkey confirmation. Starts with xra_, sent as Authorization: Bearer, and stored by the CLI. Required on GET /me and DELETE /me. The website writes through the signed-in session, not these keys.",
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        additionalProperties: false,
        required: ["error"],
        properties: {
          error: { type: "string" },
        },
      },
      Pagination: {
        type: "object",
        additionalProperties: false,
        required: ["limit", "offset", "nextOffset"],
        properties: {
          limit: { type: "integer" },
          offset: { type: "integer", minimum: 0 },
          nextOffset: {
            description:
              "Next page offset, or null when no further page is available.",
            type: ["integer", "null"],
          },
        },
      },
      MoleculeCatalogFilters: {
        type: "object",
        additionalProperties: false,
        required: ["q", "hasCas", "synonymsCountMax", "synonymsLimit"],
        properties: {
          q: { type: ["string", "null"] },
          hasCas: {
            description:
              "Echo of the hasCas query after parsing, or null when omitted.",
            type: ["boolean", "null"],
          },
          synonymsCountMax: { type: ["integer", "null"] },
          synonymsLimit: { type: "integer" },
        },
      },
      MoleculeCatalogItem: {
        type: "object",
        additionalProperties: false,
        required: [
          "id",
          "iupacName",
          "inchi",
          "smiles",
          "chemicalFormula",
          "casNumber",
          "pubChemCid",
          "favoriteCount",
          "viewCount",
          "synonymsCount",
          "sampleCount",
          "synonyms",
          "createdAt",
          "updatedAt",
        ],
        properties: {
          id: { type: "string", format: "uuid" },
          iupacName: { type: "string" },
          inchi: { type: "string" },
          smiles: { type: "string" },
          chemicalFormula: { type: "string" },
          casNumber: { type: ["string", "null"] },
          pubChemCid: { type: ["string", "null"] },
          favoriteCount: { type: "integer" },
          viewCount: { type: "integer" },
          synonymsCount: {
            description: "Total synonym rows, not the length of synonyms.",
            type: "integer",
          },
          sampleCount: { type: "integer" },
          synonyms: {
            description:
              "Synonym strings ordered by order then synonym, truncated to synonymsLimit.",
            type: "array",
            items: { type: "string" },
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      MoleculeCatalogResponse: {
        type: "object",
        additionalProperties: false,
        required: ["data", "pagination", "filters"],
        properties: {
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/MoleculeCatalogItem" },
          },
          pagination: { $ref: "#/components/schemas/Pagination" },
          filters: { $ref: "#/components/schemas/MoleculeCatalogFilters" },
        },
      },
      MoleculeEdgeFilters: {
        type: "object",
        additionalProperties: false,
        required: ["doi"],
        properties: {
          doi: {
            description:
              "Normalized DOI used to scope experiments, or null when omitted or blank.",
            type: ["string", "null"],
          },
        },
      },
      MoleculeRef: {
        type: "object",
        additionalProperties: false,
        required: ["id", "iupacName"],
        properties: {
          id: { type: "string", format: "uuid" },
          iupacName: { type: "string" },
        },
      },
      MoleculeEdgeItem: {
        type: "object",
        additionalProperties: false,
        required: [
          "edgeId",
          "targetAtom",
          "coreState",
          "label",
          "datasetCount",
        ],
        properties: {
          edgeId: { type: "string", format: "uuid" },
          targetAtom: { type: "string" },
          coreState: { type: "string" },
          label: {
            description: "Display label `<targetAtom>(<coreState>)`.",
            type: "string",
          },
          datasetCount: { type: "integer" },
        },
      },
      MoleculeEdgeResponse: {
        type: "object",
        additionalProperties: false,
        required: ["molecule", "filters", "data"],
        properties: {
          molecule: { $ref: "#/components/schemas/MoleculeRef" },
          filters: { $ref: "#/components/schemas/MoleculeEdgeFilters" },
          data: {
            description:
              "Edges sorted by datasetCount descending, then label ascending. Edges missing from the edges table are omitted.",
            type: "array",
            items: { $ref: "#/components/schemas/MoleculeEdgeItem" },
          },
        },
      },
      UuidOrNull: {
        anyOf: [{ type: "string", format: "uuid" }, { type: "null" }],
      },
      DatasetFilters: {
        type: "object",
        additionalProperties: false,
        required: ["moleculeId", "edgeId", "atlasDatasetId", "doi"],
        properties: {
          moleculeId: { $ref: "#/components/schemas/UuidOrNull" },
          edgeId: { $ref: "#/components/schemas/UuidOrNull" },
          atlasDatasetId: {
            description: "Normalized Atlas dataset id, or null when omitted.",
            type: ["string", "null"],
          },
          doi: {
            description:
              "Normalized DOI (resolver prefix removed and lowercased), or null when omitted.",
            type: ["string", "null"],
          },
        },
      },
      DiscoverFilters: {
        type: "object",
        additionalProperties: false,
        required: ["moleculeId", "edgeId"],
        properties: {
          moleculeId: { $ref: "#/components/schemas/UuidOrNull" },
          edgeId: { $ref: "#/components/schemas/UuidOrNull" },
        },
      },
      ExperimentType: {
        description:
          "experiments.experimenttype. Null when the column is unset.",
        anyOf: [
          {
            type: "string",
            enum: [
              "TOTAL_ELECTRON_YIELD",
              "PARTIAL_ELECTRON_YIELD",
              "FLUORESCENT_YIELD",
              "TRANSMISSION",
            ],
          },
          { type: "null" },
        ],
      },
      EdgeSummary: {
        type: "object",
        additionalProperties: false,
        required: ["id", "targetAtom", "coreState", "label"],
        properties: {
          id: { type: "string", format: "uuid" },
          targetAtom: { type: "string" },
          coreState: { type: "string" },
          label: { type: "string" },
        },
      },
      SampleSummary: {
        type: "object",
        additionalProperties: false,
        required: ["id", "identifier"],
        properties: {
          id: { type: "string", format: "uuid" },
          identifier: { type: "string" },
        },
      },
      InstrumentSummary: {
        type: "object",
        additionalProperties: false,
        required: ["id", "name"],
        properties: {
          id: {
            description:
              "Instrument primary key. Not constrained to UUID format.",
            type: "string",
          },
          name: { type: "string" },
        },
      },
      FacilitySummary: {
        type: "object",
        additionalProperties: false,
        required: ["id", "name"],
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
        },
      },
      DatasetCore: {
        type: "object",
        additionalProperties: false,
        required: [
          "datasetId",
          "experimentType",
          "edge",
          "molecule",
          "sample",
          "instrument",
          "facility",
          "spectrumPointCount",
          "createdAt",
        ],
        properties: {
          datasetId: { type: "string", format: "uuid" },
          atlasDatasetId: {
            description:
              "Opaque Atlas dataset id used by /d/{atlasDatasetId}. Null until that id is assigned.",
            type: ["string", "null"],
          },
          experimentType: { $ref: "#/components/schemas/ExperimentType" },
          edge: { $ref: "#/components/schemas/EdgeSummary" },
          molecule: { $ref: "#/components/schemas/MoleculeRef" },
          sample: { $ref: "#/components/schemas/SampleSummary" },
          instrument: { $ref: "#/components/schemas/InstrumentSummary" },
          facility: {
            description:
              "Joined facility, or null when the handler has no facilities row.",
            anyOf: [
              { $ref: "#/components/schemas/FacilitySummary" },
              { type: "null" },
            ],
          },
          spectrumPointCount: { type: "integer" },
          qualityAggregateScore: {
            description:
              "experimentmetrics.quality_aggregate_score. Null when that row has no score.",
            type: ["number", "null"],
          },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      PublicationLink: {
        type: "object",
        additionalProperties: false,
        required: ["id", "doi", "title", "year", "role"],
        properties: {
          id: { type: "string", format: "uuid" },
          doi: { type: "string" },
          title: { type: "string" },
          year: { type: ["integer", "null"] },
          role: {
            description: "experimentpublications.role, for example source.",
            type: "string",
          },
        },
      },
      DatasetListItem: {
        allOf: [
          { $ref: "#/components/schemas/DatasetCore" },
          {
            type: "object",
            additionalProperties: false,
            required: [
              "datasetDoi",
              "zenodoDepositState",
              "zenodoRecordUrl",
              "publications",
            ],
            properties: {
              datasetDoi: {
                description:
                  "experimentmetrics.datasetdoi, otherwise the Zenodo deposit doi, otherwise null.",
                type: ["string", "null"],
              },
              zenodoDepositState: {
                description:
                  "Zenodo deposit state, or null when the experiment has no deposit row.",
                anyOf: [
                  {
                    type: "string",
                    enum: ["pending", "depositing", "published", "failed"],
                  },
                  { type: "null" },
                ],
              },
              zenodoRecordUrl: { type: ["string", "null"] },
              publications: {
                description:
                  "Linked publications ordered by doi ascending. journal is not included.",
                type: "array",
                items: { $ref: "#/components/schemas/PublicationLink" },
              },
            },
          },
        ],
      },
      DatasetListResponse: {
        type: "object",
        additionalProperties: false,
        required: ["data", "pagination", "filters"],
        properties: {
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/DatasetListItem" },
          },
          pagination: { $ref: "#/components/schemas/Pagination" },
          filters: { $ref: "#/components/schemas/DatasetFilters" },
        },
      },
      PublicationRecord: {
        type: "object",
        additionalProperties: false,
        required: ["id", "doi", "title", "journal", "year"],
        properties: {
          id: { type: "string", format: "uuid" },
          doi: { type: "string" },
          title: { type: "string" },
          journal: { type: ["string", "null"] },
          year: { type: ["integer", "null"] },
        },
      },
      DatasetDiscoverResponse: {
        type: "object",
        additionalProperties: false,
        required: ["publication", "filters", "data"],
        properties: {
          publication: { $ref: "#/components/schemas/PublicationRecord" },
          filters: { $ref: "#/components/schemas/DiscoverFilters" },
          data: {
            description:
              "Matching datasets ordered by createdAt descending, then id descending. Empty when the publication exists and no experiment matches the filters.",
            type: "array",
            items: { $ref: "#/components/schemas/DatasetCore" },
          },
        },
      },
      DatasetExportFilters: {
        type: "object",
        additionalProperties: false,
        required: [
          "moleculeId",
          "edgeId",
          "datasetId",
          "atlasDatasetId",
          "doi",
        ],
        properties: {
          moleculeId: { $ref: "#/components/schemas/UuidOrNull" },
          edgeId: { $ref: "#/components/schemas/UuidOrNull" },
          datasetId: { $ref: "#/components/schemas/UuidOrNull" },
          atlasDatasetId: {
            description: "Normalized Atlas dataset id, or null when omitted.",
            type: ["string", "null"],
          },
          doi: { type: ["string", "null"] },
        },
      },
      DatasetExportRow: {
        type: "object",
        additionalProperties: false,
        required: [
          "dataset_id",
          "atlas_dataset_id",
          "experiment_type",
          "sample_id",
          "sample_identifier",
          "molecule_id",
          "molecule_iupac_name",
          "edge_id",
          "edge_label",
          "instrument_id",
          "instrument_name",
          "facility_id",
          "facility_name",
          "publication_dois",
          "energy_ev",
          "raw_abs",
          "i0",
          "od",
          "mass_absorption",
          "beta",
          "delta",
          "created_at",
        ],
        properties: {
          dataset_id: { type: "string", format: "uuid" },
          atlas_dataset_id: {
            description:
              "Atlas dataset id for /d/{atlas_dataset_id}, or null when unassigned.",
            type: ["string", "null"],
          },
          experiment_type: { $ref: "#/components/schemas/ExperimentType" },
          sample_id: { type: "string", format: "uuid" },
          sample_identifier: { type: "string" },
          molecule_id: { type: "string", format: "uuid" },
          molecule_iupac_name: { type: "string" },
          edge_id: { type: "string", format: "uuid" },
          edge_label: { type: "string" },
          instrument_id: { type: "string" },
          instrument_name: { type: "string" },
          facility_id: { type: ["string", "null"] },
          facility_name: { type: ["string", "null"] },
          publication_dois: {
            description:
              "Publication DOIs sorted and joined with ';'. Empty string when none are linked.",
            type: "string",
          },
          energy_ev: {
            description: "Spectrum energy in eV.",
            type: "number",
          },
          raw_abs: { type: "number" },
          i0: { type: ["number", "null"] },
          od: { type: ["number", "null"] },
          mass_absorption: { type: ["number", "null"] },
          beta: { type: ["number", "null"] },
          delta: { type: ["number", "null"] },
          created_at: { type: "string", format: "date-time" },
        },
      },
      DatasetExportJsonResponse: {
        type: "object",
        additionalProperties: false,
        required: ["columns", "rowCount", "filters", "rows"],
        properties: {
          columns: {
            type: "array",
            minItems: 22,
            maxItems: 22,
            prefixItems: [
              { const: "dataset_id" },
              { const: "atlas_dataset_id" },
              { const: "experiment_type" },
              { const: "sample_id" },
              { const: "sample_identifier" },
              { const: "molecule_id" },
              { const: "molecule_iupac_name" },
              { const: "edge_id" },
              { const: "edge_label" },
              { const: "instrument_id" },
              { const: "instrument_name" },
              { const: "facility_id" },
              { const: "facility_name" },
              { const: "publication_dois" },
              { const: "energy_ev" },
              { const: "raw_abs" },
              { const: "i0" },
              { const: "od" },
              { const: "mass_absorption" },
              { const: "beta" },
              { const: "delta" },
              { const: "created_at" },
            ],
            items: { type: "string" },
          },
          rowCount: {
            description:
              "Number of spectrum rows in this response. At most limit. Not a catalog total.",
            type: "integer",
            minimum: 0,
          },
          filters: { $ref: "#/components/schemas/DatasetExportFilters" },
          rows: {
            type: "array",
            items: { $ref: "#/components/schemas/DatasetExportRow" },
          },
        },
      },
    },
  },
  paths: {
    "/me": {
      get: {
        tags: ["Account"],
        operationId: "getCliAccount",
        summary: "Get the xatlas account",
        description:
          "Requires Authorization: Bearer with a xatlas read credential. Returns the ORCID iD, display name, and scope. Does not return the token.",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Account bound to the presented credential.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  additionalProperties: false,
                  required: ["orcid", "name", "scope"],
                  properties: {
                    orcid: { type: "string" },
                    name: { type: ["string", "null"] },
                    scope: { type: "string", const: "read" },
                  },
                },
              },
            },
          },
          "401": {
            description:
              'Missing, malformed, unknown, or revoked credential. error is "Unauthorized". WWW-Authenticate is Bearer.',
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      delete: {
        tags: ["Account"],
        operationId: "revokeCliAccount",
        summary: "Revoke the xatlas credential",
        description:
          "Requires Authorization: Bearer. Revokes that read credential. xatlas auth logout calls this, then deletes the local credential file.",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "The presented credential is revoked.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  additionalProperties: false,
                  required: ["revoked"],
                  properties: {
                    revoked: { type: "boolean", const: true },
                  },
                },
              },
            },
          },
          "401": {
            description:
              'Missing, malformed, unknown, or revoked credential. error is "Unauthorized".',
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/openapi": {
      get: {
        tags: ["Contract"],
        operationId: "getOpenApiV1",
        summary: "Get API contract",
        description:
          "Public GET. No API key. Returns this OpenAPI document as JSON by default. format=yaml returns the same document as YAML.",
        security: [],
        parameters: [
          {
            name: "format",
            in: "query",
            required: false,
            description:
              "Response encoding. Omitted or json returns application/json. yaml returns application/yaml.",
            schema: {
              type: "string",
              enum: ["json", "yaml"],
              default: "json",
            },
          },
        ],
        responses: {
          "200": {
            description:
              "OpenAPI contract. JSON when format is omitted or json. YAML when format=yaml.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  description:
                    "This OpenAPI document. Top-level members are openapi, info, servers, tags, components, and paths.",
                  required: ["openapi", "info", "paths"],
                  properties: {
                    openapi: { const: "3.1.0" },
                    info: { type: "object" },
                    servers: { type: "array" },
                    tags: { type: "array" },
                    components: { type: "object" },
                    paths: { type: "object" },
                  },
                },
              },
              "application/yaml": {
                schema: {
                  type: "string",
                  description:
                    "Same document encoded as YAML when format=yaml. Content-Type is application/yaml; charset=utf-8.",
                },
              },
            },
          },
          "400": {
            description:
              'Invalid format. Body error is "Invalid format parameter."',
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                examples: {
                  invalidFormat: {
                    value: { error: "Invalid format parameter." },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/molecules": {
      get: {
        tags: ["Molecules"],
        operationId: "listMolecules",
        summary: "List molecules",
        description:
          "Public GET. No API key. Returns molecules ordered by favoriteCount descending, viewCount descending, then iupacName ascending. q matches IUPAC name, InChI, SMILES, chemical formula, CAS number, PubChem CID, and synonyms using a case-insensitive substring. hasCas=true keeps rows with a CAS number; hasCas=false keeps rows whose CAS number is null. When synonymsCountMax is set, the handler loads at most 1000 molecules before applying that filter and then paginates the filtered list.",
        security: [],
        parameters: [
          {
            name: "q",
            in: "query",
            required: false,
            schema: { type: "string", maxLength: 256 },
          },
          {
            name: "hasCas",
            in: "query",
            required: false,
            description: 'Literal query string "true" or "false".',
            schema: { type: "string", enum: ["true", "false"] },
          },
          {
            name: "synonymsCountMax",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 0, maximum: 1000 },
          },
          {
            name: "synonymsLimit",
            in: "query",
            required: false,
            description: "Maximum synonym strings returned on each molecule.",
            schema: { type: "integer", minimum: 1, maximum: 20, default: 5 },
          },
          {
            name: "limit",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 1, maximum: 200, default: 50 },
          },
          {
            name: "offset",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 0, default: 0 },
          },
        ],
        responses: {
          "200": {
            description: "Molecule catalog page.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/MoleculeCatalogResponse",
                },
              },
            },
          },
          "400": {
            description:
              'Invalid query. error is the first Zod issue message, or "Invalid query parameters." when Zod reports no issues.',
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                examples: {
                  hasCas: {
                    value: {
                      error:
                        "Invalid enum value. Expected 'true' | 'false', received 'yes'",
                    },
                  },
                  limit: {
                    value: {
                      error: "Number must be greater than or equal to 1",
                    },
                  },
                  fallback: {
                    value: { error: "Invalid query parameters." },
                  },
                },
              },
            },
          },
          "500": {
            description:
              'Unexpected failure. error is "Failed to list molecules."',
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                examples: {
                  failed: { value: { error: "Failed to list molecules." } },
                },
              },
            },
          },
        },
      },
    },
    "/molecules/{moleculeId}/edges": {
      get: {
        tags: ["Molecules"],
        operationId: "listMoleculeEdges",
        summary: "List edge summaries for molecule",
        description:
          "Public GET. No API key. Counts experiments for the molecule, optionally limited to those linked to the normalized DOI.",
        security: [],
        parameters: [
          {
            name: "moleculeId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
          {
            name: "doi",
            in: "query",
            required: false,
            description:
              "Optional DOI, trimmed, at most 512 characters. Blank values normalize to a null filter. A resolver prefix is stripped and the remainder is lowercased before matching publication DOIs.",
            schema: { type: "string", maxLength: 512 },
          },
        ],
        responses: {
          "200": {
            description: "Molecule edge summary.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MoleculeEdgeResponse" },
              },
            },
          },
          "400": {
            description:
              'Invalid path or query. error is the first Zod issue message, or "Invalid request parameters." when Zod reports no issues.',
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                examples: {
                  uuid: { value: { error: "Invalid uuid" } },
                  fallback: {
                    value: { error: "Invalid request parameters." },
                  },
                },
              },
            },
          },
          "404": {
            description: 'Unknown molecule. error is "Molecule not found."',
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                examples: {
                  missing: { value: { error: "Molecule not found." } },
                },
              },
            },
          },
          "500": {
            description:
              'Unexpected failure. error is "Failed to load edge summary."',
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                examples: {
                  failed: {
                    value: { error: "Failed to load edge summary." },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/molecules/search": {
      get: {
        tags: ["Compatibility"],
        operationId: "redirectMoleculeSearch",
        summary: "Resolve a molecule search",
        description:
          "Public GET. No API key. Uses the same resolver as /api/molecules/search. One of q, query, search, or s is required. A single confident match redirects to /molecules/{slug}. Several matches redirect to /browse/molecules?q=.",
        security: [],
        parameters: [
          {
            name: "q",
            in: "query",
            required: false,
            description:
              "Search text, 1 to 256 characters. query, search, and s are accepted aliases. At least one of the four must be non-empty.",
            schema: { type: "string", minLength: 1, maxLength: 256 },
          },
        ],
        responses: {
          "307": {
            description:
              "Temporary redirect to one molecule page or to /browse/molecules. No JSON body.",
            headers: {
              Location: {
                description:
                  "Absolute URL on the request origin. Either /molecules/{slug} or /browse/molecules?q=.",
                required: true,
                schema: { type: "string" },
              },
            },
          },
          "400": {
            description:
              'Missing search text. error is "A non-empty search string is required."',
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                examples: {
                  empty: {
                    value: {
                      error: "A non-empty search string is required.",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/datasets": {
      get: {
        tags: ["Datasets"],
        operationId: "listDatasets",
        summary: "List dataset summaries",
        description:
          "Public GET. No API key. Returns experiment summaries ordered by createdAt descending, then dataset id descending. doi matches a linked publication DOI after normalization.",
        security: [],
        parameters: [
          {
            name: "moleculeId",
            in: "query",
            required: false,
            schema: { type: "string", format: "uuid" },
          },
          {
            name: "edgeId",
            in: "query",
            required: false,
            schema: { type: "string", format: "uuid" },
          },
          {
            name: "atlasDatasetId",
            in: "query",
            required: false,
            description:
              "Atlas dataset id, 8 characters, or a d/{id} path. Filters to that dataset.",
            schema: { type: "string" },
          },
          {
            name: "doi",
            in: "query",
            required: false,
            description:
              "Optional DOI. When present it must be 1 to 512 characters after trimming, then it is normalized before filtering.",
            schema: { type: "string", minLength: 1, maxLength: 512 },
          },
          {
            name: "limit",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 1, maximum: 200, default: 50 },
          },
          {
            name: "offset",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 0, default: 0 },
          },
        ],
        responses: {
          "200": {
            description: "Dataset summary page.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DatasetListResponse" },
              },
            },
          },
          "400": {
            description:
              'Invalid query. error is the first Zod issue message, or "Invalid query parameters." when Zod reports no issues.',
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                examples: {
                  uuid: { value: { error: "Invalid uuid" } },
                  fallback: {
                    value: { error: "Invalid query parameters." },
                  },
                },
              },
            },
          },
          "500": {
            description:
              'Unexpected failure. error is "Failed to list dataset summaries."',
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                examples: {
                  failed: {
                    value: { error: "Failed to list dataset summaries." },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/datasets/discover": {
      get: {
        tags: ["Datasets"],
        operationId: "discoverDatasetsByDoi",
        summary: "Discover datasets from DOI",
        description:
          "Public GET. No API key. Looks up one publication by normalized DOI and lists experiments linked to that DOI. Optional moleculeId and edgeId narrow the experiment list. The response has no pagination.",
        security: [],
        parameters: [
          {
            name: "doi",
            in: "query",
            required: true,
            description:
              "DOI, trimmed, 1 to 512 characters. A resolver prefix is stripped and the remainder is lowercased. A value that normalizes to empty is rejected.",
            schema: { type: "string", minLength: 1, maxLength: 512 },
          },
          {
            name: "moleculeId",
            in: "query",
            required: false,
            schema: { type: "string", format: "uuid" },
          },
          {
            name: "edgeId",
            in: "query",
            required: false,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "Publication plus matching dataset summaries.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/DatasetDiscoverResponse",
                },
              },
            },
          },
          "400": {
            description:
              'Invalid query. Missing, blank, or empty-after-normalization DOI uses "DOI is required." Other failures use the first Zod issue message, or "Invalid query parameters." when Zod reports no issues.',
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                examples: {
                  doiRequired: { value: { error: "DOI is required." } },
                  fallback: {
                    value: { error: "Invalid query parameters." },
                  },
                },
              },
            },
          },
          "404": {
            description:
              'No publication row for the normalized DOI. error is "DOI not found."',
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                examples: {
                  missing: { value: { error: "DOI not found." } },
                },
              },
            },
          },
          "500": {
            description:
              'Unexpected failure. error is "Failed DOI-first dataset discovery."',
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                examples: {
                  failed: {
                    value: { error: "Failed DOI-first dataset discovery." },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/datasets/preview": {
      get: {
        tags: ["Datasets"],
        operationId: "previewDataset",
        summary: "Preview spectrum samples by polarization",
        description:
          "Public GET. No API key. Returns the first rows energy samples of one dataset, partitioned by polarization pair (polarDeg, azimuthDeg) and ordered by energy_ev. rows is 5 to 10 and defaults to 8. Provide datasetId or atlasDatasetId.",
        security: [],
        parameters: [
          {
            name: "datasetId",
            in: "query",
            required: false,
            schema: { type: "string", format: "uuid" },
          },
          {
            name: "atlasDatasetId",
            in: "query",
            required: false,
            description: "Atlas dataset id, 8 characters, or a d/{id} path.",
            schema: { type: "string" },
          },
          {
            name: "rows",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 5, maximum: 10, default: 8 },
          },
        ],
        responses: {
          "200": {
            description: "Leading samples for each polarization pair.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  additionalProperties: false,
                  required: [
                    "datasetId",
                    "atlasDatasetId",
                    "rowsPerGroup",
                    "groups",
                  ],
                  properties: {
                    datasetId: { type: "string", format: "uuid" },
                    atlasDatasetId: { type: "string", nullable: true },
                    rowsPerGroup: { type: "integer" },
                    groups: {
                      type: "array",
                      items: {
                        type: "object",
                        additionalProperties: false,
                        required: [
                          "polarDeg",
                          "azimuthDeg",
                          "pointCount",
                          "rows",
                        ],
                        properties: {
                          polarDeg: { type: "number", nullable: true },
                          azimuthDeg: { type: "number", nullable: true },
                          pointCount: { type: "integer" },
                          rows: {
                            type: "array",
                            items: {
                              type: "object",
                              additionalProperties: false,
                              required: [
                                "energyEv",
                                "rawAbs",
                                "od",
                                "massAbsorption",
                                "beta",
                                "delta",
                              ],
                              properties: {
                                energyEv: { type: "number" },
                                rawAbs: { type: "number" },
                                od: { type: "number", nullable: true },
                                massAbsorption: {
                                  type: "number",
                                  nullable: true,
                                },
                                beta: { type: "number", nullable: true },
                                delta: { type: "number", nullable: true },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Missing dataset id or rows outside 5 to 10.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "404": {
            description: "Dataset was not found.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/datasets/export": {
      get: {
        tags: ["Datasets"],
        operationId: "exportDatasets",
        summary: "Export dataset table",
        description:
          "Public GET. No API key. Returns spectrum-point rows ordered by experiment createdAt descending, experiment id ascending, then energy_ev ascending, truncated to limit. format=json (default) returns application/json. format=csv returns text/csv. datasetId limits the rows to one experiment.",
        security: [],
        parameters: [
          {
            name: "moleculeId",
            in: "query",
            required: false,
            schema: { type: "string", format: "uuid" },
          },
          {
            name: "edgeId",
            in: "query",
            required: false,
            schema: { type: "string", format: "uuid" },
          },
          {
            name: "datasetId",
            in: "query",
            required: false,
            description:
              "One experiment UUID. Narrows the export to that dataset.",
            schema: { type: "string", format: "uuid" },
          },
          {
            name: "atlasDatasetId",
            in: "query",
            required: false,
            description:
              "Atlas dataset id, 8 characters, or a d/{id} path. Narrows the export to that dataset.",
            schema: { type: "string" },
          },
          {
            name: "doi",
            in: "query",
            required: false,
            description:
              "Optional DOI. When present it must be 1 to 512 characters after trimming, then it is normalized before filtering.",
            schema: { type: "string", minLength: 1, maxLength: 512 },
          },
          {
            name: "format",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["json", "csv"], default: "json" },
          },
          {
            name: "limit",
            in: "query",
            required: false,
            description: "Maximum spectrum rows returned.",
            schema: {
              type: "integer",
              minimum: 1,
              maximum: 100000,
              default: 10000,
            },
          },
        ],
        responses: {
          "200": {
            description:
              'JSON export when format is omitted or json. CSV export when format=csv. CSV Content-Type is text/csv; charset=utf-8 and Content-Disposition is attachment; filename="xray-atlas-datasets-v1.csv". Null CSV cells are empty. Fields that contain a comma, double quote, or newline are quoted.',
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/DatasetExportJsonResponse",
                },
              },
              "text/csv": {
                schema: {
                  type: "string",
                  description:
                    "Header row then one spectrum row. Columns, in order: dataset_id, atlas_dataset_id, experiment_type, sample_id, sample_identifier, molecule_id, molecule_iupac_name, edge_id, edge_label, instrument_id, instrument_name, facility_id, facility_name, publication_dois, energy_ev, raw_abs, i0, od, mass_absorption, beta, delta, created_at.",
                },
              },
            },
          },
          "400": {
            description:
              'Invalid query. error is the first Zod issue message, or "Invalid query parameters." when Zod reports no issues.',
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                examples: {
                  format: {
                    value: {
                      error:
                        "Invalid enum value. Expected 'json' | 'csv', received 'xml'",
                    },
                  },
                  fallback: {
                    value: { error: "Invalid query parameters." },
                  },
                },
              },
            },
          },
          "500": {
            description:
              'Unexpected failure. error is "Failed to export datasets."',
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                examples: {
                  failed: { value: { error: "Failed to export datasets." } },
                },
              },
            },
          },
        },
      },
    },
    "/datasets/query": {
      post: {
        tags: ["Datasets"],
        operationId: "queryDatasets",
        summary: "Query the spectrum export",
        description:
          "Public POST. No API key. Runs one SELECT or WITH against spectrum_points, the same columns as the dataset export. Other relations, writes, comments, and multiple statements are rejected. limit defaults to 100 and cannot exceed 10000. truncated is true when more rows matched.",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                additionalProperties: false,
                required: ["sql"],
                properties: {
                  sql: {
                    type: "string",
                    minLength: 1,
                    maxLength: 8000,
                    description:
                      "One SELECT or WITH that reads spectrum_points.",
                  },
                  limit: {
                    type: "integer",
                    minimum: 1,
                    maximum: 10000,
                    default: 100,
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description:
              "Capped rows. columns follows the statement's output names. rowCount is the number of returned rows.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  additionalProperties: false,
                  required: ["columns", "rowCount", "truncated", "rows"],
                  properties: {
                    columns: {
                      type: "array",
                      items: { type: "string" },
                    },
                    rowCount: { type: "integer" },
                    truncated: { type: "boolean" },
                    rows: {
                      type: "array",
                      items: {
                        type: "object",
                        additionalProperties: {
                          type: ["string", "number", "null"],
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": {
            description:
              "Invalid JSON, rejected SQL, or a limit outside 1 to 10000.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "500": {
            description:
              'The statement failed. error is "The query could not run." or a short database diagnostic that does not name internal tables.',
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/datasets/{experimentId}/bibtex": {
      get: {
        tags: ["Datasets"],
        operationId: "getDatasetBibtex",
        summary: "Download dataset BibTeX",
        description:
          "Public GET. No API key. Returns one @dataset BibTeX record for the experiment, including authors, Zenodo DOI when present, and the Atlas /d/{id} URL when an Atlas dataset id exists.",
        security: [],
        parameters: [
          {
            name: "experimentId",
            in: "path",
            required: true,
            description: "Experiment UUID.",
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description:
              "BibTeX attachment. Content-Type is application/x-bibtex.",
            content: {
              "application/x-bibtex": {
                schema: { type: "string" },
              },
            },
          },
          "400": {
            description: 'Invalid id. error is "Invalid experiment id".',
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                examples: {
                  invalid: { value: { error: "Invalid experiment id" } },
                },
              },
            },
          },
          "404": {
            description: 'Unknown experiment. error is "Not found".',
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                examples: {
                  missing: { value: { error: "Not found" } },
                },
              },
            },
          },
        },
      },
    },
    "/datasets/{experimentId}/bundle": {
      get: {
        tags: ["Datasets"],
        operationId: "getDatasetBundle",
        summary: "Download dataset archive",
        description:
          "Public GET. No API key. Returns a gzip-compressed tar of polarization CSVs plus committed experiment and sample auxiliary files. Browse-public files only.",
        security: [],
        parameters: [
          {
            name: "experimentId",
            in: "path",
            required: true,
            description: "Experiment UUID.",
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description:
              "Gzip tar archive. Content-Type is application/gzip. Content-Disposition carries the download filename.",
            content: {
              "application/gzip": {
                schema: { type: "string", format: "binary" },
              },
            },
          },
          "400": {
            description: 'Invalid id. Body text is "Invalid experiment id".',
          },
          "404": {
            description:
              'Unknown experiment. Body text is "Experiment not found".',
          },
          "500": {
            description: 'Body text is "Failed to build dataset bundle".',
          },
        },
      },
    },
    "/physics/atomic-form-factor": {
      get: {
        tags: ["Physics"],
        operationId: "getAtomicFormFactor",
        summary: "Get a Henke atomic form factor",
        description:
          "Public GET. No API key. Returns the CXRO Henke .nff table for one element. Successful tables are reused inside the server process. Upstream failures are not cached.",
        security: [],
        parameters: [
          {
            name: "atom",
            in: "query",
            required: true,
            description:
              "Element symbol. One uppercase letter, or one uppercase letter followed by one lowercase letter.",
            schema: { type: "string", pattern: "^[A-Z][a-z]?$" },
          },
        ],
        responses: {
          "200": {
            description: "JSON object whose data field is the .nff file text.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  additionalProperties: false,
                  required: ["data"],
                  properties: {
                    data: { type: "string" },
                  },
                },
              },
            },
          },
          "400": {
            description:
              'Missing atom uses "Atom parameter is required." An invalid symbol uses "Invalid atom symbol".',
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                examples: {
                  missing: { value: { error: "Atom parameter is required." } },
                  invalid: { value: { error: "Invalid atom symbol" } },
                },
              },
            },
          },
        },
      },
    },
  },
} as const;
