import { Prisma } from "~/prisma/client";
import type { ExperimentType, PrismaClient } from "~/prisma/client";
import {
  buildNexafsBrowseDatasetMetricsCardModel,
  type NexafsBrowseDatasetMetricsCardModel,
} from "~/lib/nexafs-dataset-metric-display-model";
import type { NexafsBrowseLinkedPublication } from "~/types/nexafs-browse";

export type NexafsBrowseGroupFilters = {
  moleculeId?: string;
  edgeId?: string;
  instrumentId?: string;
  experimentType?: ExperimentType;
  verifiedOnly?: boolean;
  verificationSource?: "either" | "publication" | "atlas";
};

export function buildNexafsBrowseWhereSql(
  filters: NexafsBrowseGroupFilters,
  searchQuery: string | null,
): Prisma.Sql {
  const parts: Prisma.Sql[] = [];

  if (filters.moleculeId) {
    parts.push(Prisma.sql`s.moleculeid = ${filters.moleculeId}::uuid`);
  }
  if (filters.edgeId) {
    parts.push(Prisma.sql`e.edgeid = ${filters.edgeId}::uuid`);
  }
  if (filters.instrumentId) {
    parts.push(Prisma.sql`e.instrumentid = ${filters.instrumentId}`);
  }
  if (filters.experimentType) {
    parts.push(
      Prisma.sql`e.experimenttype = ${filters.experimentType}::"ExperimentType"`,
    );
  }
  if (filters.verifiedOnly) {
    if (filters.verificationSource === "publication") {
      parts.push(Prisma.sql`EXISTS (
        SELECT 1
        FROM experiment_publications epv
        WHERE epv.experiment_id = e.id
      )`);
    } else if (filters.verificationSource === "atlas") {
      parts.push(Prisma.sql`(COALESCE(vs.validation_summary->>'passed', 'false') = 'true')`);
    } else {
      parts.push(Prisma.sql`(
        COALESCE(vs.validation_summary->>'passed', 'false') = 'true'
        OR EXISTS (
          SELECT 1
          FROM experiment_publications epv
          WHERE epv.experiment_id = e.id
        )
      )`);
    }
  }

  const q = searchQuery?.trim();
  if (q && q.length > 0) {
    const pattern = `%${q}%`;
    parts.push(Prisma.sql`(
      m.iupacname ILIKE ${pattern}
      OR m.chemicalformula ILIKE ${pattern}
      OR s.identifier ILIKE ${pattern}
      OR i.name ILIKE ${pattern}
      OR COALESCE(f.name, '') ILIKE ${pattern}
      OR ed.targetatom ILIKE ${pattern}
      OR ed.corestate ILIKE ${pattern}
      OR e.id::text ILIKE ${pattern}
      OR EXISTS (
        SELECT 1 FROM moleculesynonyms msq
        WHERE msq.moleculeid = m.id AND msq.synonym ILIKE ${pattern}
      )
    )`);
  }

  if (parts.length === 0) {
    return Prisma.sql`TRUE`;
  }
  return Prisma.join(parts, " AND ");
}

/**
 * Controls SQL `ORDER BY` for grouped NEXAFS browse rows (`enriched` aliased as `g`).
 *
 * Sort keys mirror the molecule browse toolbar: molecule favorites/views, geometry count,
 * linked publication count on the experiment row, name, and recency.
 */
export type NexafsBrowseSortKey =
  | "quality"
  | "favorites"
  | "views"
  | "geometries"
  | "publications"
  | "name"
  | "newest";

