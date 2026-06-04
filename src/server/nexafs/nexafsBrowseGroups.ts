import { Prisma } from "~/prisma/client";
import type { ExperimentType, PrismaClient } from "~/prisma/client";
import {
  buildNexafsBrowseDatasetMetricsCardModel,
  type NexafsBrowseDatasetMetricsCardModel,
} from "~/lib/nexafs-dataset-metric-display-model";
import type {
  NexafsBrowseLinkedPublication,
  NexafsBrowseSourcePublication,
} from "~/types/nexafs-browse";
import { normalizeStoredContributorRole } from "~/lib/datacite-contributor-types";
import {
  dedupeNexafsContributorsByOrcid,
  type NexafsContributorPerson,
  type DataCiteContributorType,
} from "~/lib/nexafs-contributors";

export type NexafsBrowseGroupFilters = {
  /** @deprecated Use `moleculeIds` for multi-select. Normalized to a one-element array internally. */
  moleculeId?: string;
  /** @deprecated Use `edgeIds` for multi-select. Normalized to a one-element array internally. */
  edgeId?: string;
  /** @deprecated Use `instrumentIds` for multi-select. Normalized to a one-element array internally. */
  instrumentId?: string;
  /** Multi-select molecule UUIDs; OR-combined within field. */
  moleculeIds?: string[];
  /** Multi-select edge UUIDs; OR-combined within field. */
  edgeIds?: string[];
  /** Multi-select instrument IDs; OR-combined within field. */
  instrumentIds?: string[];
  /** Multi-select contributor ORCID iDs; OR-combined within field. */
  contributorOrcids?: string[];
  experimentType?: ExperimentType;
  verifiedOnly?: boolean;
  verificationSource?: "either" | "publication" | "atlas";
  /** @deprecated Use `contributorOrcids`. Single ORCID iD for backward compatibility. */
  contributorUserId?: string;
  /** Normalized DOI exact match on `experiment_metrics.original_data_doi`. */
  sourcePaperDoi?: string;
};

