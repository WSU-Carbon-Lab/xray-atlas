/**
 * Curated roadmap timeline for `/about/roadmap`: publication phases, horizon marker,
 * and staged platform milestones. Prose lives here so the route stays presentational.
 */

export type RoadmapStatus =
  | "shipped"
  | "in-progress"
  | "planned"
  | "exploring"
  | "open-question";

export type RoadmapPhase =
  | "pre-publication"
  | "post-publication"
  | "institutional";

export type RoadmapStageVariant = "default" | "fork";

export interface RoadmapRelatedLink {
  href: string;
  label: string;
}

export interface RoadmapStage {
  id: string;
  title: string;
  phase: RoadmapPhase;
  status: RoadmapStatus;
  statusLabel: string;
  summary: string;
  detail: string;
  variant?: RoadmapStageVariant;
  githubLabels?: string[];
  relatedLinks?: RoadmapRelatedLink[];
}

export interface RoadmapHorizon {
  id: string;
  monthLabel: string;
  title: string;
  preCaption: string;
  postCaption: string;
}

export const roadmapHorizon: RoadmapHorizon = {
  id: "publication-horizon",
  monthLabel: "December 2026",
  title: "Manuscript to reviewers",
  preCaption:
    "Prove the catalog through Python/API access, QANT-style data processing, peer-database interop, Claude-assisted spectroscopy plugins, and per-dataset DOI minting before the manuscript goes to reviewers.",
  postCaption:
    "Deepen the science model with materials coverage, structure-aware search, peak/DFT assignments, and beamline integration.",
};

