import type { ExperimentType, ProcessMethod } from "~/prisma/browser";
import {
  canonicalizeNexafsVendorName,
  findMatchingVendorId,
  formatNexafsVendorLabel,
} from "~/lib/nexafsVendorLabel";
import {
  collectorUserIdsForResearchGroupToken,
  mergeUniqueCollectorUserIds,
} from "~/lib/nexafsResearchGroupCollectors";
import { resolveNexafsDefaultSubstrate } from "~/lib/resolveNexafsDefaultSubstrate";
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
}): Pick<DatasetState, "sampleInfo" | "collectedByUserIds"> {
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

  const collectors = mergeUniqueCollectorUserIds(
    collectorUserIdsForResearchGroupToken(parsedFilename.experimenter),
    collectorUserIdsForResearchGroupToken(
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

  return {
    sampleInfo,
    collectedByUserIds: collectors,
  };
}
