import type { Prisma } from "~/prisma/client";
import type { InstrumentStewardPublic } from "~/lib/instrument-steward";

/** Prisma select shape for steward rows returned to public callers. */
export const instrumentStewardPublicSelect = {
  instrumentid: true,
  userid: true,
  assignedat: true,
  claimissueurl: true,
  notes: true,
  steward: {
    select: {
      id: true,
      name: true,
      image: true,
    },
  },
} as const satisfies Prisma.instrumentstewardSelect;

export type InstrumentStewardRow = Prisma.instrumentstewardGetPayload<{
  select: typeof instrumentStewardPublicSelect;
}>;

/**
 * Maps a persisted steward row to the public DTO used on facility instrument cards.
 */
export function toInstrumentStewardPublic(
  row: InstrumentStewardRow,
): InstrumentStewardPublic {
  return {
    instrumentId: row.instrumentid,
    userId: row.steward.id,
    name: row.steward.name,
    image: row.steward.image,
    assignedAt: row.assignedat.toISOString(),
    claimIssueUrl: row.claimissueurl,
    notes: row.notes,
  };
}
