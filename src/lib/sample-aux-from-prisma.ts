/**
 * Maps persisted `sample_aux` Prisma columns onto contribute/browse camelCase fields.
 *
 * Does not validate enum strings beyond passthrough; Zod at write boundaries owns
 * processing/wet/dry method contracts.
 */

import type { SampleAuxFields } from "~/features/process-nexafs/types";
import type {
  SampleDryMethod,
  SampleProcessingMode,
  SampleWetMethod,
} from "~/lib/sample-aux-preparation";

/** Prisma `sampleaux` row shape used when hydrating UI DTOs. */
export interface SampleAuxPrismaRow {
  processingmode: string | null;
  wetmethod: string | null;
  drymethod: string | null;
  wetmethodother: string | null;
  drymethodother: string | null;
  vasethicknessnm: number | null;
  roughnessnm: number | null;
  orientationnotes: string | null;
  spinspeedrpm: number | null;
  spinaccelerationrpmperS: number | null;
  spindurations: number | null;
  bladespeedmmperS: number | null;
  bladegapum: number | null;
  bladetemperaturec: number | null;
  depositionrateangstromperS: number | null;
  basepressuretorr: number | null;
  workingpressuretorr: number | null;
  sourcetemperaturec: number | null;
  substratetemperaturec: number | null;
  concentrationmgperml: number | null;
  solutionstirringtimeh: number | null;
  solutionstirringtemperaturec: number | null;
  filtersizeum: number | null;
  substrateorientation: string | null;
  substratelot: string | null;
  oxidethicknessnm: number | null;
  depositionatmosphere: string | null;
  gloveboxo2ppm: number | null;
  gloveboxh2oppm: number | null;
  annealingtemperaturec: number | null;
  annealingtimemin: number | null;
  annealingatmosphere: string | null;
  annealingrampcpermin: number | null;
  preparationdescription: string | null;
  notes: string | null;
}

function optionalString(value: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function optionalFinite(value: number | null): number | undefined {
  return value != null && Number.isFinite(value) ? value : undefined;
}

/**
 * Converts a Prisma `sampleaux` row into {@link SampleAuxFields}, omitting empty values.
 *
 * @param row - Persisted sample_aux columns (nullable Prisma scalars).
 * @returns CamelCase contribute fields suitable for metadata display helpers.
 */
export function sampleAuxFieldsFromPrismaRow(
  row: SampleAuxPrismaRow,
): SampleAuxFields {
  const fields: SampleAuxFields = {};
  if (row.processingmode) {
    fields.processingMode = row.processingmode as SampleProcessingMode;
  }
  if (row.wetmethod) {
    fields.wetMethod = row.wetmethod as SampleWetMethod;
  }
  if (row.drymethod) {
    fields.dryMethod = row.drymethod as SampleDryMethod;
  }
  const wetOther = optionalString(row.wetmethodother);
  if (wetOther) {
    fields.wetMethodOther = wetOther;
  }
  const dryOther = optionalString(row.drymethodother);
  if (dryOther) {
    fields.dryMethodOther = dryOther;
  }
  const vase = optionalFinite(row.vasethicknessnm);
  if (vase != null) {
    fields.vaseThicknessNm = vase;
  }
  const roughness = optionalFinite(row.roughnessnm);
  if (roughness != null) {
    fields.roughnessNm = roughness;
  }
  const orientation = optionalString(row.orientationnotes);
  if (orientation) {
    fields.orientationNotes = orientation;
  }
  const spinSpeed = optionalFinite(row.spinspeedrpm);
  if (spinSpeed != null) {
    fields.spinSpeedRpm = spinSpeed;
  }
  const spinAccel = optionalFinite(row.spinaccelerationrpmperS);
  if (spinAccel != null) {
    fields.spinAccelerationRpmPerS = spinAccel;
  }
  const spinDur = optionalFinite(row.spindurations);
  if (spinDur != null) {
    fields.spinDurationS = spinDur;
  }
  const bladeSpeed = optionalFinite(row.bladespeedmmperS);
  if (bladeSpeed != null) {
    fields.bladeSpeedMmPerS = bladeSpeed;
  }
  const bladeGap = optionalFinite(row.bladegapum);
  if (bladeGap != null) {
    fields.bladeGapUm = bladeGap;
  }
  const bladeTemp = optionalFinite(row.bladetemperaturec);
  if (bladeTemp != null) {
    fields.bladeTemperatureC = bladeTemp;
  }
  const depRate = optionalFinite(row.depositionrateangstromperS);
  if (depRate != null) {
    fields.depositionRateAngstromPerS = depRate;
  }
  const baseP = optionalFinite(row.basepressuretorr);
  if (baseP != null) {
    fields.basePressureTorr = baseP;
  }
  const workP = optionalFinite(row.workingpressuretorr);
  if (workP != null) {
    fields.workingPressureTorr = workP;
  }
  const sourceTemp = optionalFinite(row.sourcetemperaturec);
  if (sourceTemp != null) {
    fields.sourceTemperatureC = sourceTemp;
  }
  const subTemp = optionalFinite(row.substratetemperaturec);
  if (subTemp != null) {
    fields.substrateTemperatureC = subTemp;
  }
  const conc = optionalFinite(row.concentrationmgperml);
  if (conc != null) {
    fields.concentrationMgPerMl = conc;
  }
  const stirTime = optionalFinite(row.solutionstirringtimeh);
  if (stirTime != null) {
    fields.solutionStirringTimeH = stirTime;
  }
  const stirTemp = optionalFinite(row.solutionstirringtemperaturec);
  if (stirTemp != null) {
    fields.solutionStirringTemperatureC = stirTemp;
  }
  const filter = optionalFinite(row.filtersizeum);
  if (filter != null) {
    fields.filterSizeUm = filter;
  }
  const subOrient = optionalString(row.substrateorientation);
  if (subOrient) {
    fields.substrateOrientation = subOrient;
  }
  const subLot = optionalString(row.substratelot);
  if (subLot) {
    fields.substrateLot = subLot;
  }
  const oxide = optionalFinite(row.oxidethicknessnm);
  if (oxide != null) {
    fields.oxideThicknessNm = oxide;
  }
  const atm = optionalString(row.depositionatmosphere);
  if (atm) {
    fields.depositionAtmosphere = atm;
  }
  const o2 = optionalFinite(row.gloveboxo2ppm);
  if (o2 != null) {
    fields.gloveboxO2Ppm = o2;
  }
  const h2o = optionalFinite(row.gloveboxh2oppm);
  if (h2o != null) {
    fields.gloveboxH2oPpm = h2o;
  }
  const annealT = optionalFinite(row.annealingtemperaturec);
  if (annealT != null) {
    fields.annealingTemperatureC = annealT;
  }
  const annealTime = optionalFinite(row.annealingtimemin);
  if (annealTime != null) {
    fields.annealingTimeMin = annealTime;
  }
  const annealAtm = optionalString(row.annealingatmosphere);
  if (annealAtm) {
    fields.annealingAtmosphere = annealAtm;
  }
  const annealRamp = optionalFinite(row.annealingrampcpermin);
  if (annealRamp != null) {
    fields.annealingRampCPerMin = annealRamp;
  }
  const prep = optionalString(row.preparationdescription);
  if (prep) {
    fields.preparationDescription = prep;
  }
  const notes = optionalString(row.notes);
  if (notes) {
    fields.notes = notes;
  }
  return fields;
}
