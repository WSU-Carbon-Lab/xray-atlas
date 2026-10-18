/**
 * Molecule-page NEXAFS dataset cards for `/molecules/[id]`.
 *
 * Loads the same `NexafsBrowseGroupDto` page shape as `getCachedNexafsBrowseList`
 * for one molecule, using stored experiment metrics and a polarization-id
 * geometry count. Spectrum energy and absorption columns stay out of this
 * read. Session favorite flags stay with `overlayNexafsBrowseFavoriteFlags`.
 * `/browse/nexafs` keeps `fetchNexafsBrowseGrouped`.
 */

import { Prisma, type PrismaClient } from "~/prisma/client";
import { cachePublicCatalogRead } from "~/server/cache/public-catalog-cache";
import {
  buildNexafsBrowseOrderBySql,
  mapNexafsBrowseGroupRow,
  type NexafsBrowseGroupDto,
  type NexafsBrowseGroupRow,
  type NexafsBrowseSortKey,
} from "~/server/nexafs/nexafsBrowseGroups";

const MOLECULE_PAGE_NEXAFS_CARDS_REVALIDATE_SECONDS = 60;

/**
 * Anonymous molecule-page card query.
 *
 * `moleculeId` is the molecule UUID stored on `samples.moleculeid`. `limit`
 * is the maximum groups in the page and `offset` is the number of ordered
 * groups skipped; both are non-negative integers. `sortBy` selects the same
 * column order as `buildNexafsBrowseOrderBySql`.
 */
export interface MoleculePageNexafsCardQuery {
  moleculeId: string;
  limit: number;
  offset: number;
  sortBy: NexafsBrowseSortKey;
}

/**
 * One cached molecule-page card list.
 *
 * `groups` are `NexafsBrowseGroupDto` rows with `userHasFavorited` false.
 * `total` is the unpaged experiment count for the molecule. `createdat` is a
 * `Date` after cache revival.
 */
export interface MoleculePageNexafsCardPage {
  groups: NexafsBrowseGroupDto[];
  total: number;
}

/**
 * Builds the molecule-page catalog cache key.
 *
 * Prefix `molecule-page-nexafs-cards` keeps these entries off the
 * `nexafs-browse-list` key space. Segments are percent-encoded, then joined
 * with `:`.
 *
 * @param input Molecule UUID, sort, limit, and offset.
 * @returns Stable key beginning with `molecule-page-nexafs-cards`.
 */
function moleculePageNexafsCardsCacheKey(
  input: MoleculePageNexafsCardQuery,
): string {
  const segments = [
    "molecule-page-nexafs-cards",
    input.sortBy,
    String(input.limit),
    String(input.offset),
    input.moleculeId,
  ];
  return segments.map((segment) => encodeURIComponent(segment)).join(":");
}

/**
 * Restores `createdat` after the catalog cache JSON round-trip.
 *
 * A miss already holds `Date` instances. A hit stores `createdat` as an ISO
 * string; those groups are copied with a parsed `Date`.
 *
 * @param page Page returned by `cachePublicCatalogRead`.
 * @returns The same page when every `createdat` is already a `Date`.
 */
function reviveMoleculePageNexafsCardPage(
  page: MoleculePageNexafsCardPage,
): MoleculePageNexafsCardPage {
  let revived = false;
  const groups = page.groups.map((group) => {
    const raw = group.createdat as Date | string;
    if (raw instanceof Date) {
      return group;
    }
    const createdat = new Date(raw);
    if (Number.isNaN(createdat.getTime())) {
      return group;
    }
    revived = true;
    return { ...group, createdat };
  });
  if (!revived) {
    return page;
  }
  return { groups, total: page.total };
}

/**
 * Counts distinct `(polardeg, azimuthdeg)` pairs for one experiment.
 *
 * Polarization ids come from the experiment's canonical polarization and from
 * `spectrumpoints.polarizationid`. The spectrum subquery selects that id
 * column only.
 *
 * @param experimentIdSql Experiment UUID SQL expression (`e.id` or `b.experiment_id`).
 * @param canonicalPolarizationIdSql Canonical polarization UUID SQL expression.
 * @returns Scalar bigint subquery with no column alias.
 */
function polarizationGeometryCountExpr(
  experimentIdSql: Prisma.Sql,
  canonicalPolarizationIdSql: Prisma.Sql,
): Prisma.Sql {
  return Prisma.sql`(
    SELECT COUNT(DISTINCT (p.polardeg, p.azimuthdeg))::bigint
    FROM polarizations p
    INNER JOIN (
      SELECT DISTINCT sp.polarizationid AS polarization_id
      FROM spectrumpoints sp
      WHERE sp.experimentid = ${experimentIdSql}
        AND sp.polarizationid IS NOT NULL
      UNION
      SELECT ${canonicalPolarizationIdSql} AS polarization_id
      WHERE ${canonicalPolarizationIdSql} IS NOT NULL
    ) geometry_ids ON geometry_ids.polarization_id = p.id
  )`;
}

