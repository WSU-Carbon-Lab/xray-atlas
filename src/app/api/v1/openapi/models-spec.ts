/**
 * OpenAPI fragments for the `/api/v1/models` optical model routes.
 *
 * Exports `modelsPaths` and `modelsSchemas`, merged into `openApiV1Spec`, and `modelsTag`. Reads
 * accept anonymous callers (public models) or a bearer token; writes need a bearer token with the
 * `write` scope. Errors use the shared `ErrorEnvelope`. Contains no runtime logic.
 */

function err(description: string) {
  return {
    description,
    content: {
      "application/json": {
        schema: { $ref: "#/components/schemas/ErrorEnvelope" },
      },
    },
  };
}

const readErrors = {
  "401": err(
    "An Authorization header is present but malformed, expired, or revoked.",
  ),
  "404": err(
    "The model or version does not exist or is not visible to the caller.",
  ),
  "422": err("Validation failed; the message lists path and reason pairs."),
} as const;

const writeErrors = {
  "400": err("Request body is not valid JSON."),
  "401": err("Missing, malformed, expired, or revoked bearer token."),
  "403": err(
    "The token lacks the write scope (CLI_TOKEN_SCOPE_FORBIDDEN), the caller does not own the model, or the contribution agreement is not accepted (CONTRIBUTION_AGREEMENT_REQUIRED).",
  ),
  "404": err("The model does not exist or is not visible to the caller."),
  "409": err("The request lost a race or the object is in the wrong state."),
  "422": err("Validation failed; the message lists path and reason pairs."),
} as const;

const optionalBearer: readonly Readonly<Record<string, readonly string[]>>[] = [
  {},
  { bearerAuth: [] },
];
const requiredBearer: readonly Readonly<Record<string, readonly string[]>>[] = [
  { bearerAuth: [] },
];

const tagParam = {
  name: "tag",
  in: "path",
  required: true,
  description: "Optical model tag (8 characters, case-insensitive).",
  schema: { type: "string", minLength: 1, maxLength: 32 },
} as const;

const versionParam = {
  name: "version",
  in: "query",
  required: false,
  description:
    "latest (default), draft (owner only), or a published version number.",
  schema: { type: "string", pattern: "^(latest|draft|[1-9][0-9]*)$" },
} as const;

function jsonOk(schemaName: string, description: string) {
  return {
    description,
    content: {
      "application/json": {
        schema: { $ref: `#/components/schemas/${schemaName}` },
      },
    },
  };
}

function jsonBody(schemaName: string) {
  return {
    required: true,
    content: {
      "application/json": {
        schema: { $ref: `#/components/schemas/${schemaName}` },
      },
    },
  };
}

export const modelsTag = {
  name: "Optical models",
  description:
    "User-owned, versioned, forkable, citable analysis objects (normalization, peaks, tensor) attached to datasets.",
} as const;

const window = {
  type: "array",
  minItems: 2,
  maxItems: 2,
  items: { type: "number" },
  description: "[low, high] energy window in eV with low < high.",
} as const;

const windowPair = {
  type: "object",
  additionalProperties: false,
  required: ["pre", "post"],
  properties: { pre: window, post: window },
} as const;

const nullableString = { type: ["string", "null"] } as const;
const nullableNumber = { type: ["number", "null"] } as const;

