/**
 * Shared spectrum-point row caps for browse fetch and dataset export.
 * Server-only scan caps for normalization revalidation stay in
 * `~/server/nexafs/spectrumpointLimits`.
 */

/**
 * Maximum `spectrumpoints` rows loaded for one experiment on browse plot/table
 * and dataset CSV / all-data bundle export.
 *
 * Dense angle-resolved Carbon K uploads can exceed 10k total rows (four
 * geometries times ~7000 energies). A 10k fetch ordered by energy therefore
 * shows only ~2500 unique energies when four polarizations share one grid.
 */
export const SPECTRUMPOINTS_BROWSE_FETCH_CAP = 50_000;