export function buildNexafsBrowseWhereSql(
  filters: NexafsBrowseGroupFilters,
  searchQuery: string | null,
): Prisma.Sql {
  const parts: Prisma.Sql[] = [];

  const moleculeIds = filters.moleculeIds ?? (filters.moleculeId ? [filters.moleculeId] : []);
  const edgeIds = filters.edgeIds ?? (filters.edgeId ? [filters.edgeId] : []);
  const instrumentIds = filters.instrumentIds ?? (filters.instrumentId ? [filters.instrumentId] : []);
  const contributorOrcids = filters.contributorOrcids ?? (filters.contributorUserId ? [filters.contributorUserId] : []);

  if (moleculeIds.length === 1) {
    parts.push(Prisma.sql`s.moleculeid = ${moleculeIds[0]}::uuid`);
  } else if (moleculeIds.length > 1) {
    const joined = Prisma.join(moleculeIds.map((id) => Prisma.sql`${id}::uuid`));
    parts.push(Prisma.sql`s.moleculeid = ANY(ARRAY[${joined}])`);
  }

  if (edgeIds.length === 1) {
    parts.push(Prisma.sql`e.edgeid = ${edgeIds[0]}::uuid`);
  } else if (edgeIds.length > 1) {
    const joined = Prisma.join(edgeIds.map((id) => Prisma.sql`${id}::uuid`));
    parts.push(Prisma.sql`e.edgeid = ANY(ARRAY[${joined}])`);
  }

  if (instrumentIds.length === 1) {
    parts.push(Prisma.sql`e.instrumentid = ${instrumentIds[0]}`);
  } else if (instrumentIds.length > 1) {
    const joined = Prisma.join(instrumentIds.map((id) => Prisma.sql`${id}`));
    parts.push(Prisma.sql`e.instrumentid = ANY(ARRAY[${joined}])`);
  }

  if (filters.experimentType) {
    parts.push(
      Prisma.sql`e.experimenttype = ${filters.experimentType}::"ExperimentType"`,
    );
  }

  if (contributorOrcids.length === 1) {
    parts.push(Prisma.sql`EXISTS (
      SELECT 1
      FROM experiment_contributors ecf
      WHERE ecf.experiment_id = e.id
        AND ecf.orcid_id = ${contributorOrcids[0]}
    )`);
  } else if (contributorOrcids.length > 1) {
    const joined = Prisma.join(contributorOrcids.map((o) => Prisma.sql`${o}`));
    parts.push(Prisma.sql`EXISTS (
      SELECT 1
      FROM experiment_contributors ecf
      WHERE ecf.experiment_id = e.id
        AND ecf.orcid_id = ANY(ARRAY[${joined}])
    )`);
  }

  if (filters.sourcePaperDoi) {
    parts.push(Prisma.sql`EXISTS (
      SELECT 1
      FROM experimentpublications ep_doi
      INNER JOIN publications pub_doi ON pub_doi.id = ep_doi.publicationid
      WHERE ep_doi.experimentid = e.id
        AND ep_doi.role = 'source'
        AND pub_doi.doi = ${filters.sourcePaperDoi}
    )`);
  }
  if (filters.verifiedOnly) {
    if (filters.verificationSource === "publication") {
      parts.push(Prisma.sql`EXISTS (
        SELECT 1
        FROM experiment_publications epv
        WHERE epv.experiment_id = e.id
      )`);
    } else if (filters.verificationSource === "atlas") {
      parts.push(
        Prisma.sql`(COALESCE(vs.validation_summary->>'atlasTeamVerified', 'false') = 'true')`,
      );
    } else {
      parts.push(Prisma.sql`(
        COALESCE(vs.validation_summary->>'atlasTeamVerified', 'false') = 'true'
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
  source_publications_json: unknown;
  ingest_verified: boolean;
  experiment_metrics_header_json: unknown;
  experiment_metrics_channels_json: unknown;
  dataset_quality_score: number | null;
};

export type NexafsBrowseContributorUser = NexafsContributorPerson;

export type NexafsBrowseGroupDto = {
  experimentId: string;
  favoriteCount: number;
  userHasFavorited: boolean;
  createdat: Date;
  experimenttype: ExperimentType | null;
  polarizationCount: number;
  linkedPublications: NexafsBrowseLinkedPublication[];
  sourcePublications: NexafsBrowseSourcePublication[];
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

function parseContributorRole(raw: unknown): DataCiteContributorType | null {
  if (typeof raw !== "string") return null;
  return normalizeStoredContributorRole(raw);
}

function parseContributorUsers(raw: unknown): NexafsBrowseContributorUser[] {
  if (!raw || !Array.isArray(raw)) return [];
  const out: NexafsBrowseContributorUser[] = [];
  for (const u of raw) {
    if (!u || typeof u !== "object") continue;
    const o = u as Record<string, unknown>;
    const orcid = typeof o.orcid === "string" ? o.orcid.trim() : "";
    if (!orcid) continue;
    const userIdRaw = typeof o.userId === "string" ? o.userId.trim() : "";
    const userId = userIdRaw.length > 0 ? userIdRaw : null;
    const isClaimed = Boolean(o.isClaimed);
    const isPublicProfileVisible = Boolean(o.isPublicProfileVisible);
    const role = parseContributorRole(o.role);
    out.push({
      id: orcid,
      userId,
      orcid,
      name:
        typeof o.name === "string" && isPublicProfileVisible
          ? o.name
          : null,
      image:
        typeof o.image === "string" && isPublicProfileVisible
          ? o.image
          : null,
      isClaimed,
      isPublicProfileVisible,
      roles: role ? [role] : [],
    });
  }
  return dedupeNexafsContributorsByOrcid(out);
}

function parsePublicationsJson(
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
    linkedPublications: parsePublicationsJson(row.linked_publications_json),
    sourcePublications: parsePublicationsJson(row.source_publications_json),
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
            AND ef.user_id = ${viewerUserId}
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
        (COALESCE(e.validation_summary->>'atlasTeamVerified', 'false') = 'true') AS ingest_verified
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
            AND ep.role <> 'source'
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
            AND ep.role <> 'source'
        ) AS linked_publications_json,
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
            AND ep.role = 'source'
        ) AS source_publications_json,
        (
          SELECT string_agg(sub.n, ' | ' ORDER BY sub.n)
          FROM (
            SELECT DISTINCT
              CASE
                WHEN ec.claim_status = 'accepted'
                  AND ec.is_public_profile_visible
                  AND u.name IS NOT NULL
                  AND trim(u.name) <> '' THEN u.name
                WHEN ec.claim_status = 'pending'
                  AND (
                    COALESCE(u.attribution_display_preferences->>'pending', 'orcid_only') IN ('name_only', 'name_and_avatar')
                    OR EXISTS (
                      SELECT 1
                      FROM next_auth.user_app_role uar
                      INNER JOIN next_auth.app_role ar ON ar.id = uar.role_id
                      WHERE uar.user_id = ec.orcid_id
                        AND ar.slug IN ('administrator', 'maintainer')
                    )
                  )
                  AND u.name IS NOT NULL
                  AND trim(u.name) <> '' THEN u.name
                ELSE ec.orcid_id
              END AS n
            FROM experiment_contributors ec
            LEFT JOIN next_auth."user" u
              ON u.id = ec.user_id
            WHERE ec.experiment_id = b.experiment_id
              AND ec.claim_status NOT IN ('declined', 'unclaimed')
          ) sub
          WHERE sub.n IS NOT NULL AND trim(sub.n) <> ''
        ) AS contributor_labels,
        (
          SELECT COALESCE(
            json_agg(
              json_build_object(
                'orcid', ec.orcid_id,
                'userId', ec.user_id,
                'role', ec.role,
                'claimStatus', ec.claim_status,
                'name', CASE
                  WHEN ec.claim_status = 'accepted'
                    AND ec.is_public_profile_visible THEN u.name
                  WHEN ec.claim_status = 'pending'
                    AND (
                      COALESCE(u.attribution_display_preferences->>'pending', 'orcid_only') IN ('name_only', 'name_and_avatar')
                      OR EXISTS (
                        SELECT 1
                        FROM next_auth.user_app_role uar
                        INNER JOIN next_auth.app_role ar ON ar.id = uar.role_id
                        WHERE uar.user_id = ec.orcid_id
                          AND ar.slug IN ('administrator', 'maintainer')
                      )
                    ) THEN u.name
                  ELSE NULL
                END,
                'image', CASE
                  WHEN ec.claim_status = 'accepted'
                    AND ec.is_public_profile_visible THEN u.image
                  WHEN ec.claim_status = 'pending'
                    AND EXISTS (
                      SELECT 1
                      FROM next_auth.user_app_role uar
                      INNER JOIN next_auth.app_role ar ON ar.id = uar.role_id
                      WHERE uar.user_id = ec.orcid_id
                        AND ar.slug IN ('administrator', 'maintainer')
                    ) THEN u.image
                  ELSE NULL
                END,
                'isClaimed', ec.claim_status = 'accepted',
                'isPublicProfileVisible', CASE
                  WHEN ec.claim_status = 'accepted' THEN ec.is_public_profile_visible
                  WHEN ec.claim_status = 'pending'
                    AND EXISTS (
                      SELECT 1
                      FROM next_auth.user_app_role uar
                      INNER JOIN next_auth.app_role ar ON ar.id = uar.role_id
                      WHERE uar.user_id = ec.orcid_id
                        AND ar.slug IN ('administrator', 'maintainer')
                    ) THEN true
                  ELSE false
                END
              )
              ORDER BY
                CASE
                  WHEN ec.claim_status = 'accepted'
                    AND ec.is_public_profile_visible
                    AND u.name IS NOT NULL THEN u.name
                  WHEN ec.claim_status = 'pending'
                    AND COALESCE(u.attribution_display_preferences->>'pending', 'orcid_only') IN ('name_only', 'name_and_avatar')
                    AND u.name IS NOT NULL THEN u.name
                  ELSE ec.orcid_id
                END
            ),
            '[]'::json
          )
          FROM experiment_contributors ec
          LEFT JOIN next_auth."user" u
            ON u.id = ec.user_id
          WHERE ec.experiment_id = b.experiment_id
            AND ec.claim_status NOT IN ('declined', 'unclaimed')
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