export const prePublicationStages: RoadmapStage[] = [
  {
    id: "upload",
    title: "Data upload",
    phase: "pre-publication",
    status: "shipped",
    statusLabel: "Shipped",
    summary:
      "Guided CSV upload through normalization and submission is live in production beta.",
    detail:
      "The validated upload flow takes a raw CSV through normalization, sample metadata, and submission. Remaining work is incremental: broader instrument-format support, batch submission for beamline scientists processing many scans at once, and richer provenance metadata for calibration standards and normalization procedure.",
    relatedLinks: [
      {
        href: "/wiki/atlas/uploading-data",
        label: "Uploading NEXAFS data",
      },
      { href: "/contribute/nexafs", label: "Contribute a dataset" },
    ],
  },
  {
    id: "attribution",
    title: "User attribution",
    phase: "pre-publication",
    status: "shipped",
    statusLabel: "Shipped",
    summary:
      "ORCID-backed contributor records, dataset claiming, and saved attribution teams are live in the contribute workflow.",
    detail:
      "Contributors assign owner and collector roles with DataCite-aligned contributor types, claim pending attributions on their profile, and reuse saved attribution teams for beamtime rosters. Browse and dataset cards surface attribution status so catalog credit stays tied to the people who collected and curated each spectrum.",
    relatedLinks: [
      { href: "/contribute/nexafs", label: "Contribute a dataset" },
      { href: "/account/teams", label: "Attribution teams" },
      {
        href: "/wiki/atlas/contributing",
        label: "Contributing to Atlas",
      },
    ],
  },
  {
    id: "publication-linking",
    title: "Dataset-publication linking",
    phase: "pre-publication",
    status: "shipped",
    statusLabel: "Shipped",
    summary:
      "Contributors can link source publication DOIs to datasets at upload and after submission.",
    detail:
      "Each experiment can carry one or more linked source publications so browse cards and verification controls show when a dataset traces back to a peer-reviewed paper or preprint. Atlas team verification remains separate from source-publication links. This is distinct from minting a DOI for the dataset itself—that registrar work is tracked under governance.",
    relatedLinks: [
      { href: "/browse/nexafs", label: "Browse NEXAFS datasets" },
      { href: "/wiki/atlas/contributing", label: "Contributing to Atlas" },
    ],
  },
  {
    id: "adoption",
    title: "Growing adoption",
    phase: "pre-publication",
    status: "in-progress",
    statusLabel: "In progress",
    summary:
      "Seeding legacy datasets, engaging beamline scientists directly, and exploring hooks into analysis stacks researchers already use.",
    detail:
      "The goal is moving X-ray Atlas from a submission target to a default reference for NEXAFS data within the ALS user community. That requires direct outreach to beamline scientists, backfilling legacy datasets rather than relying on organic contribution, and establishing what counts as sufficient coverage within a given chemical or materials domain for search to be genuinely useful rather than sparse. During this phase we will explore integration with pre-existing analysis workflows, including QANT (Quick As NEXAFS Tool), so Atlas data and metadata can meet spectroscopists where they already work rather than only through the web UI.",
    relatedLinks: [{ href: "/browse/nexafs", label: "Browse NEXAFS datasets" }],
  },
  {
    id: "python-client",
    title: "Python client",
    phase: "pre-publication",
    status: "in-progress",
    statusLabel: "In progress",
    summary:
      "Pull spectra and metadata straight into pandas or xarray before publication, without a browser download step first.",
    detail:
      "A native Python client wrapping the existing v1 REST API would let researchers query and pull datasets directly into analysis code. Shipping this before the manuscript goes to reviewers makes the catalog testable inside notebooks and beamline pipelines, and pairs naturally with adoption work and QANT-oriented integration experiments.",
    relatedLinks: [
      { href: "/wiki/api/v1", label: "API v1 reference" },
      { href: "/api/v1/openapi", label: "OpenAPI contract" },
    ],
  },
  {
    id: "database-interop",
    title: "Peer database interoperability",
    phase: "pre-publication",
    status: "planned",
    statusLabel: "Planned",
    summary:
      "Integrate with other X-ray spectroscopy databases and align on the common exchange formats those catalogs already use.",
    detail:
      "Before publication we want Atlas records to interoperate with complementary spectroscopy repositories rather than stand alone. That means mapping molecule, sample, spectrum, and provenance fields onto shared community formats, enabling import/export paths where practical, and documenting which identifiers and file layouts transfer cleanly between systems. The aim is reuse across databases, not duplicate curation in incompatible shapes.",
    relatedLinks: [
      { href: "/wiki/atlas/data-model", label: "Atlas data model" },
      { href: "/wiki/api/v1", label: "API v1 reference" },
    ],
  },
  {
    id: "claude-plugins",
    title: "Claude plugins for spectroscopy workflows",
    phase: "pre-publication",
    status: "planned",
    statusLabel: "Planned",
    summary:
      "Publish Claude Code plugins that teach assistants how to discover NEXAFS datasets in Atlas, compare them with local spectra, and guide processing plus upload through the contribute workflow, with Claude attribution whenever AI assists catalog discovery or contribution.",
    detail:
      "Skills would ground on the public v1 API (/api/v1/datasets, export, OpenAPI) and wiki upload and normalization guidance. Uploads remain auth-gated (ORCID sign-in, contribution agreement, passkey enrollment). Whenever an assistant discovers, compares, processes, or uploads via these plugins, the workflow must surface appropriate Claude credit and disclosure so catalog entries reflect AI-assisted analysis and submission. This milestone can ship before publication alongside API maturity rather than waiting for post-manuscript features.",
    relatedLinks: [
      { href: "/wiki/atlas/uploading-data", label: "Upload workflow" },
      { href: "/wiki/nexafs/normalization", label: "Normalization" },
    ],
  },
  {
    id: "governance",
    title: "Governance, persistence, and DOI minting",
    phase: "institutional",
    status: "in-progress",
    statusLabel: "Zenodo path in progress",
    variant: "fork",
    summary:
      "Per-dataset DOI minting is being implemented via Zenodo as an interim registrar; direct DataCite membership remains the longer-term option after non-profit incorporation.",
    detail:
      "Upload, contributor attribution, and source-publication linking are live. Atlas now deposits each NEXAFS dataset to the X-ray Atlas Zenodo Community (https://zenodo.org/communities/xrayatlas) through a repository depositor personal access token, with researcher credit in Zenodo creators metadata. Minting is automatic after contribute aux uploads, non-blocking on Zenodo failure, and tracked in experiment_zenodo_deposits plus experiment_metrics.dataset_doi. Remaining ops: production depositor PAT on Vercel, sandbox community+token for Preview, and community submission policy (open/auto-accept recommended for v1). Longer term, direct DataCite membership for X-ray Atlas still requires non-profit incorporation (Consortium/Direct membership expect participating organizations to be non-profit), with annual base fees and volume-scaled DOI fees; Zenodo remains the lower-friction interim registrar until that path is funded.",
    relatedLinks: [
      { href: "https://zenodo.org/communities/xrayatlas", label: "X-ray Atlas Zenodo Community" },
      { href: "https://zenodo.org/", label: "Zenodo" },
      {
        href: "https://datacite.org/become-a-member/",
        label: "DataCite membership",
      },
    ],
    githubLabels: ["governance", "datacite", "zenodo"],
  },
];

