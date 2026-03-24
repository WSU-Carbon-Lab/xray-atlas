export type NexafsParsedSpectrumPoint = {
  energy: number;
  absorption: number;
  theta: number;
  phi: number;
};

export type NexafsJsonDatasetItem = {
  geometry?: {
    e_field_polar?: number | null;
    e_field_azimuth?: number | null;
    theta?: number | null;
    phi?: number | null;
  };
  energy?: { signal?: number[]; energy?: number[] };
  intensity?: { signal?: number[]; intensity?: number[]; absorption?: number[] };
  absorption?: { signal?: number[]; absorption?: number[] };
  method?: string;
};

export function parseNexafsDatasetToSpectrumPoints(
  dataset: NexafsJsonDatasetItem[],
): NexafsParsedSpectrumPoint[] {
  const points: NexafsParsedSpectrumPoint[] = [];
  for (const datasetItem of dataset) {
    const geometry = datasetItem.geometry ?? {};
    const thetaRaw = geometry.e_field_polar ?? geometry.theta;
    const phiRaw = geometry.e_field_azimuth ?? geometry.phi;

    const theta = typeof thetaRaw === "number" ? thetaRaw : Number.parseFloat(String(thetaRaw));
    const phi = typeof phiRaw === "number" ? phiRaw : Number.parseFloat(String(phiRaw));
    if (!Number.isFinite(theta) || !Number.isFinite(phi)) continue;

    const energyArr =
      datasetItem.energy?.signal ??
      datasetItem.energy?.energy ??
      [];
    const absorptionArr =
      datasetItem.intensity?.signal ??
      datasetItem.intensity?.intensity ??
      datasetItem.intensity?.absorption ??
      datasetItem.absorption?.signal ??
      datasetItem.absorption?.absorption ??
      [];

    const maxLen = Math.min(energyArr.length, absorptionArr.length);
    for (let i = 0; i < maxLen; i++) {
      const energy = Number(energyArr[i]!);
      const absorption = Number(absorptionArr[i]!);
      if (!Number.isFinite(energy) || !Number.isFinite(absorption)) continue;
      points.push({ energy, absorption, theta, phi });
    }
  }
  return points;
}

export function buildPolarizationGroupsWithIndices(points: NexafsParsedSpectrumPoint[]) {
  const groupToIndices = new Map<string, number[]>();
  for (let idx = 0; idx < points.length; idx++) {
    const p = points[idx]!;
    const key = `${p.theta}:${p.phi}`;
    const arr = groupToIndices.get(key) ?? [];
    arr.push(idx);
    groupToIndices.set(key, arr);
  }
  return Array.from(groupToIndices.entries())
    .map(([key, indices]) => ({
      key,
      theta: points[indices[0]!]!.theta,
      phi: points[indices[0]!]!.phi,
      indices,
    }))
    .sort((a, b) => a.theta - b.theta || a.phi - b.phi);
}
