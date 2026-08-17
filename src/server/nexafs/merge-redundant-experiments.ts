/**
 * Absorbs a redundant NEXAFS experiment into a keep experiment: copies
 * absorb-only and user-selected overlapping geometries, applies metadata
 * resolutions, then hard-deletes the absorb experiment.
 *
 * Does not invent spectrum values; overlapping θ/φ keep one side only.
 */

import { TRPCError } from "@trpc/server";
import {
  Prisma,
  type ExperimentType,
  type ProcessMethod,
} from "~/prisma/client";
import type { PrismaClient } from "~/prisma/client";
import { normalizeSampleSubstrate } from "~/lib/normalizeSampleSubstrate";
import { spectrumGeometryKey } from "~/lib/nexafs/spectrum-geometry-key";
import { emitAuditEvent } from "~/server/audit/emit-audit-event";
import type { AuditRequestMeta } from "~/server/audit/request-meta";
import { assertUserMayEditExperiment } from "~/server/nexafs/experimentEditAuthz";
import {
  assertValidCreateAttributions,
  buildContributorInsertRows,
  mergeContributorRowsWithExistingClaimState,
  normalizeAttributionInputs,
  resolveKnownCollectorUserIds,
  type ExperimentAttributionInput,
} from "~/server/nexafs/experimentAttributions";
import { persistExperimentMetricsTables } from "~/server/nexafs/persistExperimentMetricsTables";
import { scheduleZenodoDepositSync } from "~/server/zenodo";

/** Max spectrum rows loaded per experiment during merge (fail loudly above). */
export const MERGE_SPECTRUM_ROW_CAP = 10_000;

/** Geometry resolution for one overlapping or absorb-only key. */
export type MergeGeometryResolution = {
  key: string;
  source: "keep" | "absorb";
};

/** Metadata field resolution for persist merge (absorb→keep naming). */
export type MergeMetadataResolution = {
  field:
    | "edge"
    | "instrument"
    | "type"
    | "researchers"
    | "substrate"
    | "processMethod"
    | "thickness"
    | "solvent"
    | "patterningLayer";
  source: "keep" | "absorb" | "both";
};

export type MergeRedundantInput = {
  keepExperimentId: string;
  absorbExperimentId: string;
  geometryResolutions: readonly MergeGeometryResolution[];
  metadataResolutions: readonly MergeMetadataResolution[];
  attributionsWhenBoth?: ReadonlyArray<{ orcid: string; role: string }>;
  actorUserId: string;
  requestMeta?: AuditRequestMeta;
};

type SpectrumRow = {
  energyev: number;
  rawabs: number;
  i0: number | null;
  beta: number | null;
  massabsorption: number | null;
  od: number | null;
  polarizationid: string | null;
  rawabserr: number | null;
  oderr: number | null;
  massabsorptionerr: number | null;
  betaerr: number | null;
  delta: number | null;
  deltaerr: number | null;
  polarizations: {
    id: string;
    polardeg: Prisma.Decimal;
    azimuthdeg: Prisma.Decimal;
  } | null;
};

function geometryKeyFromRow(row: SpectrumRow): string {
  if (!row.polarizations) {
    return "fixed";
  }
  const theta = Number(row.polarizations.polardeg);
  const phi = Number(row.polarizations.azimuthdeg);
  if (!Number.isFinite(theta) || !Number.isFinite(phi)) {
    return "fixed";
  }
  return spectrumGeometryKey(theta, phi);
}

function groupRowsByGeometry(
  rows: SpectrumRow[],
): Map<string, { theta: number; phi: number; rows: SpectrumRow[] }> {
  const groups = new Map<
    string,
    { theta: number; phi: number; rows: SpectrumRow[] }
  >();
  for (const row of rows) {
    const key = geometryKeyFromRow(row);
    const existing = groups.get(key);
    if (existing) {
      existing.rows.push(row);
      continue;
    }
    if (key === "fixed" || !row.polarizations) {
      groups.set(key, { theta: 0, phi: 0, rows: [row] });
      continue;
    }
    groups.set(key, {
      theta: Number(row.polarizations.polardeg),
      phi: Number(row.polarizations.azimuthdeg),
      rows: [row],
    });
  }
  return groups;
}

async function getOrCreatePolarizationId(
  tx: Prisma.TransactionClient,
  cache: Map<string, string>,
  theta: number,
  phi: number,
): Promise<string> {
  const key = spectrumGeometryKey(theta, phi);
  const cached = cache.get(key);
  if (cached) {
    return cached;
  }
  const existing = await tx.polarizations.findFirst({
    where: {
      polardeg: new Prisma.Decimal(theta),
      azimuthdeg: new Prisma.Decimal(phi),
    },
    select: { id: true },
  });
  if (existing) {
    cache.set(key, existing.id);
    return existing.id;
  }
  const created = await tx.polarizations.create({
    data: {
      polardeg: new Prisma.Decimal(theta),
      azimuthdeg: new Prisma.Decimal(phi),
    },
    select: { id: true },
  });
  cache.set(key, created.id);
  return created.id;
}

