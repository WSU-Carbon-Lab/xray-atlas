export const generateGaussianPeak = (
  peak: { energy: number; amplitude?: number; width?: number },
  energyRange: number[],
): number[] => {
  const { energy, amplitude = 1, width = 0.1 } = peak;

  if (!width || width <= 0) {
    return energyRange.map((e) => (Math.abs(e - energy) < 0.01 ? amplitude : 0));
  }

  const sigma = width / 2.355;

  return energyRange.map((e) => {
    const diff = e - energy;
    return amplitude * Math.exp(-0.5 * Math.pow(diff / sigma, 2));
  });
};