export function buildNexafsBrowseOrderBySql(
  sortBy: NexafsBrowseSortKey,
): Prisma.Sql {
  switch (sortBy) {
    case "quality":
      return Prisma.sql`ORDER BY g.dataset_quality_score DESC NULLS LAST, g.createdat DESC, g.experiment_id DESC`;
    case "favorites":
      return Prisma.sql`ORDER BY g.molecule_favorite_count DESC, g.createdat DESC, g.experiment_id DESC`;
    case "views":
      return Prisma.sql`ORDER BY g.molecule_view_count DESC, g.createdat DESC, g.experiment_id DESC`;
    case "geometries":
      return Prisma.sql`ORDER BY g.polarization_geometry_count DESC, g.createdat DESC, g.experiment_id DESC`;
    case "publications":
      return Prisma.sql`ORDER BY g.publication_link_count DESC, g.createdat DESC, g.experiment_id DESC`;
    case "name":
      return Prisma.sql`ORDER BY LOWER(g.molecule_display_name) ASC, g.experiment_id DESC`;
    case "newest":
      return Prisma.sql`ORDER BY g.createdat DESC, g.experiment_id DESC`;
    default: {
      const _exhaustive: never = sortBy;
      return Prisma.sql`ORDER BY g.createdat DESC, g.experiment_id DESC`;
    }
  }
}

export type NexafsBrowseGroupRow = {
  experiment_id: string;
  canonical_polarization_id: string | null;
  experiment_favorite_count: bigint;
  user_has_favorited: boolean;
  createdat: Date;
  createdby: string | null;
  experimenttype: ExperimentType | null;
  molecule_id: string;
  molecule_display_name: string;
  iupacname: string;
  chemicalformula: string;
  imageurl: string | null;
  inchi: string;
  smiles: string;
  cas_number: string | null;
  pubchem_cid: string | null;
  molecule_favorite_count: bigint;
  molecule_view_count: bigint;
  targetatom: string;
  corestate: string;
  instrument_name: string;
  facility_name: string | null;
  contributor_labels: string | null;
  contributor_users: unknown;
  polarization_geometry_count: bigint;
  publication_link_count: bigint;
  linked_publications_json: unknown;
  ingest_verified: boolean;
  experiment_metrics_header_json: unknown;
  experiment_metrics_channels_json: unknown;
  dataset_quality_score: number | null;
};

export type NexafsBrowseContributorUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  orcid: string | null;
};

export type NexafsBrowseGroupDto = {
  experimentId: string;
  favoriteCount: number;
  userHasFavorited: boolean;
  createdat: Date;
  experimenttype: ExperimentType | null;
  polarizationCount: number;
  linkedPublications: NexafsBrowseLinkedPublication[];
  ingestVerified: boolean;
  contributorLabels: string | null;
  contributorUsers: NexafsBrowseContributorUser[];
  molecule: {
    id: string;
    displayName: string;
    iupacname: string;
    chemicalformula: string;
    imageurl: string | null;
    inchi: string;
    smiles: string;
    casNumber: string | null;
    pubChemCid: string | null;
    favoriteCount: number;
  };
  edge: { targetatom: string; corestate: string };
  instrument: { name: string; facilityName: string | null };
  datasetMetrics: NexafsBrowseDatasetMetricsCardModel;
};

function parseContributorUsers(raw: unknown): NexafsBrowseContributorUser[] {
  if (!raw || !Array.isArray(raw)) return [];
  const out: NexafsBrowseContributorUser[] = [];
  for (const u of raw) {
    if (!u || typeof u !== "object") continue;
    const o = u as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id : "";
    if (!id) continue;
    out.push({
      id,
      name: typeof o.name === "string" ? o.name : null,
      email: null,
      image: typeof o.image === "string" ? o.image : null,
      orcid: typeof o.orcid === "string" ? o.orcid : null,
    });
  }
  return out;
}

function parseLinkedPublicationsJson(
  raw: unknown,
): NexafsBrowseLinkedPublication[] {
  if (!Array.isArray(raw)) return [];
  const out: NexafsBrowseLinkedPublication[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const doi = typeof o.doi === "string" ? o.doi.trim() : "";
    if (!doi) continue;
    out.push({
      doi,
      title: typeof o.title === "string" ? o.title : "",
      journal: typeof o.journal === "string" ? o.journal : null,
      year: typeof o.year === "number" && Number.isFinite(o.year) ? o.year : null,
      authors: o.authors ?? null,
    });
  }
  return out;
}

