import { Prisma } from "@prisma/client";
import type { ExperimentType, PrismaClient } from "@prisma/client";

export type NexafsBrowseGroupFilters = {
  moleculeId?: string;
  edgeId?: string;
  instrumentId?: string;
  experimentType?: ExperimentType;
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

export type NexafsBrowseSortKey =
  | "newest"
  | "upload"
  | "molecule"
  | "edge"
  | "instrument";

export function buildNexafsBrowseOrderBySql(
  sortBy: NexafsBrowseSortKey,
): Prisma.Sql {
  switch (sortBy) {
    case "newest":
    case "upload":
      return Prisma.sql`ORDER BY g.createdat DESC`;
    case "molecule":
      return Prisma.sql`ORDER BY g.molecule_display_name ASC`;
    case "edge":
      return Prisma.sql`ORDER BY g.targetatom ASC, g.corestate ASC`;
    case "instrument":
      return Prisma.sql`ORDER BY g.instrument_name ASC`;
    default:
      return Prisma.sql`ORDER BY g.createdat DESC`;
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
  targetatom: string;
  corestate: string;
  instrument_name: string;
  facility_name: string | null;
  contributor_labels: string | null;
  contributor_users: unknown;
  polarization_geometry_count: bigint;
  quality_comment_count: bigint;
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
  commentCount: number;
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
    commentCount: Number(row.quality_comment_count),
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
        ed.targetatom,
        ed.corestate,
        i.name AS instrument_name,
        f.name AS facility_name,
        CASE
          WHEN eq.comments IS NULL THEN 0::bigint
          WHEN jsonb_typeof(eq.comments) = 'array' THEN jsonb_array_length(eq.comments)::bigint
          ELSE 0::bigint
        END AS quality_comment_count
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
        b.targetatom,
        b.corestate,
        b.instrument_name,
        b.facility_name,
        b.quality_comment_count,
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
