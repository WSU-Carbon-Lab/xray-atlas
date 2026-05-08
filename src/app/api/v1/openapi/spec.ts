export const openApiV1Spec = {
  openapi: "3.1.0",
  info: {
    title: "X-ray Atlas Public Research API",
    version: "1.0.0",
    summary: "Public researcher-facing API for molecule and dataset discovery.",
    description:
      "OpenAPI contract for non-authenticated X-ray Atlas researcher routes under /api/v1.",
  },
  servers: [{ url: "/api/v1", description: "Versioned API base path" }],
  tags: [
    { name: "Molecules", description: "Molecule catalog and edge summaries." },
    { name: "Datasets", description: "Dataset summaries, DOI discovery, and exports." },
    { name: "Compatibility", description: "Transition routes for legacy behavior." },
    { name: "Contract", description: "OpenAPI contract discovery endpoint." },
  ],
  paths: {
    "/openapi": {
      get: {
        tags: ["Contract"],
        summary: "Get API contract",
        description:
          "Returns this OpenAPI contract in JSON by default or YAML when format=yaml.",
        parameters: [
          {
            name: "format",
            in: "query",
            schema: { type: "string", enum: ["json", "yaml"], default: "json" },
          },
        ],
        responses: {
          200: { description: "OpenAPI contract payload." },
        },
      },
    },
    "/molecules": {
      get: {
        tags: ["Molecules"],
        summary: "List molecules",
        description:
          "Returns paginated molecules with optional search and CAS/synonym filters.",
        parameters: [
          { name: "q", in: "query", schema: { type: "string", maxLength: 256 } },
          { name: "hasCas", in: "query", schema: { type: "boolean" } },
          {
            name: "synonymsCountMax",
            in: "query",
            schema: { type: "integer", minimum: 0, maximum: 1000 },
          },
          {
            name: "synonymsLimit",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 20, default: 5 },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 200, default: 50 },
          },
          {
            name: "offset",
            in: "query",
            schema: { type: "integer", minimum: 0, default: 0 },
          },
        ],
        responses: {
          200: { description: "Molecule catalog response." },
          400: { description: "Invalid query parameters." },
          500: { description: "Unexpected server error." },
        },
      },
    },
    "/molecules/{moleculeId}/edges": {
      get: {
        tags: ["Molecules"],
        summary: "List edge summaries for molecule",
        parameters: [
          {
            name: "moleculeId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
          { name: "doi", in: "query", schema: { type: "string", maxLength: 512 } },
        ],
        responses: {
          200: { description: "Molecule edge summary response." },
          400: { description: "Invalid parameters." },
          404: { description: "Molecule not found." },
          500: { description: "Unexpected server error." },
        },
      },
    },
    "/datasets": {
      get: {
        tags: ["Datasets"],
        summary: "List dataset summaries",
        parameters: [
          { name: "moleculeId", in: "query", schema: { type: "string", format: "uuid" } },
          { name: "edgeId", in: "query", schema: { type: "string", format: "uuid" } },
          { name: "doi", in: "query", schema: { type: "string", maxLength: 512 } },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 200, default: 50 },
          },
          {
            name: "offset",
            in: "query",
            schema: { type: "integer", minimum: 0, default: 0 },
          },
        ],
        responses: {
          200: { description: "Dataset summary response." },
          400: { description: "Invalid query parameters." },
          500: { description: "Unexpected server error." },
        },
      },
    },
    "/datasets/discover": {
      get: {
        tags: ["Datasets"],
        summary: "Discover datasets from DOI",
        parameters: [
          { name: "doi", in: "query", required: true, schema: { type: "string", minLength: 1 } },
          { name: "moleculeId", in: "query", schema: { type: "string", format: "uuid" } },
          { name: "edgeId", in: "query", schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          200: { description: "DOI-first discovery response." },
          400: { description: "Invalid query parameters." },
          404: { description: "DOI not found." },
          500: { description: "Unexpected server error." },
        },
      },
    },
    "/datasets/export": {
      get: {
        tags: ["Datasets"],
        summary: "Export dataset table",
        parameters: [
          { name: "moleculeId", in: "query", schema: { type: "string", format: "uuid" } },
          { name: "edgeId", in: "query", schema: { type: "string", format: "uuid" } },
          { name: "doi", in: "query", schema: { type: "string", maxLength: 512 } },
          {
            name: "format",
            in: "query",
            schema: { type: "string", enum: ["json", "csv"], default: "json" },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 100000, default: 10000 },
          },
        ],
        responses: {
          200: { description: "JSON or CSV export payload." },
          400: { description: "Invalid query parameters." },
          500: { description: "Unexpected server error." },
        },
      },
    },
    "/molecules/search": {
      get: {
        tags: ["Compatibility"],
        summary: "Compatibility redirect route",
        description: "Forwards query parameters to /api/molecules/search with HTTP 307.",
        responses: {
          307: { description: "Temporary redirect to legacy route." },
        },
      },
    },
  },
} as const;