export const postPublicationStages: RoadmapStage[] = [
  {
    id: "materials-coverage",
    title: "Non-molecular and extended materials descriptions",
    phase: "post-publication",
    status: "planned",
    statusLabel: "Planned",
    summary:
      "Deepen how samples are described so the catalog covers polymers, surfaces, and other non-small-molecule materials—not only discrete molecular records.",
    detail:
      "Post-publication work will extend molecule and sample metadata beyond traditional small-molecule identity cards. That includes richer handling of macromolecules, heterogeneous materials, and preparation context so browse and search remain meaningful when the sample is not a single well-defined molecular graph. This builds on existing polymer and registry flows but pushes coverage toward the broader materials science use cases NEXAFS serves in practice.",
    relatedLinks: [
      { href: "/contribute/molecule", label: "Contribute a molecule" },
      { href: "/wiki/atlas/data-model", label: "Data model" },
    ],
  },
  {
    id: "structure-aware-search",
    title: "Conformers and SMILES-aware query language",
    phase: "post-publication",
    status: "exploring",
    statusLabel: "Exploring",
    summary:
      "Find NEXAFS datasets by shared substructures and functional groups, with SMILES and conformer-aware queries—not only molecule names or stored identifiers.",
    detail:
      "After publication we will explore structure-aware discovery so users can locate NEXAFS datasets whose molecules share common substructures and functional groups, improving catalog search, filtering, and categorization beyond name or synonym lookup. SMILES would enter the query surface directly alongside conformer context, so programmatic and UI search can express connectivity, stereochemistry, and three-dimensional structural hypotheses. This ties structure lookup, depiction, and NEXAFS browse into one coherent path for comparing spectra across related chemistries.",
    relatedLinks: [
      { href: "/browse/molecules", label: "Browse molecules" },
      { href: "/wiki/atlas/data-model", label: "Data model" },
    ],
  },
  {
    id: "peak-and-dft-assignments",
    title: "Peak specifications and DFT-backed assignments",
    phase: "post-publication",
    status: "planned",
    statusLabel: "Planned",
    summary:
      "Richer peak metadata in the catalog, with room for DFT calculations to support more defensible electronic-state assignments.",
    detail:
      "Manual pi-star and sigma-star labels remain useful, but post-publication we want peak records to carry more specification: energy, width, assignment rationale, linked transitions, and provenance for who assigned what. We will explore incorporating DFT (and related electronic-structure) outputs so contributors and reviewers can compare experimental features to calculated transition envelopes when interpreting near-edge structure. The goal is better assignment hygiene in the database, not replacing expert judgment.",
    relatedLinks: [
      { href: "/wiki/nexafs/terminology", label: "NEXAFS terminology" },
      { href: "/contribute/nexafs", label: "Contribute datasets" },
    ],
  },
  {
    id: "beamline",
    title: "Beamline integration",
    phase: "post-publication",
    status: "exploring",
    statusLabel: "Exploring",
    summary:
      "Moving data from endstation acquisition into Atlas directly; authentication model for automated submissions is unresolved.",
    detail:
      "Facility and Experiment models already exist in the schema. The open engineering question is whether data can move from beamline endstations into Atlas at acquisition time, rather than through manual post hoc upload, and how automated submissions are authenticated and attributed to the correct researcher and facility. No implementation has started.",
    relatedLinks: [{ href: "/dashboard", label: "Instrument connectors" }],
  },
];

export const allRoadmapStages: RoadmapStage[] = [
  ...prePublicationStages,
  ...postPublicationStages,
];
