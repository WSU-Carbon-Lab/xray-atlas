/**
 * Shared DTOs for administrator catalog takedown (preview counts and labels).
 * Server mutations live in `~/server/nexafs/admin-catalog-delete`.
 */

/** Counts shown in the admin confirm dialog before a catalog delete. */
export interface AdminCatalogDeleteImpact {
  /** Human label for the row being removed. */
  label: string;
  /** Experiments that will be deleted. */
  experimentCount: number;
  /** Samples that will be deleted (molecule delete only). */
  sampleCount: number;
  /** Spectrum point rows that will be deleted. */
  spectrumPointCount: number;
  /** Experiment aux file rows. */
  experimentAuxFileCount: number;
  /** Sample aux file rows. */
  sampleAuxFileCount: number;
  /** Linked Zenodo deposit rows that will drop with the experiment. */
  zenodoDepositCount: number;
}