/**
 * Coerces a merged attribution list so exactly one DataCurator remains.
 * Extra curator rows become DataCollector.
 */
function coerceSingleDataCurator(
  rows: ExperimentAttributionInput[],
  preferredCuratorOrcid: string | null,
): ExperimentAttributionInput[] {
  const curators = rows.filter((row) => row.role === "DataCurator");
  if (curators.length <= 1) {
    return rows;
  }
  const preferred =
    (preferredCuratorOrcid != null
      ? curators.find((row) => row.orcid === preferredCuratorOrcid)
      : undefined) ?? curators[0]!;
  return normalizeAttributionInputs(
    rows.map((row) =>
      row.role === "DataCurator" && row.orcid !== preferred.orcid
        ? { orcid: row.orcid, role: "DataCollector" }
        : row,
    ),
  );
}

/**
 * Unions keep and absorb contributor rosters, keeping the keep experiment's
 * DataCurator when both sides list one.
 */
function unionAttributionRostersKeepingCurator(
  keepRows: Array<{ orcidid: string; role: string }>,
  absorbRows: Array<{ orcidid: string; role: string }>,
): ExperimentAttributionInput[] {
  const keepNormalized = normalizeAttributionInputs(
    keepRows.map((row) => ({ orcid: row.orcidid, role: row.role })),
  );
  const absorbNormalized = normalizeAttributionInputs(
    absorbRows.map((row) => ({ orcid: row.orcidid, role: row.role })),
  );
  const keepCurator = keepNormalized.find((row) => row.role === "DataCurator");
  return coerceSingleDataCurator(
    normalizeAttributionInputs([...keepNormalized, ...absorbNormalized]),
    keepCurator?.orcid ?? null,
  );
}

function toCreateManyRow(
  keepExperimentId: string,
  polarizationId: string | null,
  row: SpectrumRow,
): Prisma.spectrumpointsCreateManyInput {
  return {
    experimentid: keepExperimentId,
    energyev: row.energyev,
    rawabs: row.rawabs,
    i0: row.i0,
    beta: row.beta,
    massabsorption: row.massabsorption,
    od: row.od,
    polarizationid: polarizationId,
    rawabserr: row.rawabserr,
    oderr: row.oderr,
    massabsorptionerr: row.massabsorptionerr,
    betaerr: row.betaerr,
    delta: row.delta,
    deltaerr: row.deltaerr,
  };
}

/**
 * Merges absorb into keep then hard-deletes absorb. Caller must already enforce
 * privileged (AAL2) write procedure.
 *
 * @param db - Prisma client.
 * @param input - Keep/absorb ids, geometry and metadata resolutions.
 * @returns Keep experiment id after merge.
 */