export const modelsSchemas = {
  OpticalModelNormalization: {
    description:
      "Normalization of a model. scope unified applies one pre and post window to every channel; per_channel gives od, massabsorption, and beta their own pair. Each pre window must end at or before its post window starts.",
    oneOf: [
      {
        type: "object",
        additionalProperties: false,
        required: ["schemaVersion", "scope", "pre", "post"],
        properties: {
          schemaVersion: { const: 1 },
          scope: { const: "unified" },
          pre: window,
          post: window,
        },
      },
      {
        type: "object",
        additionalProperties: false,
        required: ["schemaVersion", "scope", "od", "massabsorption", "beta"],
        properties: {
          schemaVersion: { const: 1 },
          scope: { const: "per_channel" },
          od: windowPair,
          massabsorption: windowPair,
          beta: windowPair,
        },
      },
    ],
  },
  OpticalModelPeak: {
    type: "object",
    required: ["centerEv", "kind"],
    properties: {
      ordinal: { type: "integer" },
      centerEv: { type: "number" },
      kind: { enum: ["pi-star", "sigma-star", "other"] },
      transition: { ...nullableString, maxLength: 200 },
      amplitude: nullableNumber,
      width: { type: ["number", "null"], minimum: 0 },
      shape: { ...nullableString, maxLength: 60 },
      centerErr: { type: ["number", "null"], minimum: 0 },
      amplitudeErr: { type: ["number", "null"], minimum: 0 },
      widthErr: { type: ["number", "null"], minimum: 0 },
      experimentId: { type: ["string", "null"], format: "uuid" },
      polarizationId: { type: ["string", "null"], format: "uuid" },
      params: {
        type: ["object", "null"],
        maxProperties: 50,
        additionalProperties: { type: ["number", "string", "boolean"] },
      },
      fitProvenance: {
        type: ["object", "null"],
        required: ["tool"],
        properties: {
          tool: { type: "string" },
          version: { type: "string" },
          codeHash: { type: "string" },
        },
      },
    },
  },
  OpticalModelTensorManifest: {
    type: "object",
    required: [
      "schemaVersion",
      "format",
      "energyEv",
      "components",
      "frame",
      "units",
      "dtype",
      "shape",
    ],
    properties: {
      schemaVersion: { const: 1 },
      format: { enum: ["npz", "parquet"] },
      energyEv: {
        type: "object",
        required: ["min", "max", "count"],
        properties: {
          min: { type: "number" },
          max: { type: "number" },
          count: { type: "integer", minimum: 1 },
        },
      },
      components: {
        type: "array",
        minItems: 1,
        items: { enum: ["xx", "yy", "zz", "xy", "xz", "yz", "delta", "beta"] },
      },
      frame: { enum: ["lab", "molecular", "principal"] },
      units: { type: "string" },
      dtype: { type: "string" },
      shape: {
        type: "array",
        minItems: 1,
        maxItems: 6,
        items: { type: "integer", minimum: 1 },
      },
    },
  },
  OpticalModelSummary: {
    type: "object",
    required: [
      "tag",
      "title",
      "ownerOrcid",
      "visibility",
      "latestVersion",
      "reviewState",
      "isDefault",
      "forkedFrom",
    ],
    properties: {
      tag: { type: "string" },
      title: { type: "string" },
      ownerOrcid: { type: "string" },
      visibility: { enum: ["private", "shared", "public"] },
      latestVersion: { type: ["integer", "null"] },
      reviewState: { enum: ["unreviewed", "approved", "rejected", null] },
      isDefault: { type: "boolean" },
      forkedFrom: {
        type: ["object", "null"],
        required: ["tag", "versionNumber"],
        properties: {
          tag: { type: "string" },
          versionNumber: { type: "integer" },
        },
      },
    },
  },
  OpticalModelPage: {
    type: "object",
    required: ["items", "nextCursor"],
    properties: {
      items: {
        type: "array",
        items: { $ref: "#/components/schemas/OpticalModelSummary" },
      },
      nextCursor: { type: ["string", "null"] },
    },
  },
  OpticalModelVersion: {
    type: "object",
    required: [
      "versionNumber",
      "status",
      "normalization",
      "peaks",
      "datasets",
      "tensor",
      "authors",
      "checksum",
      "publishedAt",
    ],
    properties: {
      versionNumber: { type: ["integer", "null"] },
      status: { enum: ["draft", "published"] },
      normalization: {
        oneOf: [
          { $ref: "#/components/schemas/OpticalModelNormalization" },
          { type: "null" },
        ],
      },
      peaks: {
        type: "array",
        items: { $ref: "#/components/schemas/OpticalModelPeak" },
      },
      datasets: {
        type: "array",
        items: {
          type: "object",
          required: ["experimentId", "atlasDatasetId", "pinned", "role"],
          properties: {
            experimentId: { type: "string", format: "uuid" },
            atlasDatasetId: nullableString,
            pinned: {
              type: "string",
              description: "Dataset version the link pins, for example 1.0.2.",
            },
            role: { type: "string" },
          },
        },
      },
      tensor: {
        type: ["object", "null"],
        required: ["sha256", "byteSize", "manifest"],
        properties: {
          sha256: { type: "string" },
          byteSize: { type: "integer" },
          manifest: {
            oneOf: [
              { $ref: "#/components/schemas/OpticalModelTensorManifest" },
              { type: "null" },
            ],
          },
        },
      },
      authors: {
        type: "array",
        items: {
          type: "object",
          required: ["orcid", "name", "role", "signed"],
          properties: {
            orcid: { type: "string" },
            name: nullableString,
            role: { enum: ["owner", "coauthor"] },
            signed: { type: "boolean" },
          },
        },
      },
      checksum: nullableString,
      publishedAt: nullableString,
    },
  },
  OpticalModelDetail: {
    allOf: [
      { $ref: "#/components/schemas/OpticalModelSummary" },
      {
        type: "object",
        required: ["description", "version", "versions", "hasDraft"],
        properties: {
          description: nullableString,
          version: { $ref: "#/components/schemas/OpticalModelVersion" },
          versions: { type: "array", items: { type: "integer" } },
          hasDraft: { type: "boolean" },
        },
      },
    ],
  },
  OpticalModelLineage: {
    type: "object",
    required: ["ancestors", "hiddenAncestors"],
    properties: {
      ancestors: {
        type: "array",
        items: {
          type: "object",
          required: ["tag", "versionNumber", "ownerOrcid", "title", "kind"],
          properties: {
            tag: { type: "string" },
            versionNumber: { type: "integer" },
            ownerOrcid: { type: "string" },
            title: { type: "string" },
            kind: { enum: ["fork", "merge"] },
          },
        },
      },
      hiddenAncestors: { type: "integer" },
    },
  },
  OpticalModelNormalizedChannels: {
    type: "object",
    required: ["experimentId", "pinned", "channels"],
    properties: {
      experimentId: { type: "string", format: "uuid" },
      pinned: {
        type: "string",
        description: "Informational: the dataset version the model linked.",
      },
      channels: {
        type: "object",
        required: [
          "energyEv",
          "od",
          "massAbsorption",
          "beta",
          "polarizationId",
          "thetaDeg",
          "phiDeg",
        ],
        properties: {
          energyEv: { type: "array", items: { type: "number" } },
          od: { type: "array", items: nullableNumber },
          massAbsorption: { type: "array", items: nullableNumber },
          beta: { type: "array", items: nullableNumber },
          polarizationId: { type: "array", items: nullableString },
          thetaDeg: { type: "array", items: nullableNumber },
          phiDeg: { type: "array", items: nullableNumber },
        },
      },
    },
  },
  OpticalModelDraftContent: {
    type: "object",
    additionalProperties: false,
    description:
      "Fields present replace the draft's value; normalization null clears it.",
    properties: {
      title: { type: "string", minLength: 1, maxLength: 200 },
      description: { type: ["string", "null"], maxLength: 5000 },
      normalization: {
        oneOf: [
          { $ref: "#/components/schemas/OpticalModelNormalization" },
          { type: "null" },
        ],
      },
      peaks: {
        type: "array",
        maxItems: 2000,
        items: { $ref: "#/components/schemas/OpticalModelPeak" },
      },
      datasets: {
        type: "array",
        minItems: 1,
        maxItems: 50,
        items: {
          type: "object",
          required: ["experimentId"],
          properties: {
            experimentId: { type: "string", format: "uuid" },
            role: { type: "string", default: "primary" },
          },
        },
      },
    },
  },
  OpticalModelForkRequest: {
    type: "object",
    properties: {
      fromVersion: { type: "integer", minimum: 1 },
      title: { type: "string", minLength: 1, maxLength: 200 },
    },
  },
  OpticalModelTagResponse: {
    type: "object",
    required: ["tag"],
    properties: { tag: { type: "string" } },
  },
  OpticalModelDeleted: {
    type: "object",
    required: ["deleted"],
    properties: { deleted: { const: true } },
  },
  OpticalModelPublishResponse: {
    type: "object",
    required: ["versionNumber", "checksum"],
    properties: {
      versionNumber: { type: "integer" },
      checksum: { type: "string" },
    },
  },
  OpticalModelVisibilityRequest: {
    type: "object",
    required: ["visibility"],
    properties: { visibility: { enum: ["private", "shared", "public"] } },
  },
  OpticalModelVisibilityResponse: {
    type: "object",
    required: ["tag", "visibility"],
    properties: {
      tag: { type: "string" },
      visibility: { enum: ["private", "shared", "public"] },
    },
  },
  OpticalModelShareRequest: {
    type: "object",
    required: ["orcid"],
    properties: {
      orcid: {
        type: "string",
        description: "ORCID iD, for example 0000-0002-1825-0097.",
      },
    },
  },
  OpticalModelShareResponse: {
    type: "object",
    required: ["tag", "orcid"],
    properties: { tag: { type: "string" }, orcid: { type: "string" } },
  },
  OpticalModelReviewRequest: {
    type: "object",
    required: ["experimentId", "state"],
    properties: {
      experimentId: { type: "string", format: "uuid" },
      state: { enum: ["approved", "rejected"] },
      note: { type: "string", minLength: 1, maxLength: 1000 },
    },
  },
  OpticalModelReviewResponse: {
    type: "object",
    required: ["tag", "experimentId", "state"],
    properties: {
      tag: { type: "string" },
      experimentId: { type: "string", format: "uuid" },
      state: { enum: ["approved", "rejected"] },
    },
  },
  OpticalModelTensorUploadRequest: {
    type: "object",
    required: ["sizeBytes", "sha256"],
    properties: {
      sizeBytes: { type: "integer", minimum: 1, maximum: 134217728 },
      sha256: { type: "string", pattern: "^[0-9a-f]{64}$" },
    },
  },
  OpticalModelTensorUploadResponse: {
    type: "object",
    required: ["uploadUrl", "storagePath"],
    properties: {
      uploadUrl: { type: "string" },
      storagePath: { type: "string" },
    },
  },
  OpticalModelTensorCommitRequest: {
    type: "object",
    required: ["storagePath", "sizeBytes", "sha256", "manifest"],
    properties: {
      storagePath: { type: "string" },
      sizeBytes: { type: "integer", minimum: 1 },
      sha256: { type: "string", pattern: "^[0-9a-f]{64}$" },
      manifest: { $ref: "#/components/schemas/OpticalModelTensorManifest" },
    },
  },
  OpticalModelTensorCommitResponse: {
    type: "object",
    required: ["tag", "storagePath"],
    properties: { tag: { type: "string" }, storagePath: { type: "string" } },
  },
  OpticalModelTensorDownload: {
    type: "object",
    required: ["url", "sha256", "byteSize", "manifest"],
    properties: {
      url: {
        type: "string",
        description:
          "Short-lived signed read URL; do not send the bearer token to it.",
      },
      sha256: { type: "string" },
      byteSize: { type: "integer" },
      manifest: {
        oneOf: [
          { $ref: "#/components/schemas/OpticalModelTensorManifest" },
          { type: "null" },
        ],
      },
    },
  },
} as const;

