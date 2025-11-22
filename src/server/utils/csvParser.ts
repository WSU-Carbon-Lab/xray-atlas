import Papa from "papaparse";

export interface GeometryData {
  theta: number;
  phi: number;
}

export interface SpectrumData {
  energy: number;
  absorption: number;
  theta?: number;
  phi?: number;
}

export interface ParsedCSV<T> {
  data: T[];
  errors: Papa.ParseError[];
  meta: Papa.ParseMeta;
}

/**
 * Validates that required columns exist in the CSV
 */
export function validateCSVColumns(
  headers: string[],
  required: string[],
): { valid: boolean; missing: string[] } {
  const normalizedHeaders = headers.map((h) => h.toLowerCase().trim());
  const missing = required.filter(
    (req) => !normalizedHeaders.includes(req.toLowerCase().trim()),
  );

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Parses a CSV file and returns the data
 */
export async function parseCSVFile<T>(
  file: File | string,
  options?: Papa.ParseConfig,
): Promise<ParsedCSV<T>> {
  return new Promise((resolve, reject) => {
    const config: Papa.ParseConfig = {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
      ...options,
    };

    Papa.parse<T>(file, {
      ...config,
      complete: (results) => {
        resolve({
          data: results.data,
          errors: results.errors,
          meta: results.meta,
        });
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}

/**
 * Parses geometry CSV data (theta and phi columns)
 */
export async function parseGeometryCSV(
  file: File | string,
): Promise<{ data: GeometryData[]; errors: string[] }> {
  try {
    const result = await parseCSVFile<Record<string, string>>(file);

    // Validate required columns
    const headers = result.meta.fields ?? [];
    const validation = validateCSVColumns(headers, ["theta", "phi"]);

    if (!validation.valid) {
      return {
        data: [],
        errors: [
          `Missing required columns: ${validation.missing.join(", ")}`,
        ],
      };
    }

    // Parse and validate data
    const geometryData: GeometryData[] = [];
    const errors: string[] = [];

    result.data.forEach((row, index) => {
      const theta = parseFloat(row.theta ?? "");
      const phi = parseFloat(row.phi ?? "");

      if (isNaN(theta) || isNaN(phi)) {
        errors.push(
          `Row ${index + 2}: Invalid theta or phi values (theta: ${row.theta}, phi: ${row.phi})`,
        );
        return;
      }

      geometryData.push({ theta, phi });
    });

    return { data: geometryData, errors };
  } catch (error) {
    return {
      data: [],
      errors: [
        error instanceof Error ? error.message : "Failed to parse CSV file",
      ],
    };
  }
}

/**
 * Parses spectrum CSV data (energy and absorption/intensity columns)
 */
export async function parseSpectrumCSV(
  file: File | string,
): Promise<{ data: SpectrumData[]; errors: string[] }> {
  try {
    const result = await parseCSVFile<Record<string, string>>(file);

    // Validate required columns
    const headers = result.meta.fields ?? [];
    const hasAbsorption = headers.includes("absorption");
    const hasIntensity = headers.includes("intensity");

    if (!hasAbsorption && !hasIntensity) {
      return {
        data: [],
        errors: [
          "Missing required column: 'absorption' or 'intensity' must be present",
        ],
      };
    }

    const validation = validateCSVColumns(headers, ["energy"]);
    if (!validation.valid) {
      return {
        data: [],
        errors: [`Missing required column: ${validation.missing.join(", ")}`],
      };
    }

    // Parse and validate data
    const spectrumData: SpectrumData[] = [];
    const errors: string[] = [];

    result.data.forEach((row, index) => {
      const energy = parseFloat(row.energy ?? "");
      const absorption = parseFloat(
        row.absorption ?? row.intensity ?? "",
      );

      if (isNaN(energy)) {
        errors.push(`Row ${index + 2}: Invalid energy value (${row.energy})`);
        return;
      }

      if (isNaN(absorption)) {
        errors.push(
          `Row ${index + 2}: Invalid absorption/intensity value (${row.absorption ?? row.intensity})`,
        );
        return;
      }

      const spectrumPoint: SpectrumData = {
        energy,
        absorption,
      };

      // Optional geometry columns
      if (row.theta) {
        const theta = parseFloat(row.theta);
        if (!isNaN(theta)) {
          spectrumPoint.theta = theta;
        }
      }

      if (row.phi) {
        const phi = parseFloat(row.phi);
        if (!isNaN(phi)) {
          spectrumPoint.phi = phi;
        }
      }

      spectrumData.push(spectrumPoint);
    });

    return { data: spectrumData, errors };
  } catch (error) {
    return {
      data: [],
      errors: [
        error instanceof Error ? error.message : "Failed to parse CSV file",
      ],
    };
  }
}

/**
 * Extracts unique geometry combinations from spectrum data
 */
export function extractUniqueGeometries(
  spectrumData: SpectrumData[],
): GeometryData[] {
  const geometryMap = new Map<string, GeometryData>();

  spectrumData.forEach((point) => {
    if (point.theta !== undefined && point.phi !== undefined) {
      const key = `${point.theta},${point.phi}`;
      if (!geometryMap.has(key)) {
        geometryMap.set(key, {
          theta: point.theta,
          phi: point.phi,
        });
      }
    }
  });

  return Array.from(geometryMap.values());
}