/**
 * Adds the sort column that `buildNexafsBrowseOrderBySql` reads before LIMIT.
 *
 * Quality, favorites, views, name, and newest already have their columns on
 * the filtered row. Geometries and publications need their aggregates before
 * the page limit.
 *
 * @param sortBy Browse sort key.
 * @returns A leading-comma select item, or empty SQL.
 */
function moleculePageSortPreLimitSql(sortBy: NexafsBrowseSortKey): Prisma.Sql {
  switch (sortBy) {
    case "geometries":
      return Prisma.sql`,
        ${polarizationGeometryCountExpr(
          Prisma.raw("e.id"),
          Prisma.raw("e.polarizationid"),
        )} AS polarization_geometry_count`;
    case "publications":
      return Prisma.sql`,
        (
          SELECT COUNT(*)::bigint
          FROM experimentpublications ep_sort
          WHERE ep_sort.experimentid = e.id
            AND ep_sort.role <> 'source'
        ) AS publication_link_count`;
    case "quality":
    case "favorites":
    case "views":
    case "name":
    case "newest":
      return Prisma.empty;
    default: {
      const unreachable: never = sortBy;
      return unreachable;
    }
  }
}

/**
 * Reads one molecule's card page from Postgres.
 *
 * @param db Prisma client.
 * @param input Molecule UUID, page bounds, and sort key.
 * @returns Mapped groups with `userHasFavorited` false, plus the unpaged total.
 */
async function loadMoleculePageNexafsCards(
  db: PrismaClient,
  input: MoleculePageNexafsCardQuery,
): Promise<MoleculePageNexafsCardPage> {
  const orderBySql = buildNexafsBrowseOrderBySql(input.sortBy);
  const sortPreLimitSql = moleculePageSortPreLimitSql(input.sortBy);
  const pageGeometryCountSql = polarizationGeometryCountExpr(
    Prisma.raw("b.experiment_id"),
    Prisma.raw("b.canonical_polarization_id"),
  );

  const countQuery = db.$queryRaw<Array<{ cnt: bigint }>>`
    SELECT COUNT(*)::bigint AS cnt
    FROM experiments e
    INNER JOIN samples s ON s.id = e.sampleid
    INNER JOIN molecules m ON m.id = s.moleculeid
    INNER JOIN edges ed ON ed.id = e.edgeid
    INNER JOIN instruments i ON i.id = e.instrumentid
    WHERE s.moleculeid = ${input.moleculeId}::uuid
  `;

  const pageQuery = db.$queryRaw<NexafsBrowseGroupRow[]>`
    WITH filtered AS (
      SELECT
        e.id AS experiment_id,
        e.polarizationid AS canonical_polarization_id,
        COALESCE(
          NULLIF(to_jsonb(eq) ->> 'favorites', '')::bigint,
          NULLIF(to_jsonb(eq) ->> 'upvotes', '')::bigint,
          0
        ) AS experiment_favorite_count,
        FALSE AS user_has_favorited,
        e.createdat,
        e.createdby,
        e.experimenttype,
        m.id AS molecule_id,
        COALESCE(ms_first.synonym, m.iupacname) AS molecule_display_name,
        m.iupacname,
        m.chemicalformula,
        m.imageurl,
        m.casnumber AS cas_number,
        m.pubchemcid AS pubchem_cid,
        m.favorite_count AS molecule_favorite_count,
        m.view_count AS molecule_view_count,
        ed.targetatom,
        ed.corestate,
        i.name AS instrument_name,
        f.name AS facility_name,
        (COALESCE(e.validation_summary->>'atlasTeamVerified', 'false') = 'true') AS ingest_verified,
        e.atlas_dataset_id AS atlas_dataset_id,
        s.processmethod::text AS sample_process_method,
        s.substrate AS sample_substrate,
        s.patterninglayer AS sample_patterning_layer,
        s.solvent AS sample_solvent,
        s.thickness AS sample_thickness,
        s.molecularweight AS sample_molecular_weight,
        v.name AS sample_vendor_name,
        em_rank.quality_aggregate_score AS dataset_quality_score
        ${sortPreLimitSql}
      FROM experiments e
      INNER JOIN samples s ON s.id = e.sampleid
      INNER JOIN molecules m ON m.id = s.moleculeid
      LEFT JOIN vendors v ON v.id = s.vendorid
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
      LEFT JOIN experiment_metrics em_rank ON em_rank.experiment_id = e.id
      WHERE s.moleculeid = ${input.moleculeId}::uuid
    ),
    page AS (
      SELECT *
      FROM filtered g
      ${orderBySql}
      LIMIT ${input.limit} OFFSET ${input.offset}
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
        b.cas_number,
        b.pubchem_cid,
        b.molecule_favorite_count,
        b.molecule_view_count,
        b.targetatom,
        b.corestate,
        b.instrument_name,
        b.facility_name,
        b.ingest_verified,
        b.atlas_dataset_id,
        b.sample_process_method,
        b.sample_substrate,
        b.sample_patterning_layer,
        b.sample_solvent,
        b.sample_thickness,
        b.sample_molecular_weight,
        b.sample_vendor_name,
        (
          SELECT em.dataset_doi
          FROM experiment_metrics em
          WHERE em.experiment_id = b.experiment_id
        ) AS dataset_doi,
        (
          SELECT ezd.record_url
          FROM experiment_zenodo_deposits ezd
          WHERE ezd.experiment_id = b.experiment_id
        ) AS zenodo_record_url,
        (
          SELECT ezd.state::text
          FROM experiment_zenodo_deposits ezd
          WHERE ezd.experiment_id = b.experiment_id
        ) AS zenodo_deposit_state,
        (
          SELECT ezd.last_attempt_at
          FROM experiment_zenodo_deposits ezd
          WHERE ezd.experiment_id = b.experiment_id
        ) AS zenodo_last_attempt_at,
        (
          SELECT ezd.attempt_count
          FROM experiment_zenodo_deposits ezd
          WHERE ezd.experiment_id = b.experiment_id
        ) AS zenodo_attempt_count,
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
            'has_error_bars', COALESCE(
              (
                SELECT
                  emc_snr.snr IS NOT NULL
                  AND emc_snr.snr = emc_snr.snr
                  AND emc_snr.snr > '-Infinity'::double precision
                  AND emc_snr.snr < 'Infinity'::double precision
                FROM experiment_metrics_channel emc_snr
                WHERE emc_snr.experiment_id = em.experiment_id
                  AND emc_snr.channel = 'rawabs'
              ),
              false
            ),
            'minimum_spacing_ev', NULL,
            'spacing_distribution_hyperfine_pct', 0,
            'spacing_distribution_good_pct', 0,
            'spacing_distribution_fair_pct', 0,
            'spacing_distribution_poor_pct', 0,
            'spacing_distribution_mean_ev', NULL,
            'spacing_distribution_p75_ev', NULL,
            'spacing_distribution_p75_bucket_progress_pct', NULL
          )
          FROM experiment_metrics em
          WHERE em.experiment_id = b.experiment_id
        ) AS experiment_metrics_header_json,
        b.dataset_quality_score,
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
        ${pageGeometryCountSql} AS polarization_geometry_count
      FROM page b
    )
    SELECT * FROM enriched g
    ${orderBySql}
  `;

  const [countRows, rows] = await Promise.all([countQuery, pageQuery]);
  const total = Number(countRows[0]?.cnt ?? 0n);
  return {
    groups: rows.map(mapNexafsBrowseGroupRow),
    total,
  };
}

