import type { PrismaClient } from "~/prisma/client";

export type NexafsFacetCountsResult = {
  edges: Array<{ id: string; label: string; count: number }>;
  instruments: Array<{ id: string; label: string; count: number }>;
  molecules: Array<{ id: string; label: string; count: number }>;
  contributors: Array<{ id: string; label: string; count: number }>;
};

/**
 * Loads top facet popularity counts for the NEXAFS browse catalog (unfiltered, capped at 30 per facet).
 *
 * @param db Prisma client bound to the deployment database.
 */
export async function loadNexafsFacetCounts(
  db: PrismaClient,
): Promise<NexafsFacetCountsResult> {
  type EdgeRow = {
    id: string;
    targetatom: string;
    corestate: string;
    count: bigint;
  };
  type InstrumentRow = {
    id: string;
    name: string;
    facility_name: string | null;
    count: bigint;
  };
  type MolRow = { id: string; name: string; count: bigint };
  type ContributorRow = {
    orcid_id: string;
    name: string | null;
    count: bigint;
  };

  const [edgeRows, instRows, molRows, contRows] = await Promise.all([
    db.$queryRaw<EdgeRow[]>`
        SELECT ed.id, ed.targetatom, ed.corestate, COUNT(e.id)::bigint AS count
        FROM edges ed
        INNER JOIN experiments e ON e.edgeid = ed.id
        GROUP BY ed.id, ed.targetatom, ed.corestate
        ORDER BY count DESC, ed.targetatom ASC, ed.corestate ASC
        LIMIT 30
      `,
    db.$queryRaw<InstrumentRow[]>`
        SELECT i.id, i.name, f.name AS facility_name, COUNT(e.id)::bigint AS count
        FROM instruments i
        INNER JOIN experiments e ON e.instrumentid = i.id
        LEFT JOIN facilities f ON f.id = i.facilityid
        GROUP BY i.id, i.name, f.name
        ORDER BY count DESC, i.name ASC
        LIMIT 30
      `,
    db.$queryRaw<MolRow[]>`
        SELECT m.id, COALESCE(ms.synonym, m.iupacname) AS name, COUNT(e.id)::bigint AS count
        FROM molecules m
        INNER JOIN samples s ON s.moleculeid = m.id
        INNER JOIN experiments e ON e.sampleid = s.id
        LEFT JOIN LATERAL (
          SELECT ms2.synonym FROM moleculesynonyms ms2
          WHERE ms2.moleculeid = m.id
          ORDER BY ms2."order" ASC NULLS LAST, ms2.synonym ASC
          LIMIT 1
        ) ms ON TRUE
        GROUP BY m.id, m.iupacname, ms.synonym
        ORDER BY count DESC, name ASC
        LIMIT 30
      `,
    db.$queryRaw<ContributorRow[]>`
        SELECT
          ec.orcid_id,
          CASE
            WHEN u.name IS NOT NULL AND ec.claim_status = 'accepted' AND ec.is_public_profile_visible
              THEN u.name
            ELSE ec.orcid_id
          END AS name,
          COUNT(DISTINCT ec.experiment_id)::bigint AS count
        FROM experiment_contributors ec
        LEFT JOIN next_auth."user" u ON u.id = ec.user_id
        WHERE ec.claim_status NOT IN ('declined', 'unclaimed')
        GROUP BY ec.orcid_id, u.name, ec.claim_status, ec.is_public_profile_visible
        ORDER BY count DESC
        LIMIT 30
      `,
  ]);

  return {
    edges: edgeRows.map((r) => ({
      id: r.id,
      label: `${r.targetatom} ${r.corestate}`,
      count: Number(r.count),
    })),
    instruments: instRows.map((r) => ({
      id: r.id,
      label: r.facility_name ? `${r.name} (${r.facility_name})` : r.name,
      count: Number(r.count),
    })),
    molecules: molRows.map((r) => ({
      id: r.id,
      label: r.name,
      count: Number(r.count),
    })),
    contributors: contRows.map((r) => ({
      id: r.orcid_id,
      label: r.name ?? r.orcid_id,
      count: Number(r.count),
    })),
  };
}