export async function mergeRedundantExperiments(
  db: PrismaClient,
  input: MergeRedundantInput,
): Promise<{ keepExperimentId: string }> {
  const {
    keepExperimentId,
    absorbExperimentId,
    geometryResolutions,
    metadataResolutions,
    attributionsWhenBoth,
    actorUserId,
    requestMeta,
  } = input;

  if (keepExperimentId === absorbExperimentId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Keep and absorb experiments must be different",
    });
  }

  await assertUserMayEditExperiment(db, actorUserId, keepExperimentId);
  await assertUserMayEditExperiment(db, actorUserId, absorbExperimentId);

  const [keep, absorb] = await Promise.all([
    db.experiments.findUnique({
      where: { id: keepExperimentId },
      select: {
        id: true,
        sampleid: true,
        edgeid: true,
        instrumentid: true,
        experimenttype: true,
        atlasdatasetid: true,
        samples: { select: { moleculeid: true } },
        experimentzenododeposit: { select: { experimentid: true, doi: true } },
      },
    }),
    db.experiments.findUnique({
      where: { id: absorbExperimentId },
      select: {
        id: true,
        sampleid: true,
        edgeid: true,
        instrumentid: true,
        experimenttype: true,
        atlasdatasetid: true,
        samples: {
          select: {
            moleculeid: true,
            substrate: true,
            processmethod: true,
            thickness: true,
            solvent: true,
            patterninglayer: true,
          },
        },
        experimentzenododeposit: { select: { experimentid: true, doi: true } },
      },
    }),
  ]);

  if (!keep || !absorb) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "One or both experiments were not found",
    });
  }

  if (keep.samples.moleculeid !== absorb.samples.moleculeid) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Experiments must belong to the same molecule",
    });
  }

  const [keepCount, absorbCount] = await Promise.all([
    db.spectrumpoints.count({ where: { experimentid: keepExperimentId } }),
    db.spectrumpoints.count({ where: { experimentid: absorbExperimentId } }),
  ]);
  if (
    keepCount > MERGE_SPECTRUM_ROW_CAP ||
    absorbCount > MERGE_SPECTRUM_ROW_CAP
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Merge supports at most ${MERGE_SPECTRUM_ROW_CAP} spectrum points per experiment`,
    });
  }

  const spectrumSelect = {
    energyev: true,
    rawabs: true,
    i0: true,
    beta: true,
    massabsorption: true,
    od: true,
    polarizationid: true,
    rawabserr: true,
    oderr: true,
    massabsorptionerr: true,
    betaerr: true,
    delta: true,
    deltaerr: true,
    polarizations: {
      select: { id: true, polardeg: true, azimuthdeg: true },
    },
  } as const;

  const [keepRows, absorbRows] = await Promise.all([
    db.spectrumpoints.findMany({
      where: { experimentid: keepExperimentId },
      select: spectrumSelect,
    }),
    db.spectrumpoints.findMany({
      where: { experimentid: absorbExperimentId },
      select: spectrumSelect,
    }),
  ]);

  const keepGroups = groupRowsByGeometry(keepRows as SpectrumRow[]);
  const absorbGroups = groupRowsByGeometry(absorbRows as SpectrumRow[]);

  const resolutionByKey = new Map(
    geometryResolutions.map((row) => [row.key, row.source]),
  );

  for (const key of keepGroups.keys()) {
    if (absorbGroups.has(key) && !resolutionByKey.has(key)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Missing geometry resolution for overlapping polarization ${key}`,
      });
    }
  }

  const metaByField = new Map(
    metadataResolutions.map((row) => [row.field, row.source]),
  );

  await db.$transaction(async (tx) => {
    const polCache = new Map<string, string>();

    for (const [key, absorbGroup] of absorbGroups.entries()) {
      const keepHas = keepGroups.has(key);
      if (!keepHas) {
        const polarizationId =
          key === "fixed"
            ? null
            : await getOrCreatePolarizationId(
                tx,
                polCache,
                absorbGroup.theta,
                absorbGroup.phi,
              );
        await tx.spectrumpoints.createMany({
          data: absorbGroup.rows.map((row) =>
            toCreateManyRow(keepExperimentId, polarizationId, row),
          ),
        });
        continue;
      }

      const source = resolutionByKey.get(key) ?? "keep";
      if (source === "keep") {
        continue;
      }

      const keepGroup = keepGroups.get(key)!;
      const keepPolIds = new Set(
        keepGroup.rows
          .map((r) => r.polarizationid)
          .filter((id): id is string => typeof id === "string"),
      );
      if (keepPolIds.size > 0) {
        await tx.spectrumpoints.deleteMany({
          where: {
            experimentid: keepExperimentId,
            polarizationid: { in: [...keepPolIds] },
          },
        });
      } else {
        await tx.spectrumpoints.deleteMany({
          where: {
            experimentid: keepExperimentId,
            polarizationid: null,
          },
        });
      }

      const polarizationId =
        key === "fixed"
          ? null
          : await getOrCreatePolarizationId(
              tx,
              polCache,
              absorbGroup.theta,
              absorbGroup.phi,
            );
      await tx.spectrumpoints.createMany({
        data: absorbGroup.rows.map((row) =>
          toCreateManyRow(keepExperimentId, polarizationId, row),
        ),
      });
    }

    const experimentPatch: {
      edgeid?: string;
      instrumentid?: string;
      experimenttype?: ExperimentType | null;
      nexafsexperimentkindid?: string | null;
      updatedat: Date;
    } = { updatedat: new Date() };

    if (metaByField.get("edge") === "absorb") {
      experimentPatch.edgeid = absorb.edgeid;
    }
    if (metaByField.get("instrument") === "absorb") {
      experimentPatch.instrumentid = absorb.instrumentid;
    }
    if (metaByField.get("type") === "absorb") {
      experimentPatch.experimenttype = absorb.experimenttype;
      if (absorb.experimenttype) {
        const kind = await tx.nexafsexperimentkinds.findUnique({
          where: { experimenttype: absorb.experimenttype },
          select: { id: true },
        });
        experimentPatch.nexafsexperimentkindid = kind?.id ?? null;
      } else {
        experimentPatch.nexafsexperimentkindid = null;
      }
    }

    await tx.experiments.update({
      where: { id: keepExperimentId },
      data: experimentPatch,
    });

    const samplePatch: {
      substrate?: string | null;
      processmethod?: ProcessMethod | null;
      thickness?: number | null;
      solvent?: string | null;
      patterninglayer?: string | null;
    } = {};
    if (metaByField.get("substrate") === "absorb") {
      samplePatch.substrate = normalizeSampleSubstrate(
        absorb.samples.substrate,
      );
    }
    if (metaByField.get("processMethod") === "absorb") {
      samplePatch.processmethod = absorb.samples.processmethod;
    }
    if (metaByField.get("thickness") === "absorb") {
      samplePatch.thickness =
        absorb.samples.thickness == null
          ? null
          : Number(absorb.samples.thickness);
    }
    if (metaByField.get("solvent") === "absorb") {
      samplePatch.solvent = absorb.samples.solvent;
    }
    if (metaByField.get("patterningLayer") === "absorb") {
      samplePatch.patterninglayer = absorb.samples.patterninglayer;
    }
    if (Object.keys(samplePatch).length > 0) {
      await tx.samples.update({
        where: { id: keep.sampleid },
        data: samplePatch,
      });
    }

    const researchersSource = metaByField.get("researchers");
    if (researchersSource === "absorb" || researchersSource === "both") {
      let attributionRows: ExperimentAttributionInput[];
      if (researchersSource === "both") {
        if (attributionsWhenBoth && attributionsWhenBoth.length > 0) {
          const keepContributors = await tx.experimentcontributors.findMany({
            where: { experimentid: keepExperimentId },
            select: { orcidid: true, role: true },
          });
          const keepCurator = keepContributors.find(
            (row) => row.role === "DataCurator",
          );
          attributionRows = coerceSingleDataCurator(
            normalizeAttributionInputs([...attributionsWhenBoth]),
            keepCurator?.orcidid ?? null,
          );
        } else {
          const [keepContributors, absorbContributors] = await Promise.all([
            tx.experimentcontributors.findMany({
              where: { experimentid: keepExperimentId },
              select: { orcidid: true, role: true },
            }),
            tx.experimentcontributors.findMany({
              where: { experimentid: absorbExperimentId },
              select: { orcidid: true, role: true },
            }),
          ]);
          attributionRows = unionAttributionRostersKeepingCurator(
            keepContributors,
            absorbContributors,
          );
        }
      } else {
        const absorbContributors = await tx.experimentcontributors.findMany({
          where: { experimentid: absorbExperimentId },
          select: { orcidid: true, role: true },
        });
        attributionRows = normalizeAttributionInputs(
          absorbContributors.map((row) => ({
            orcid: row.orcidid,
            role: row.role,
          })),
        );
      }
      assertValidCreateAttributions(attributionRows);
      const existingRows = await tx.experimentcontributors.findMany({
        where: { experimentid: keepExperimentId },
        select: {
          orcidid: true,
          role: true,
          userid: true,
          claimstatus: true,
          isclaimed: true,
          ispublicprofilevisible: true,
          claimedat: true,
          detachedat: true,
        },
      });
      const contributorInsertRows = mergeContributorRowsWithExistingClaimState(
        await buildContributorInsertRows(tx, attributionRows, actorUserId),
        existingRows,
      );
      const collectedBy = await resolveKnownCollectorUserIds(
        tx,
        attributionRows,
      );
      await tx.experimentcontributors.deleteMany({
        where: { experimentid: keepExperimentId },
      });
      if (contributorInsertRows.length > 0) {
        await tx.experimentcontributors.createMany({
          data: contributorInsertRows.map((row) => ({
            experimentid: keepExperimentId,
            orcidid: row.orcidid,
            userid: row.userid,
            role: row.role,
            claimstatus: row.claimstatus,
            isclaimed: row.isclaimed,
            ispublicprofilevisible: row.ispublicprofilevisible,
            claimedat: row.claimedat,
            detachedat: row.detachedat,
          })),
        });
      }
      await tx.experiments.update({
        where: { id: keepExperimentId },
        data: { collectedbyuserids: collectedBy },
      });
    }

    await emitAuditEvent({
      db: tx,
      eventType: "experiment.merge",
      eventScope: "experiments.mergeRedundant",
      actorUserId,
      payload: {
        keepExperimentId,
        absorbExperimentId,
        geometryResolutions: [...geometryResolutions],
        metadataResolutions: [...metadataResolutions],
        absorbAtlasDatasetId: absorb.atlasdatasetid,
        keepAtlasDatasetId: keep.atlasdatasetid,
      },
      requestMeta,
      failSilent: false,
    });

    try {
      await tx.experiments.delete({
        where: { id: absorbExperimentId },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Absorb experiment was already deleted",
        });
      }
      throw error;
    }
  });

  await persistExperimentMetricsTables(db, keepExperimentId);
  scheduleZenodoDepositSync(db, keepExperimentId, { mode: "metadata" });

  return { keepExperimentId };
}