export function mapNexafsBrowseGroupRow(
  row: NexafsBrowseGroupRow,
): NexafsBrowseGroupDto {
  const fav =
    typeof row.molecule_favorite_count === "bigint"
      ? Number(row.molecule_favorite_count)
      : row.molecule_favorite_count;
  return {
    experimentId: row.experiment_id,
    favoriteCount: Number(row.experiment_favorite_count),
    userHasFavorited: row.user_has_favorited,
    createdat: row.createdat,
    experimenttype: row.experimenttype,
    polarizationCount: Number(row.polarization_geometry_count),
    linkedPublications: parseLinkedPublicationsJson(row.linked_publications_json),
    ingestVerified: Boolean(row.ingest_verified),
    contributorLabels: row.contributor_labels,
    contributorUsers: parseContributorUsers(row.contributor_users),
    molecule: {
      id: row.molecule_id,
      displayName: row.molecule_display_name,
      iupacname: row.iupacname,
      chemicalformula: row.chemicalformula,
      imageurl: row.imageurl,
      inchi: row.inchi,
      smiles: row.smiles,
      casNumber: row.cas_number,
      pubChemCid: row.pubchem_cid,
      favoriteCount: Number.isFinite(fav) ? fav : 0,
    },
    edge: { targetatom: row.targetatom, corestate: row.corestate },
    instrument: {
      name: row.instrument_name,
      facilityName: row.facility_name,
    },
    datasetMetrics: buildNexafsBrowseDatasetMetricsCardModel(
      row.experiment_metrics_header_json,
      row.experiment_metrics_channels_json,
    ),
  };
}