/**
 * Loads one molecule's NEXAFS dataset cards for the paper landing page.
 *
 * Returns `{ groups, total }` with the same `NexafsBrowseGroupDto` fields as
 * `experiments.browseList`. Every group has `userHasFavorited` false. Card
 * fields come from experiments, samples, molecules, edges, instruments,
 * facilities, vendors, experiment quality, `experiment_metrics`,
 * `experiment_metrics_channel`, publications, contributors, and Zenodo
 * deposits. Geometry is `COUNT(DISTINCT (polardeg, azimuthdeg))` over
 * polarization ids from `experiments.polarizationid` and from
 * `spectrumpoints.polarizationid`. Header JSON carries
 * `quality_aggregate_score`, `normalization_ranges_present`, and
 * `has_error_bars` (true when the stored `rawabs` `snr` is finite). Spacing
 * distribution percents are 0 and spacing quantiles are null so
 * `buildNexafsBrowseDatasetMetricsCardModel` uses stored `point_spacing_ev`.
 *
 * The anonymous page is cached for 60 seconds with tag `nexafs-browse` and
 * key prefix `molecule-page-nexafs-cards`. `createdat` is parsed back to a
 * `Date` after the cache JSON round-trip. The count and the page run together.
 *
 * @param db Prisma client used on a cache miss. The same client is closed
 * over for the cache lifetime.
 * @param input Molecule UUID, non-negative `limit` and `offset`, and
 * `NexafsBrowseSortKey`. A non-UUID `moleculeId` fails the Postgres cast.
 * @returns Cached page. Copy groups before setting `userHasFavorited`.
 * @throws Propagates Prisma and cache failures. Zero experiments resolve to
 * `{ groups: [], total: 0 }`.
 */
export function getCachedMoleculePageNexafsCards(
  db: PrismaClient,
  input: MoleculePageNexafsCardQuery,
): Promise<MoleculePageNexafsCardPage> {
  const loadCached = cachePublicCatalogRead(
    moleculePageNexafsCardsCacheKey(input),
    ["nexafs-browse"],
    () => loadMoleculePageNexafsCards(db, input),
    MOLECULE_PAGE_NEXAFS_CARDS_REVALIDATE_SECONDS,
  );
  return loadCached().then(reviveMoleculePageNexafsCardPage);
}
