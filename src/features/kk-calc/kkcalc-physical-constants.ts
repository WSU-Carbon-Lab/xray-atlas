/**
 * CODATA-compatible constants aligned with SciPy / kkcalc2 `conversions.py` for
 * `refractive_to_ASF` / `ASF_to_refractive` prefactors and classical electron radius.
 */
export const PLANCK_J_S = 6.62607015e-34;
export const SPEED_OF_LIGHT_M_S = 299792458;
export const ELEMENTARY_CHARGE_C = 1.602176634e-19;
export const VACUUM_PERMITTIVITY_F_M = 8.8541878128e-12;
export const ELECTRON_MASS_KG = 9.1093837015e-31;
export const AVOGADRO = 6.02214076e23;
export const PI = Math.PI;

/**
 * Classical electron radius in metres, matching kkcalc2 fallback
 * `1/(4*pi*epsilon0)*e^2/(m_e*c^2)` when SciPy's misspelled `classical electon radius` key is absent.
 */
export function classicalElectronRadiusM(): number {
  return (
    (1 / (4 * PI * VACUUM_PERMITTIVITY_F_M)) *
    (ELEMENTARY_CHARGE_C ** 2 / (ELECTRON_MASS_KG * SPEED_OF_LIGHT_M_S ** 2))
  );
}
