import type { ExperimentType, ProcessMethod } from "~/prisma/browser";
import {
  canonicalizeNexafsVendorName,
  findMatchingVendorId,
  formatNexafsVendorLabel,
} from "~/lib/nexafsVendorLabel";
import {
  collectorOrcidsForResearchGroupToken,
  mergeUniqueCollectorOrcids,
} from "~/lib/nexafsResearchGroupCollectors";
import { resolveNexafsDefaultSubstrate } from "~/lib/resolveNexafsDefaultSubstrate";
import {
  dedupeDatasetAttributions,
  type DatasetAttributionEntry,
} from "~/lib/nexafs-attribution";
import type { DatasetState, ExperimentTypeOption } from "../types";
import type { ParsedFilename, InstrumentMatchOption } from "./filenameParser";
import type { NexafsJsonDocumentMetadata } from "./jsonParser";

function processMethodFromPreparationLabel(
  method?: string | null,
): ProcessMethod | null {
  if (!method?.trim()) return null;
  const m = method.trim().toLowerCase();
  if (m.includes("dry")) return "DRY";
  return "SOLVENT";
}

export function buildNexafsUploadAutofill(params: {
  parsedFilename: ParsedFilename;
  documentMetadata: NexafsJsonDocumentMetadata | null | undefined;
  instrumentOptions: InstrumentMatchOption[];
  vendors: ReadonlyArray<{ id: string; name: string | null | undefined }>;
  experimentType: ExperimentTypeOption | undefined;
  instrumentId: string | undefined;
  baseSampleInfo: DatasetState["sampleInfo"];
}): Pick<DatasetState, "sampleInfo" | "collectedByUserIds" | "attributions"> {
  const {
    parsedFilename,
    documentMetadata,
    instrumentOptions,
    vendors,
    experimentType,
    instrumentId,
    baseSampleInfo,
  } = params;

  const inst = instrumentOptions.find((i) => i.id === instrumentId);
  const instrumentName =
    inst?.name ??
    documentMetadata?.instrument?.instrument?.trim() ??
    parsedFilename.beamline ??
    "";

  let substrate = baseSampleInfo.substrate;
  if (experimentType) {
    const resolved = resolveNexafsDefaultSubstrate(
      experimentType as ExperimentType,
      instrumentName,
    );
    substrate = resolved ?? "";
  }

  const filenameVendor = parsedFilename.vendorSlug
    ? formatNexafsVendorLabel(parsedFilename.vendorSlug)
    : "";
  const jsonVendor = documentMetadata?.sample?.vendor
    ? formatNexafsVendorLabel(documentMetadata.sample.vendor)
    : "";
  const mergedVendor = jsonVendor || filenameVendor;
  const vendorLabel = mergedVendor
    ? canonicalizeNexafsVendorName(mergedVendor)
    : "";

  const pmFromJson = processMethodFromPreparationLabel(
    documentMetadata?.sample?.preparation_method?.method,
  );

  const collectors = mergeUniqueCollectorOrcids(
    collectorOrcidsForResearchGroupToken(parsedFilename.experimenter),
    collectorOrcidsForResearchGroupToken(
      documentMetadata?.user?.group ?? undefined,
    ),
  );

  const sampleInfo: DatasetState["sampleInfo"] = {
    ...baseSampleInfo,
    substrate,
    processMethod: pmFromJson ?? baseSampleInfo.processMethod,
  };
  if (vendorLabel) {
    const matched = findMatchingVendorId(vendorLabel, vendors);
    if (matched) {
      sampleInfo.vendorId = matched;
      sampleInfo.newVendorName = "";
    } else {
      sampleInfo.vendorId = "";
      sampleInfo.newVendorName = vendorLabel;
    }
  }

  const collectorAttributions: DatasetAttributionEntry[] = collectors.map(
    (orcid) => ({
      clientId: crypto.randomUUID(),
      orcid,
      role: "DataCollector",
      displayName: null,
      userId: null,
      isClaimed: false,
      hasContributionAgreement: false,
      imageUrl: null,
    }),
  );

  return {
    sampleInfo,
    collectedByUserIds: collectors,
    attributions: dedupeDatasetAttributions(collectorAttributions),
  };
}
