import type { SpectrumPoint } from "~/app/components/plots/SpectrumPlot";

export interface NEXAFSJsonData {
  energy?: number[] | Array<{ energy: number }>;
  absorption?: number[] | Array<{ absorption: number }>;
  intensity?: number[];
  signal?: number[];
  theta?: number[];
  phi?: number[];
  data?: Array<{
    energy?: number;
    absorption?: number;
    intensity?: number;
    signal?: number;
    theta?: number;
    phi?: number;
  }>;
  dataset?: Array<{
    geometry?: {
      e_field_polar?: number;
      e_field_azimuth?: number;
      theta?: number;
      phi?: number;
    };
    energy?: {
      signal?: number[];
      energy?: number[];
    };
    intensity?: {
      signal?: number[];
      intensity?: number[];
    };
    absorption?: {
      signal?: number[];
      absorption?: number[];
    };
  }>;
}

export function parseNexafsJson(file: File): Promise<{
  spectrumPoints: SpectrumPoint[];
  columns: string[];
  rawData: Record<string, unknown>[];
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== "string") {
          reject(new Error("Failed to read file as text"));
          return;
        }

        const jsonData = JSON.parse(text) as NEXAFSJsonData;

        const spectrumPoints: SpectrumPoint[] = [];
        const rawData: Record<string, unknown>[] = [];

        if (jsonData.dataset && Array.isArray(jsonData.dataset) && jsonData.dataset.length > 0) {
          for (const datasetItem of jsonData.dataset) {
            if (!datasetItem) continue;
            
            const geometry = datasetItem.geometry;
            const theta = geometry?.e_field_polar ?? geometry?.theta;
            const phi = geometry?.e_field_azimuth ?? geometry?.phi;
            
            const energyArray = datasetItem.energy?.signal ?? datasetItem.energy?.energy ?? [];
            const absorptionArray = datasetItem.intensity?.signal ?? 
                                   datasetItem.intensity?.intensity ??
                                   datasetItem.absorption?.signal ??
                                   datasetItem.absorption?.absorption ?? [];
            
            if (!Array.isArray(energyArray) || !Array.isArray(absorptionArray)) {
              continue;
            }
            
            if (energyArray.length === 0 || absorptionArray.length === 0) {
              continue;
            }
            
            const maxLength = Math.min(energyArray.length, absorptionArray.length);
            
            for (let i = 0; i < maxLength; i++) {
              const energy = energyArray[i];
              const absorption = absorptionArray[i];
              
              if (energy !== undefined && energy !== null && absorption !== undefined && absorption !== null) {
                const energyNum = typeof energy === "number" ? energy : parseFloat(String(energy));
                const absorptionNum = typeof absorption === "number" ? absorption : parseFloat(String(absorption));
                
                if (!isNaN(energyNum) && !isNaN(absorptionNum)) {
                  const spectrumPoint: SpectrumPoint = {
                    energy: energyNum,
                    absorption: absorptionNum,
                  };
                  
                  if (theta !== undefined && theta !== null) {
                    const thetaNum = typeof theta === "number" ? theta : parseFloat(String(theta));
                    if (!isNaN(thetaNum)) {
                      spectrumPoint.theta = thetaNum;
                    }
                  }
                  
                  if (phi !== undefined && phi !== null) {
                    const phiNum = typeof phi === "number" ? phi : parseFloat(String(phi));
                    if (!isNaN(phiNum)) {
                      spectrumPoint.phi = phiNum;
                    }
                  }
                  
                  spectrumPoints.push(spectrumPoint);
                  rawData.push({
                    energy: spectrumPoint.energy,
                    absorption: spectrumPoint.absorption,
                    ...(spectrumPoint.theta !== undefined && { theta: spectrumPoint.theta }),
                    ...(spectrumPoint.phi !== undefined && { phi: spectrumPoint.phi }),
                  });
                }
              }
            }
          }
        } else if (jsonData.data && Array.isArray(jsonData.data)) {
          for (const point of jsonData.data) {
            const energy = point.energy ?? point.intensity ?? point.signal;
            const absorption = point.absorption ?? point.intensity ?? point.signal;

            if (energy !== undefined && absorption !== undefined) {
              const spectrumPoint: SpectrumPoint = {
                energy: typeof energy === "number" ? energy : parseFloat(String(energy)),
                absorption: typeof absorption === "number" ? absorption : parseFloat(String(absorption)),
              };

              if (point.theta !== undefined) {
                spectrumPoint.theta = typeof point.theta === "number" ? point.theta : parseFloat(String(point.theta));
              }

              if (point.phi !== undefined) {
                spectrumPoint.phi = typeof point.phi === "number" ? point.phi : parseFloat(String(point.phi));
              }

              spectrumPoints.push(spectrumPoint);
              rawData.push(point as Record<string, unknown>);
            }
          }
        } else if (
          (jsonData.energy && Array.isArray(jsonData.energy)) ||
          (jsonData.absorption && Array.isArray(jsonData.absorption))
        ) {
          const energyArray = Array.isArray(jsonData.energy) ? jsonData.energy : [];
          const absorptionArray = Array.isArray(jsonData.absorption) ? jsonData.absorption : 
                                 Array.isArray(jsonData.intensity) ? jsonData.intensity :
                                 Array.isArray(jsonData.signal) ? jsonData.signal : [];
          const thetaArray = Array.isArray(jsonData.theta) ? jsonData.theta : [];
          const phiArray = Array.isArray(jsonData.phi) ? jsonData.phi : [];

          const maxLength = Math.max(
            energyArray.length,
            absorptionArray.length,
            thetaArray.length,
            phiArray.length,
          );

          for (let i = 0; i < maxLength; i++) {
            const energy = energyArray[i];
            const absorption = absorptionArray[i];

            if (energy !== undefined && absorption !== undefined) {
              const spectrumPoint: SpectrumPoint = {
                energy: typeof energy === "number" ? energy : 
                       typeof energy === "object" && energy !== null && "energy" in energy
                         ? (energy as { energy: number }).energy
                         : parseFloat(String(energy)),
                absorption: typeof absorption === "number" ? absorption :
                           typeof absorption === "object" && absorption !== null && "absorption" in absorption
                             ? (absorption as { absorption: number }).absorption
                             : parseFloat(String(absorption)),
              };

              if (thetaArray[i] !== undefined) {
                spectrumPoint.theta = typeof thetaArray[i] === "number" ? thetaArray[i] : parseFloat(String(thetaArray[i]));
              }

              if (phiArray[i] !== undefined) {
                spectrumPoint.phi = typeof phiArray[i] === "number" ? phiArray[i] : parseFloat(String(phiArray[i]));
              }

              spectrumPoints.push(spectrumPoint);
              rawData.push({
                energy: spectrumPoint.energy,
                absorption: spectrumPoint.absorption,
                ...(spectrumPoint.theta !== undefined && { theta: spectrumPoint.theta }),
                ...(spectrumPoint.phi !== undefined && { phi: spectrumPoint.phi }),
              });
            }
          }
        } else {
          reject(new Error("JSON file does not contain valid NEXAFS data structure"));
          return;
        }

        if (spectrumPoints.length === 0) {
          reject(new Error("No valid spectrum data found in JSON file"));
          return;
        }

        const columns = Array.from(
          new Set(
            rawData.flatMap((row) => Object.keys(row)),
          ),
        );

        resolve({
          spectrumPoints,
          columns,
          rawData,
        });
      } catch (error) {
        reject(error instanceof Error ? error : new Error("Failed to parse JSON file"));
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsText(file);
  });
}
