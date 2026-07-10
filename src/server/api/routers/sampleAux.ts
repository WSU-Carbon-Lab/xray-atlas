import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  contributeWriteProcedure,
  createTRPCRouter,
  publicProcedure,
} from "~/server/api/trpc";
import {
  assertUserMayEditSample,
  userMayEditSample,
} from "~/server/nexafs/experimentEditAuthz";
import {
  sampleDryMethodSchema,
  sampleProcessingModeSchema,
  sampleWetMethodSchema,
} from "~/lib/sample-aux-preparation";
import { scheduleZenodoDepositSyncForSample } from "~/server/zenodo";

const sampleAuxFieldsSchema = z.object({
  processingMode: sampleProcessingModeSchema.optional(),
  wetMethod: sampleWetMethodSchema.optional(),
  dryMethod: sampleDryMethodSchema.optional(),
  wetMethodOther: z.string().trim().max(512).optional(),
  dryMethodOther: z.string().trim().max(512).optional(),
  vaseThicknessNm: z.number().finite().optional(),
  roughnessNm: z.number().finite().optional(),
  orientationNotes: z.string().trim().max(2000).optional(),
  spinSpeedRpm: z.number().finite().optional(),
  spinAccelerationRpmPerS: z.number().finite().optional(),
  spinDurationS: z.number().finite().optional(),
  bladeSpeedMmPerS: z.number().finite().optional(),
  bladeGapUm: z.number().finite().optional(),
  bladeTemperatureC: z.number().finite().optional(),
  depositionRateAngstromPerS: z.number().finite().optional(),
  basePressureTorr: z.number().finite().optional(),
  workingPressureTorr: z.number().finite().optional(),
  sourceTemperatureC: z.number().finite().optional(),
  substrateTemperatureC: z.number().finite().optional(),
  concentrationMgPerMl: z.number().finite().optional(),
  solutionStirringTimeH: z.number().finite().optional(),
  solutionStirringTemperatureC: z.number().finite().optional(),
  filterSizeUm: z.number().finite().optional(),
  substrateOrientation: z.string().trim().max(512).optional(),
  substrateLot: z.string().trim().max(512).optional(),
  oxideThicknessNm: z.number().finite().optional(),
  depositionAtmosphere: z.string().trim().max(512).optional(),
  gloveboxO2Ppm: z.number().finite().optional(),
  gloveboxH2oPpm: z.number().finite().optional(),
  annealingTemperatureC: z.number().finite().optional(),
  annealingTimeMin: z.number().finite().optional(),
  annealingAtmosphere: z.string().trim().max(512).optional(),
  annealingRampCPerMin: z.number().finite().optional(),
  preparationDescription: z.string().trim().max(8000).optional(),
  notes: z.string().trim().max(8000).optional(),
});

function toSampleAuxPrismaData(input: z.infer<typeof sampleAuxFieldsSchema>) {
  return {
    processingmode: input.processingMode,
    wetmethod: input.wetMethod,
    drymethod: input.dryMethod,
    wetmethodother: input.wetMethodOther,
    drymethodother: input.dryMethodOther,
    vasethicknessnm: input.vaseThicknessNm,
    roughnessnm: input.roughnessNm,
    orientationnotes: input.orientationNotes,
    spinspeedrpm: input.spinSpeedRpm,
    spinaccelerationrpmperS: input.spinAccelerationRpmPerS,
    spindurations: input.spinDurationS,
    bladespeedmmperS: input.bladeSpeedMmPerS,
    bladegapum: input.bladeGapUm,
    bladetemperaturec: input.bladeTemperatureC,
    depositionrateangstromperS: input.depositionRateAngstromPerS,
    basepressuretorr: input.basePressureTorr,
    workingpressuretorr: input.workingPressureTorr,
    sourcetemperaturec: input.sourceTemperatureC,
    substratetemperaturec: input.substrateTemperatureC,
    concentrationmgperml: input.concentrationMgPerMl,
    solutionstirringtimeh: input.solutionStirringTimeH,
    solutionstirringtemperaturec: input.solutionStirringTemperatureC,
    filtersizeum: input.filterSizeUm,
    substrateorientation: input.substrateOrientation,
    substratelot: input.substrateLot,
    oxidethicknessnm: input.oxideThicknessNm,
    depositionatmosphere: input.depositionAtmosphere,
    gloveboxo2ppm: input.gloveboxO2Ppm,
    gloveboxh2oppm: input.gloveboxH2oPpm,
    annealingtemperaturec: input.annealingTemperatureC,
    annealingtimemin: input.annealingTimeMin,
    annealingatmosphere: input.annealingAtmosphere,
    annealingrampcpermin: input.annealingRampCPerMin,
    preparationdescription: input.preparationDescription,
    notes: input.notes,
  };
}

