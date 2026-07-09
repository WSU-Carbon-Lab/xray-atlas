export const HC_EV_CM = 1.23984193e-4;
export const FOUR_PI = 4 * Math.PI;
export const ELECTRON_RADIUS_CM = 2.8179403227e-13;
export const AVOGADRO_NUMBER = 6.02214076e23;

/**
 * Converts optical beta to mass absorption at rho = 1 g/cm3 using mu = 4*pi*beta/lambda.
 */
export function massAbsorptionFromBeta(beta: number, energyEv: number): number {
  if (!(energyEv > 0) || !Number.isFinite(beta)) {
    return Number.NaN;
  }
  const lambdaCm = HC_EV_CM / energyEv;
  return (FOUR_PI * beta) / lambdaCm;
}

/**
 * Converts mass absorption at rho = 1 g/cm3 to optical beta using beta = mu*lambda/(4*pi).
 */
export function betaFromMassAbsorption(mu: number, energyEv: number): number {
  if (!(energyEv > 0) || !Number.isFinite(mu)) {
    return Number.NaN;
  }
  const lambdaCm = HC_EV_CM / energyEv;
  return (mu * lambdaCm) / FOUR_PI;
}

/**
 * Converts compound imaginary atomic scattering factor f2 to mass absorption at rho = 1 g/cm3.
 */
export function massAbsorptionFromF2(
  f2: number,
  energyEv: number,
  formulaMassGPerMol: number,
): number {
  if (
    !(energyEv > 0) ||
    !(formulaMassGPerMol > 0) ||
    !Number.isFinite(f2)
  ) {
    return Number.NaN;
  }
  const wavelengthCm = HC_EV_CM / energyEv;
  return (
    (2 * ELECTRON_RADIUS_CM * wavelengthCm * AVOGADRO_NUMBER * f2) /
    formulaMassGPerMol
  );
}

/**
 * Maps epsilon2 or chi2 (leading-order loss) to mass absorption via beta = eps2/2.
 */
export function massAbsorptionFromEpsilon2(
  epsilon2: number,
  energyEv: number,
): number {
  return massAbsorptionFromBeta(epsilon2 / 2, energyEv);
}