export async function fetchNexafsBrowseGrouped(
  db: PrismaClient,
  args: {
    viewerUserId?: string | null;
    filters: NexafsBrowseGroupFilters;
    searchQuery: string | null;
    sortBy: NexafsBrowseSortKey;
    limit: number;
    offset: number;
  },
): Promise<{ groups: NexafsBrowseGroupDto[]; total: number }> {
  const whereSql = buildNexafsBrowseWhereSql(args.filters, args.searchQuery);
  const orderBySql = buildNexafsBrowseOrderBySql(args.sortBy);
  const viewerUserId = args.viewerUserId ?? null;
  const polarizationGeometryCountSql = Prisma.sql`(
        SELECT COUNT(*)::bigint
        FROM (
          SELECT DISTINCT t.polardeg, t.azimuthdeg
          FROM (
            SELECT p.polardeg, p.azimuthdeg
            FROM spectrumpoints sp
            INNER JOIN polarizations p ON p.id = sp.polarizationid
            WHERE sp.experimentid = b.experiment_id
              AND sp.polarizationid IS NOT NULL
            UNION
            SELECT p.polardeg, p.azimuthdeg
            FROM polarizations p
            WHERE p.id = b.canonical_polarization_id
          ) t
        ) u
      ) AS polarization_geometry_count`;

  const countRows = await db.$queryRaw<Array<{ cnt: bigint }>>`
    SELECT COUNT(*)::bigint AS cnt
    FROM experiments e
    INNER JOIN samples s ON s.id = e.sampleid
    INNER JOIN molecules m ON m.id = s.moleculeid
    INNER JOIN edges ed ON ed.id = e.edgeid
    INNER JOIN instruments i ON i.id = e.instrumentid
    LEFT JOIN facilities f ON f.id = i.facilityid
    WHERE ${whereSql}
  `;

  const rows = await db.$queryRaw<NexafsBrowseGroupRow[]>`
    WITH base AS (
      SELECT
        e.id AS experiment_id,
        e.polarizationid AS canonical_polarization_id,
        COALESCE(
          NULLIF(to_jsonb(eq) ->> 'favorites', '')::bigint,
          NULLIF(to_jsonb(eq) ->> 'upvotes', '')::bigint,
          0
        ) AS experiment_favorite_count,
        EXISTS (
          SELECT 1
          FROM experiment_favorites ef
          WHERE ef.experiment_id = e.id
            AND ef.user_id = ${viewerUserId}::uuid
        ) AS user_has_favorited,
        e.createdat,
        e.createdby,
        e.experimenttype,
        m.id AS molecule_id,
        COALESCE(ms_first.synonym, m.iupacname) AS molecule_display_name,
        m.iupacname,
        m.chemicalformula,
        m.imageurl,
        m.inchi,
        m.smiles,
        m.casnumber AS cas_number,
        m.pubchemcid AS pubchem_cid,
        m.favorite_count AS molecule_favorite_count,
        m.view_count AS molecule_view_count,
        ed.targetatom,
        ed.corestate,
        i.name AS instrument_name,
        f.name AS facility_name,
        (e.validation_summary IS NOT NULL) AS ingest_verified
      FROM experiments e
      INNER JOIN samples s ON s.id = e.sampleid
      INNER JOIN molecules m ON m.id = s.moleculeid
      LEFT JOIN LATERAL (
        SELECT ms.synonym
        FROM moleculesynonyms ms
        WHERE ms.moleculeid = m.id
        ORDER BY ms."order" ASC NULLS LAST, ms.synonym ASC
        LIMIT 1
      ) ms_first ON TRUE
      INNER JOIN edges ed ON ed.id = e.edgeid
      INNER JOIN instruments i ON i.id = e.instrumentid
      LEFT JOIN facilities f ON f.id = i.facilityid
      LEFT JOIN experimentquality eq ON eq.experimentid = e.id
      WHERE ${whereSql}
    ),
    enriched AS (
      SELECT
        b.experiment_id,
        b.canonical_polarization_id,
        b.experiment_favorite_count,
        b.user_has_favorited,
        b.createdat,
        b.createdby,
        b.experimenttype,
        b.molecule_id,
        b.molecule_display_name,
        b.iupacname,
        b.chemicalformula,
        b.imageurl,
        b.inchi,
        b.smiles,
        b.cas_number,
        b.pubchem_cid,
        b.molecule_favorite_count,
        b.molecule_view_count,
        b.targetatom,
        b.corestate,
        b.instrument_name,
        b.facility_name,
        b.ingest_verified,
        (
          SELECT COUNT(*)::bigint
          FROM experimentpublications ep
          WHERE ep.experimentid = b.experiment_id
        ) AS publication_link_count,
        (
          SELECT COALESCE(
            json_agg(
              json_build_object(
                'doi', pub.doi,
                'title', pub.title,
                'journal', pub.journal,
                'year', pub.year,
                'authors', pub.authors
              )
              ORDER BY pub.year DESC NULLS LAST, pub.title ASC
            ),
            '[]'::json
          )
          FROM experimentpublications ep
          INNER JOIN publications pub ON pub.id = ep.publicationid
          WHERE ep.experimentid = b.experiment_id
        ) AS linked_publications_json,
        (
          SELECT string_agg(sub.n, ' | ' ORDER BY sub.n)
          FROM (
            SELECT DISTINCT u.name AS n
            FROM (
              SELECT DISTINCT trim(uu.uid) AS uid
              FROM experiments e2
              LEFT JOIN LATERAL unnest(COALESCE(e2.collected_by_user_ids, ARRAY[]::text[])) AS uu(uid) ON TRUE
              WHERE e2.id = b.experiment_id
              UNION
              SELECT e2.createdby::text AS uid
              FROM experiments e2
              WHERE e2.id = b.experiment_id
                AND e2.createdby IS NOT NULL
            ) t
            INNER JOIN "next_auth"."user" u
              ON u.id = CASE
                WHEN trim(t.uid) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
                  THEN trim(t.uid)::uuid
                ELSE NULL
              END
          ) sub
          WHERE sub.n IS NOT NULL AND trim(sub.n) <> ''
        ) AS contributor_labels,
        (
          SELECT COALESCE(
            json_agg(
              json_build_object(
                'id', u.id::text,
                'name', u.name,
                'image', u.image,
                'orcid', u.orcid
              )
              ORDER BY u.name NULLS LAST
            ),
            '[]'::json
          )
          FROM (
            SELECT DISTINCT u.id, u.name, u.image, u.orcid
            FROM (
              SELECT trim(uu.uid) AS uid
              FROM experiments e2
              LEFT JOIN LATERAL unnest(COALESCE(e2.collected_by_user_ids, ARRAY[]::text[])) AS uu(uid) ON TRUE
              WHERE e2.id = b.experiment_id
              UNION
              SELECT e2.createdby::text AS uid
              FROM experiments e2
              WHERE e2.id = b.experiment_id
                AND e2.createdby IS NOT NULL
            ) t
            INNER JOIN "next_auth"."user" u
              ON u.id = CASE
                WHEN trim(t.uid) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
                  THEN trim(t.uid)::uuid
                ELSE NULL
              END
          ) u
        ) AS contributor_users,
        (
          SELECT json_build_object(
            'quality_aggregate_score', em.quality_aggregate_score,
            'normalization_ranges_present', em.normalization_ranges_present,
            'has_error_bars', EXISTS (
              SELECT 1
              FROM spectrumpoints sp
              WHERE sp.experimentid = b.experiment_id
                AND (b.canonical_polarization_id IS NULL OR sp.polarizationid = b.canonical_polarization_id)
                AND sp.rawabserr IS NOT NULL
                AND sp.rawabserr = sp.rawabserr
                AND sp.rawabserr > '-Infinity'::double precision
                AND sp.rawabserr < 'Infinity'::double precision
            ),
            'minimum_spacing_ev', (
              SELECT MIN(d.delta_ev)
              FROM (
                SELECT
                  sp.energyev - LAG(sp.energyev) OVER (ORDER BY sp.energyev) AS delta_ev
                FROM spectrumpoints sp
                WHERE sp.experimentid = b.experiment_id
                  AND (b.canonical_polarization_id IS NULL OR sp.polarizationid = b.canonical_polarization_id)
                  AND sp.energyev = sp.energyev
                  AND sp.energyev > '-Infinity'::double precision
                  AND sp.energyev < 'Infinity'::double precision
                  AND sp.rawabs = sp.rawabs
                  AND sp.rawabs > '-Infinity'::double precision
                  AND sp.rawabs < 'Infinity'::double precision
              ) d
              WHERE d.delta_ev IS NOT NULL
                AND d.delta_ev > 0
            ),
            'spacing_distribution_hyperfine_pct', (
              SELECT COALESCE(
                100.0 * AVG(
                  CASE WHEN d.delta_ev < 0.1 THEN 1.0 ELSE 0.0 END
                ),
                0
              )
              FROM (
                SELECT
                  sp.energyev - LAG(sp.energyev) OVER (ORDER BY sp.energyev) AS delta_ev
                FROM spectrumpoints sp
                WHERE sp.experimentid = b.experiment_id
                  AND (b.canonical_polarization_id IS NULL OR sp.polarizationid = b.canonical_polarization_id)
                  AND sp.energyev = sp.energyev
                  AND sp.energyev > '-Infinity'::double precision
                  AND sp.energyev < 'Infinity'::double precision
                  AND sp.rawabs = sp.rawabs
                  AND sp.rawabs > '-Infinity'::double precision
                  AND sp.rawabs < 'Infinity'::double precision
              ) d
              WHERE d.delta_ev IS NOT NULL
                AND d.delta_ev > 0
            ),
            'spacing_distribution_good_pct', (
              SELECT COALESCE(
                100.0 * AVG(
                  CASE WHEN d.delta_ev >= 0.1 AND d.delta_ev < 1.0 THEN 1.0 ELSE 0.0 END
                ),
                0
              )
              FROM (
                SELECT
                  sp.energyev - LAG(sp.energyev) OVER (ORDER BY sp.energyev) AS delta_ev
                FROM spectrumpoints sp
                WHERE sp.experimentid = b.experiment_id
                  AND (b.canonical_polarization_id IS NULL OR sp.polarizationid = b.canonical_polarization_id)
                  AND sp.energyev = sp.energyev
                  AND sp.energyev > '-Infinity'::double precision
                  AND sp.energyev < 'Infinity'::double precision
                  AND sp.rawabs = sp.rawabs
                  AND sp.rawabs > '-Infinity'::double precision
                  AND sp.rawabs < 'Infinity'::double precision
              ) d
              WHERE d.delta_ev IS NOT NULL
                AND d.delta_ev > 0
            ),
            'spacing_distribution_fair_pct', (
              SELECT COALESCE(
                100.0 * AVG(
                  CASE WHEN d.delta_ev >= 1.0 AND d.delta_ev <= 5.0 THEN 1.0 ELSE 0.0 END
                ),
                0
              )
              FROM (
                SELECT
                  sp.energyev - LAG(sp.energyev) OVER (ORDER BY sp.energyev) AS delta_ev
                FROM spectrumpoints sp
                WHERE sp.experimentid = b.experiment_id
                  AND (b.canonical_polarization_id IS NULL OR sp.polarizationid = b.canonical_polarization_id)
                  AND sp.energyev = sp.energyev
                  AND sp.energyev > '-Infinity'::double precision
                  AND sp.energyev < 'Infinity'::double precision
                  AND sp.rawabs = sp.rawabs
                  AND sp.rawabs > '-Infinity'::double precision
                  AND sp.rawabs < 'Infinity'::double precision
              ) d
              WHERE d.delta_ev IS NOT NULL
                AND d.delta_ev > 0
            ),
            'spacing_distribution_poor_pct', (
              SELECT COALESCE(
                100.0 * AVG(
                  CASE WHEN d.delta_ev > 5.0 THEN 1.0 ELSE 0.0 END
                ),
                0
              )
              FROM (
                SELECT
                  sp.energyev - LAG(sp.energyev) OVER (ORDER BY sp.energyev) AS delta_ev
                FROM spectrumpoints sp
                WHERE sp.experimentid = b.experiment_id
                  AND (b.canonical_polarization_id IS NULL OR sp.polarizationid = b.canonical_polarization_id)
                  AND sp.energyev = sp.energyev
                  AND sp.energyev > '-Infinity'::double precision
                  AND sp.energyev < 'Infinity'::double precision
                  AND sp.rawabs = sp.rawabs
                  AND sp.rawabs > '-Infinity'::double precision
                  AND sp.rawabs < 'Infinity'::double precision
              ) d
              WHERE d.delta_ev IS NOT NULL
                AND d.delta_ev > 0
            ),
            'spacing_distribution_mean_ev', (
              SELECT AVG(d.delta_ev)
              FROM (
                SELECT
                  sp.energyev - LAG(sp.energyev) OVER (ORDER BY sp.energyev) AS delta_ev
                FROM spectrumpoints sp
                WHERE sp.experimentid = b.experiment_id
                  AND (b.canonical_polarization_id IS NULL OR sp.polarizationid = b.canonical_polarization_id)
                  AND sp.energyev = sp.energyev
                  AND sp.energyev > '-Infinity'::double precision
                  AND sp.energyev < 'Infinity'::double precision
                  AND sp.rawabs = sp.rawabs
                  AND sp.rawabs > '-Infinity'::double precision
                  AND sp.rawabs < 'Infinity'::double precision
              ) d
              WHERE d.delta_ev IS NOT NULL
                AND d.delta_ev > 0
            ),
            'spacing_distribution_p75_ev', (
              SELECT percentile_cont(0.75) WITHIN GROUP (ORDER BY d.delta_ev)
              FROM (
                SELECT
                  sp.energyev - LAG(sp.energyev) OVER (ORDER BY sp.energyev) AS delta_ev
                FROM spectrumpoints sp
                WHERE sp.experimentid = b.experiment_id
                  AND (b.canonical_polarization_id IS NULL OR sp.polarizationid = b.canonical_polarization_id)
                  AND sp.energyev = sp.energyev
                  AND sp.energyev > '-Infinity'::double precision
                  AND sp.energyev < 'Infinity'::double precision
                  AND sp.rawabs = sp.rawabs
                  AND sp.rawabs > '-Infinity'::double precision
                  AND sp.rawabs < 'Infinity'::double precision
              ) d
              WHERE d.delta_ev IS NOT NULL
                AND d.delta_ev > 0
            ),
            'spacing_distribution_p75_bucket_progress_pct', (
              SELECT
                CASE
                  WHEN stats.p75_ev IS NULL THEN NULL
                  WHEN stats.p75_ev < 0.1 THEN
                    100.0 * COALESCE(
                      (
                        SELECT AVG(
                          CASE WHEN d.delta_ev <= stats.p75_ev THEN 1.0 ELSE 0.0 END
                        )
                        FROM (
                          SELECT sp.energyev - LAG(sp.energyev) OVER (ORDER BY sp.energyev) AS delta_ev
                          FROM spectrumpoints sp
                          WHERE sp.experimentid = b.experiment_id
                            AND (b.canonical_polarization_id IS NULL OR sp.polarizationid = b.canonical_polarization_id)
                            AND sp.energyev = sp.energyev
                            AND sp.energyev > '-Infinity'::double precision
                            AND sp.energyev < 'Infinity'::double precision
                            AND sp.rawabs = sp.rawabs
                            AND sp.rawabs > '-Infinity'::double precision
                            AND sp.rawabs < 'Infinity'::double precision
                        ) d
                        WHERE d.delta_ev IS NOT NULL
                          AND d.delta_ev > 0
                          AND d.delta_ev < 0.1
                      ),
                      0
                    )
                  WHEN stats.p75_ev < 1 THEN
                    100.0 * COALESCE(
                      (
                        SELECT AVG(
                          CASE WHEN d.delta_ev <= stats.p75_ev THEN 1.0 ELSE 0.0 END
                        )
                        FROM (
                          SELECT sp.energyev - LAG(sp.energyev) OVER (ORDER BY sp.energyev) AS delta_ev
                          FROM spectrumpoints sp
                          WHERE sp.experimentid = b.experiment_id
                            AND (b.canonical_polarization_id IS NULL OR sp.polarizationid = b.canonical_polarization_id)
                            AND sp.energyev = sp.energyev
                            AND sp.energyev > '-Infinity'::double precision
                            AND sp.energyev < 'Infinity'::double precision
                            AND sp.rawabs = sp.rawabs
                            AND sp.rawabs > '-Infinity'::double precision
                            AND sp.rawabs < 'Infinity'::double precision
                        ) d
                        WHERE d.delta_ev IS NOT NULL
                          AND d.delta_ev >= 0.1
                          AND d.delta_ev < 1.0
                      ),
                      0
                    )
                  WHEN stats.p75_ev <= 5 THEN
                    100.0 * COALESCE(
                      (
                        SELECT AVG(
                          CASE WHEN d.delta_ev <= stats.p75_ev THEN 1.0 ELSE 0.0 END
                        )
                        FROM (
                          SELECT sp.energyev - LAG(sp.energyev) OVER (ORDER BY sp.energyev) AS delta_ev
                          FROM spectrumpoints sp
                          WHERE sp.experimentid = b.experiment_id
                            AND (b.canonical_polarization_id IS NULL OR sp.polarizationid = b.canonical_polarization_id)
                            AND sp.energyev = sp.energyev
                            AND sp.energyev > '-Infinity'::double precision
                            AND sp.energyev < 'Infinity'::double precision
                            AND sp.rawabs = sp.rawabs
                            AND sp.rawabs > '-Infinity'::double precision
                            AND sp.rawabs < 'Infinity'::double precision
                        ) d
                        WHERE d.delta_ev IS NOT NULL
                          AND d.delta_ev >= 1.0
                          AND d.delta_ev <= 5.0
                      ),
                      0
                    )
                  ELSE
                    100.0 * COALESCE(
                      (
                        SELECT AVG(
                          CASE WHEN d.delta_ev <= stats.p75_ev THEN 1.0 ELSE 0.0 END
                        )
                        FROM (
                          SELECT sp.energyev - LAG(sp.energyev) OVER (ORDER BY sp.energyev) AS delta_ev
                          FROM spectrumpoints sp
                          WHERE sp.experimentid = b.experiment_id
                            AND (b.canonical_polarization_id IS NULL OR sp.polarizationid = b.canonical_polarization_id)
                            AND sp.energyev = sp.energyev
                            AND sp.energyev > '-Infinity'::double precision
                            AND sp.energyev < 'Infinity'::double precision
                            AND sp.rawabs = sp.rawabs
                            AND sp.rawabs > '-Infinity'::double precision
                            AND sp.rawabs < 'Infinity'::double precision
                        ) d
                        WHERE d.delta_ev IS NOT NULL
                          AND d.delta_ev > 5.0
                      ),
                      0
                    )
                END
              FROM (
                SELECT percentile_cont(0.75) WITHIN GROUP (ORDER BY d.delta_ev) AS p75_ev
                FROM (
                  SELECT
                    sp.energyev - LAG(sp.energyev) OVER (ORDER BY sp.energyev) AS delta_ev
                  FROM spectrumpoints sp
                  WHERE sp.experimentid = b.experiment_id
                    AND (b.canonical_polarization_id IS NULL OR sp.polarizationid = b.canonical_polarization_id)
                    AND sp.energyev = sp.energyev
                    AND sp.energyev > '-Infinity'::double precision
                    AND sp.energyev < 'Infinity'::double precision
                    AND sp.rawabs = sp.rawabs
                    AND sp.rawabs > '-Infinity'::double precision
                    AND sp.rawabs < 'Infinity'::double precision
                ) d
                WHERE d.delta_ev IS NOT NULL
                  AND d.delta_ev > 0
              ) stats
            )
          )
          FROM experiment_metrics em
          WHERE em.experiment_id = b.experiment_id
        ) AS experiment_metrics_header_json,
        (
          SELECT em.quality_aggregate_score
          FROM experiment_metrics em
          WHERE em.experiment_id = b.experiment_id
        ) AS dataset_quality_score,
        (
          SELECT COALESCE(
            json_agg(t.row_json ORDER BY t.ord),
            '[]'::json
          )
          FROM (
            SELECT
              CASE emc.channel
                WHEN 'rawabs' THEN 1
                WHEN 'od' THEN 2
                WHEN 'massabsorption' THEN 3
                WHEN 'beta' THEN 4
                ELSE 99
              END AS ord,
              json_build_object(
                'channel', emc.channel,
                'point_spacing_ev', emc.point_spacing_ev,
                'snr', emc.snr,
                'normalization_target_distance', emc.normalization_target_distance,
                'channel_contribution_score', emc.channel_contribution_score
              ) AS row_json
            FROM experiment_metrics_channel emc
            WHERE emc.experiment_id = b.experiment_id
          ) t
        ) AS experiment_metrics_channels_json,
        ${polarizationGeometryCountSql}
      FROM base b
    )
    SELECT * FROM enriched g
    ${orderBySql}
    LIMIT ${args.limit} OFFSET ${args.offset}
  `;

  const total = Number(countRows[0]?.cnt ?? 0n);

  return {
    groups: rows.map(mapNexafsBrowseGroupRow),
    total,
  };
}
