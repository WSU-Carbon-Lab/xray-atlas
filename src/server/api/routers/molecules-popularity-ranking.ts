import type { PrismaClient } from "~/prisma/client";

/**
 * Defines how molecules are ordered for compact “popular” surfaces (e.g. home).
 *
 * Ranking uses a **lexicographic** sort (no single displayed score): total attached
 * experiments dominate, then molecule-level favorites, then views as a weak
 * tie-breaker, then recency for stability.
 *
 * Excludes nothing: molecules with zero experiments still appear and sort by
 * favorites, then views.
 */
export async function queryMoleculeIdsByPopularityRank(
  db: PrismaClient,
  limit: number,
): Promise<string[]> {
  const rows = await db.$queryRaw<Array<{ id: string }>>`
    SELECT m.id
    FROM public.molecules m
    LEFT JOIN public.samples s ON s.moleculeid = m.id
    LEFT JOIN public.experiments e ON e.sampleid = s.id
    GROUP BY m.id, m.favorite_count, m.view_count, m.createdat
    ORDER BY COUNT(e.id) DESC, m.favorite_count DESC, m.view_count DESC, m.createdat DESC
    LIMIT ${limit}
  `;
  return rows.map((r) => r.id);
}
