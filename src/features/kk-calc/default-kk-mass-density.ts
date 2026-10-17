/**
 * Default mass density for Kramers-Kronig and bare-atom number-density conversions.
 *
 * This module owns only the numeric default. It does not load Henke scattering
 * factors, so callers can read the constant without importing
 * `kkcalc-henke-element-f2.bundle.json`.
 */

/**
 * Mass density in g/cm^3 used when a sample density is not stored.
 *
 * The value is 1, the product default for conversions until an explicit sample
 * density exists.
 */
export const DEFAULT_KK_MASS_DENSITY_G_CM3 = 1;