const tags = [modelsTag.name];

export const modelsPaths = {
  "/models": {
    get: {
      tags,
      operationId: "listOpticalModels",
      summary: "List optical models",
      description:
        "dataset (Atlas dataset id or experiment UUID) lists the models visible to the caller that link that dataset, filtered by scope (public, mine, shared, all). Without dataset, scope=mine pages the caller's own models and scope=shared pages models shared with the caller (both need a token).",
      security: optionalBearer,
      parameters: [
        {
          name: "dataset",
          in: "query",
          required: false,
          schema: { type: "string" },
        },
        {
          name: "scope",
          in: "query",
          required: false,
          schema: { enum: ["public", "mine", "shared", "all"], default: "all" },
        },
        {
          name: "cursor",
          in: "query",
          required: false,
          schema: { type: "string", format: "uuid" },
        },
        {
          name: "limit",
          in: "query",
          required: false,
          schema: { type: "integer", minimum: 1, maximum: 100, default: 50 },
        },
      ],
      responses: {
        "200": jsonOk("OpticalModelPage", "Models and the next cursor."),
        "401": readErrors["401"],
        "422": readErrors["422"],
      },
    },
  },
  "/models/{tag}": {
    get: {
      tags,
      operationId: "getOpticalModel",
      summary: "Get a model with one version",
      description:
        "Invisible models answer 404, indistinguishable from unknown tags.",
      security: optionalBearer,
      parameters: [tagParam, versionParam],
      responses: {
        "200": jsonOk(
          "OpticalModelDetail",
          "The model and the selected version.",
        ),
        "401": readErrors["401"],
        "404": readErrors["404"],
        "422": readErrors["422"],
      },
    },
    delete: {
      tags,
      operationId: "deleteOpticalModel",
      summary: "Delete a model that was never published",
      security: requiredBearer,
      parameters: [tagParam],
      responses: {
        "200": jsonOk("OpticalModelDeleted", "Deleted."),
        ...writeErrors,
      },
    },
  },
  "/models/{tag}/fork": {
    post: {
      tags,
      operationId: "forkOpticalModel",
      summary: "Fork a model",
      description:
        "Creates a private model owned by the caller from a visible published version.",
      security: requiredBearer,
      parameters: [tagParam],
      requestBody: {
        required: false,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/OpticalModelForkRequest" },
          },
        },
      },
      responses: {
        "201": jsonOk("OpticalModelTagResponse", "The new model's tag."),
        ...writeErrors,
      },
    },
  },
  "/models/{tag}/draft": {
    put: {
      tags,
      operationId: "saveOpticalModelDraft",
      summary: "Replace fields of the draft",
      description:
        "Owner only. Creates the draft from the latest published version when none exists.",
      security: requiredBearer,
      parameters: [tagParam],
      requestBody: jsonBody("OpticalModelDraftContent"),
      responses: {
        "200": jsonOk("OpticalModelTagResponse", "Saved."),
        ...writeErrors,
      },
    },
  },
  "/models/{tag}/publish": {
    post: {
      tags,
      operationId: "publishOpticalModel",
      summary: "Publish the draft as the next immutable version",
      security: requiredBearer,
      parameters: [tagParam],
      responses: {
        "200": jsonOk(
          "OpticalModelPublishResponse",
          "The new version number and checksum.",
        ),
        ...writeErrors,
      },
    },
  },
  "/models/{tag}/visibility": {
    put: {
      tags,
      operationId: "setOpticalModelVisibility",
      summary: "Set private, shared, or public",
      description:
        "public requires every ancestor model to be public (422 ANCESTOR_NOT_PUBLIC).",
      security: requiredBearer,
      parameters: [tagParam],
      requestBody: jsonBody("OpticalModelVisibilityRequest"),
      responses: {
        "200": jsonOk("OpticalModelVisibilityResponse", "Updated."),
        ...writeErrors,
      },
    },
  },
  "/models/{tag}/shares": {
    put: {
      tags,
      operationId: "shareOpticalModel",
      summary: "Share with an ORCID iD",
      description: "A private model becomes shared.",
      security: requiredBearer,
      parameters: [tagParam],
      requestBody: jsonBody("OpticalModelShareRequest"),
      responses: {
        "200": jsonOk("OpticalModelShareResponse", "Shared."),
        ...writeErrors,
      },
    },
    delete: {
      tags,
      operationId: "unshareOpticalModel",
      summary: "Remove a share",
      description: "Idempotent. The ORCID iD is sent in the JSON body.",
      security: requiredBearer,
      parameters: [tagParam],
      requestBody: jsonBody("OpticalModelShareRequest"),
      responses: {
        "200": jsonOk("OpticalModelShareResponse", "Unshared."),
        ...writeErrors,
      },
    },
  },
  "/models/{tag}/review": {
    post: {
      tags,
      operationId: "reviewOpticalModel",
      summary: "Approve or reject a model on a dataset",
      description:
        "Requires the right to edit the dataset. A rejection never changes visibility or deletes the model.",
      security: requiredBearer,
      parameters: [tagParam],
      requestBody: jsonBody("OpticalModelReviewRequest"),
      responses: {
        "200": jsonOk("OpticalModelReviewResponse", "Recorded."),
        ...writeErrors,
      },
    },
  },
  "/models/{tag}/normalized": {
    get: {
      tags,
      operationId: "getOpticalModelNormalizedChannels",
      summary: "Dataset channels under the model's normalization",
      description:
        "A version without a normalization answers 422 NORMALIZATION_UNDEFINED. dataset is required when the version links several datasets.",
      security: optionalBearer,
      parameters: [
        tagParam,
        versionParam,
        {
          name: "dataset",
          in: "query",
          required: false,
          schema: { type: "string" },
        },
      ],
      responses: {
        "200": jsonOk(
          "OpticalModelNormalizedChannels",
          "Channels aligned by index.",
        ),
        "401": readErrors["401"],
        "404": readErrors["404"],
        "422": readErrors["422"],
      },
    },
  },
  "/models/{tag}/lineage": {
    get: {
      tags,
      operationId: "getOpticalModelLineage",
      summary: "Visible ancestors of a version",
      security: optionalBearer,
      parameters: [tagParam, versionParam],
      responses: {
        "200": jsonOk(
          "OpticalModelLineage",
          "Visible ancestors and the hidden count.",
        ),
        "401": readErrors["401"],
        "404": readErrors["404"],
        "422": readErrors["422"],
      },
    },
  },
  "/models/{tag}/bibtex": {
    get: {
      tags,
      operationId: "getOpticalModelBibtex",
      summary: "BibTeX of a published version",
      security: optionalBearer,
      parameters: [
        tagParam,
        {
          ...versionParam,
          schema: { type: "string", pattern: "^(latest|[1-9][0-9]*)$" },
        },
      ],
      responses: {
        "200": {
          description: "A BibTeX @misc record.",
          content: { "application/x-bibtex": { schema: { type: "string" } } },
        },
        "401": readErrors["401"],
        "404": readErrors["404"],
        "422": readErrors["422"],
      },
    },
  },
  "/models/{tag}/tensor": {
    get: {
      tags,
      operationId: "getOpticalModelTensorUrl",
      summary: "Signed read URL of a version's tensor",
      security: optionalBearer,
      parameters: [tagParam, versionParam],
      responses: {
        "200": jsonOk(
          "OpticalModelTensorDownload",
          "Signed URL, digest, size, and manifest.",
        ),
        "401": readErrors["401"],
        "404": readErrors["404"],
        "422": readErrors["422"],
      },
    },
  },
  "/models/{tag}/tensor/upload-url": {
    post: {
      tags,
      operationId: "createOpticalModelTensorUploadUrl",
      summary: "Signed URL for uploading a tensor blob",
      description:
        "At most 128 MiB. PUT the bytes to uploadUrl without the bearer token, then commit.",
      security: requiredBearer,
      parameters: [tagParam],
      requestBody: jsonBody("OpticalModelTensorUploadRequest"),
      responses: {
        "200": jsonOk(
          "OpticalModelTensorUploadResponse",
          "Upload URL and storage path.",
        ),
        ...writeErrors,
      },
    },
  },
  "/models/{tag}/tensor/commit": {
    post: {
      tags,
      operationId: "commitOpticalModelTensor",
      summary: "Attach an uploaded tensor blob to the draft",
      description:
        "The server verifies the stored size and SHA-256; a mismatch is 422.",
      security: requiredBearer,
      parameters: [tagParam],
      requestBody: jsonBody("OpticalModelTensorCommitRequest"),
      responses: {
        "200": jsonOk("OpticalModelTensorCommitResponse", "Committed."),
        ...writeErrors,
      },
    },
  },
} as const;
