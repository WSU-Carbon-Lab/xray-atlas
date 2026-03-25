import path from "node:path";
import type { PrismaClient, ExperimentType, ProcessMethod } from "@prisma/client";
import {
  backlogPreparationCanonicalString,
  backlogPreparationSlugFromCanonical,
  formatBacklogSampleIdentifier,
} from "~/features/process-nexafs/utils/backlogSampleGrouping";
import {
  normalizeEdge,
  normalizeExperimentMode,
  normalizeFacilityToken,
  normalizeInstrumentName,
} from "~/features/process-nexafs/utils/filenameParser";
import {
  buildPolarizationGroupsWithIndices,
  parseNexafsDatasetToSpectrumPoints,
  type NexafsJsonDatasetItem,
} from "~/server/nexafs/nexafsJsonDatasetPoints";

function determineProcessMethod(prepMethod: string | null | undefined): ProcessMethod {
  const raw = (prepMethod ?? "").toLowerCase();
  if (!raw) return "SOLVENT";
  if (raw.includes("dry")) return "DRY";
  return "SOLVENT";
}

export type NexafsJsonInstrumentBlock = {
  facility: string;
  instrument: string;
  edge: string;
  technique: string;
};

export type NexafsJsonSampleBlock = {
  vendor: string;
  preparation_method?: { method?: string | null; details?: string | null };
};

export type NexafsJsonDocument = {
  user?: unknown;
  instrument: NexafsJsonInstrumentBlock;
  sample: NexafsJsonSampleBlock;
  dataset: NexafsJsonDatasetItem[];
};

function parseEdgeTargetAndCore(edge: string) {
  const normalized = normalizeEdge(edge) ?? edge;
  const re = /^(.+?)\((.+?)\)$/;
  const m = re.exec(normalized.trim());
  if (!m) {
    throw new Error(`Unrecognized edge format: ${edge}`);
  }
  return { targetatom: m[1]!.trim(), corestate: m[2]!.trim() };
}

function roundPolarKey(n: number) {
  return Number.parseFloat(n.toFixed(6));
}

export function experimentSourceMatchKey(args: {
  moleculeId: string;
  vendorId: string;
  edgeId: string;
  instrumentId: string;
  experimentType: ExperimentType;
  theta: number;
  phi: number;
}) {
  return [
    args.moleculeId,
    args.vendorId,
    args.edgeId,
    args.instrumentId,
    args.experimentType,
    String(roundPolarKey(args.theta)),
    String(roundPolarKey(args.phi)),
  ].join("|");
}

export async function resolveNexafsJsonDocumentToSourceRows(
  prisma: PrismaClient,
  json: NexafsJsonDocument,
  moleculeFormula: string,
): Promise<
  Array<{
    matchKey: string;
    moleculeId: string;
    vendorId: string;
    edgeId: string;
    instrumentId: string;
    experimentType: ExperimentType;
    theta: number;
    phi: number;
  }>
> {
  const techniqueToken = json.instrument.technique;
  const experimentType = normalizeExperimentMode(techniqueToken) as ExperimentType | undefined;
  if (!experimentType) {
    throw new Error(`Unknown technique token: ${techniqueToken}`);
  }

  const facilityName = normalizeFacilityToken(json.instrument.facility);
  if (!facilityName) {
    throw new Error(`Unknown facility token: ${json.instrument.facility}`);
  }

  const facility = await prisma.facilities.findUnique({
    where: { name: facilityName },
    select: { id: true, name: true },
  });
  if (!facility) {
    throw new Error(`Facility not found in DB: ${facilityName}`);
  }

  const instrumentName =
    normalizeInstrumentName(facilityName, json.instrument.instrument) ??
    json.instrument.instrument.trim();
  const instrument = await prisma.instruments.findFirst({
    where: { name: instrumentName, facilityid: facility.id },
    select: { id: true, name: true },
  });
  if (!instrument) {
    throw new Error(`Instrument not found in DB: ${instrumentName} @ ${facilityName}`);
  }

  const edgeInfo = parseEdgeTargetAndCore(json.instrument.edge);
  const edge = await prisma.edges.findUnique({
    where: { targetatom_corestate: edgeInfo },
    select: { id: true, targetatom: true, corestate: true },
  });
  if (!edge) {
    throw new Error(`Edge not found in DB: ${json.instrument.edge}`);
  }

  const vendorName = json.sample.vendor.trim();
  const vendor = await prisma.vendors.findUnique({
    where: { name: vendorName },
    select: { id: true, name: true },
  });
  if (!vendor) {
    throw new Error(`Vendor not found in DB: ${vendorName}`);
  }

  const molecule = await prisma.molecules.findFirst({
    where: { chemicalformula: moleculeFormula },
    select: { id: true, chemicalformula: true },
  });
  if (!molecule) {
    throw new Error(`Molecule not found in DB for chemicalformula: ${moleculeFormula}`);
  }

  const processMethod = determineProcessMethod(json.sample.preparation_method?.method);
  const substrate =
    experimentType === "TOTAL_ELECTRON_YIELD" || experimentType === "FLUORESCENT_YIELD"
      ? "Si"
      : null;
  const preparationCanonical = backlogPreparationCanonicalString({
    vendorName,
    preparationMethodLabel: json.sample.preparation_method?.method,
    preparationDetails: json.sample.preparation_method?.details,
    processMethod,
    substrate,
  });
  const preparationSlug = backlogPreparationSlugFromCanonical(preparationCanonical);
  const identifier = formatBacklogSampleIdentifier(molecule.id, preparationSlug);
  const sampleRow = await prisma.samples.findUnique({
    where: { identifier },
    select: { id: true, vendorid: true },
  });
  const vendorIdForKey = sampleRow?.vendorid ?? vendor.id;

  const points = parseNexafsDatasetToSpectrumPoints(json.dataset);
  if (points.length === 0) {
    return [];
  }

  const groupList = buildPolarizationGroupsWithIndices(points);
  const rows: Array<{
    matchKey: string;
    moleculeId: string;
    vendorId: string;
    edgeId: string;
    instrumentId: string;
    experimentType: ExperimentType;
    theta: number;
    phi: number;
  }> = [];

  for (const g of groupList) {
    const bases = {
      moleculeId: molecule.id,
      edgeId: edge.id,
      instrumentId: instrument.id,
      experimentType,
      theta: g.theta,
      phi: g.phi,
    };
    rows.push({
      matchKey: experimentSourceMatchKey({ ...bases, vendorId: vendorIdForKey }),
      moleculeId: molecule.id,
      vendorId: vendorIdForKey,
      edgeId: edge.id,
      instrumentId: instrument.id,
      experimentType,
      theta: g.theta,
      phi: g.phi,
    });
    if (sampleRow?.vendorid == null) {
      rows.push({
        matchKey: experimentSourceMatchKey({ ...bases, vendorId: "" }),
        moleculeId: molecule.id,
        vendorId: "",
        edgeId: edge.id,
        instrumentId: instrument.id,
        experimentType,
        theta: g.theta,
        phi: g.phi,
      });
    }
  }

  return rows;
}

export function posixRelativePath(cwd: string, absPath: string) {
  return path.relative(cwd, absPath).split(path.sep).join("/");
}