function fromSampleAuxRow(row: {
  sampleid: string;
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
}) {
  return {
    sampleId: row.sampleid,
    processingMode: row.processingmode as
      | z.infer<typeof sampleProcessingModeSchema>
      | null,
    wetMethod: row.wetmethod as z.infer<typeof sampleWetMethodSchema> | null,
    dryMethod: row.drymethod as z.infer<typeof sampleDryMethodSchema> | null,
    wetMethodOther: row.wetmethodother,
    dryMethodOther: row.drymethodother,
    vaseThicknessNm: row.vasethicknessnm,
    roughnessNm: row.roughnessnm,
    orientationNotes: row.orientationnotes,
    spinSpeedRpm: row.spinspeedrpm,
    spinAccelerationRpmPerS: row.spinaccelerationrpmperS,
    spinDurationS: row.spindurations,
    bladeSpeedMmPerS: row.bladespeedmmperS,
    bladeGapUm: row.bladegapum,
    bladeTemperatureC: row.bladetemperaturec,
    depositionRateAngstromPerS: row.depositionrateangstromperS,
    basePressureTorr: row.basepressuretorr,
    workingPressureTorr: row.workingpressuretorr,
    sourceTemperatureC: row.sourcetemperaturec,
    substrateTemperatureC: row.substratetemperaturec,
    concentrationMgPerMl: row.concentrationmgperml,
    solutionStirringTimeH: row.solutionstirringtimeh,
    solutionStirringTemperatureC: row.solutionstirringtemperaturec,
    filterSizeUm: row.filtersizeum,
    substrateOrientation: row.substrateorientation,
    substrateLot: row.substratelot,
    oxideThicknessNm: row.oxidethicknessnm,
    depositionAtmosphere: row.depositionatmosphere,
    gloveboxO2Ppm: row.gloveboxo2ppm,
    gloveboxH2oPpm: row.gloveboxh2oppm,
    annealingTemperatureC: row.annealingtemperaturec,
    annealingTimeMin: row.annealingtimemin,
    annealingAtmosphere: row.annealingatmosphere,
    annealingRampCPerMin: row.annealingrampcpermin,
    preparationDescription: row.preparationdescription,
    notes: row.notes,
  };
}

export const sampleAuxRouter = createTRPCRouter({
  get: publicProcedure
    .input(z.object({ sampleId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const row = await ctx.db.sampleaux.findUnique({
        where: { sampleid: input.sampleId },
      });
      if (!row) {
        return null;
      }
      return fromSampleAuxRow(row);
    }),

  upsert: contributeWriteProcedure
    .input(
      z.object({
        sampleId: z.string().uuid(),
        data: sampleAuxFieldsSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const sample = await ctx.db.samples.findUnique({
        where: { id: input.sampleId },
        select: { id: true },
      });
      if (!sample) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Sample not found",
        });
      }

      await assertUserMayEditSample(ctx.db, ctx.userId, input.sampleId);

      const prismaData = toSampleAuxPrismaData(input.data);
      const row = await ctx.db.sampleaux.upsert({
        where: { sampleid: input.sampleId },
        create: {
          sampleid: input.sampleId,
          ...prismaData,
        },
        update: prismaData,
      });

      await scheduleZenodoDepositSyncForSample(ctx.db, input.sampleId, {
        mode: "metadata",
      });

      return fromSampleAuxRow(row);
    }),

  delete: contributeWriteProcedure
    .input(z.object({ sampleId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const sample = await ctx.db.samples.findUnique({
        where: { id: input.sampleId },
        select: { id: true },
      });
      if (!sample) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Sample not found",
        });
      }

      await assertUserMayEditSample(ctx.db, ctx.userId, input.sampleId);

      await ctx.db.sampleaux.deleteMany({
        where: { sampleid: input.sampleId },
      });

      return { success: true };
    }),

  canEdit: publicProcedure
    .input(z.object({ sampleId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const allowed = await userMayEditSample(
        ctx.db,
        ctx.userId,
        input.sampleId,
      );
      return { allowed };
    }),
});
