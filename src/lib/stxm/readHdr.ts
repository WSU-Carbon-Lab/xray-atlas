import type { StxmHdrMetadata } from "./types";

function parsePointsCount(text: string, axisName: string): number | null {
  const pattern = new RegExp(
    `${axisName}\\s*=\\s*\\{[^}]*Points\\s*=\\s*\\(\\s*(\\d+)`,
    "s",
  );
  const match = pattern.exec(text);
  return match ? Number.parseInt(match[1] ?? "", 10) : null;
}

function parsePointsArray(text: string, axisName: string): Float64Array | null {
  const pattern = new RegExp(
    `${axisName}\\s*=\\s*\\{[^}]*Points\\s*=\\s*\\(\\s*\\d+\\s*,\\s*([\\d\\s.,\\-eE+]+)\\)`,
    "s",
  );
  const match = pattern.exec(text);
  if (!match?.[1]) {
    return null;
  }
  const tokens = match[1].replace(/,/g, " ").trim().split(/\s+/);
  const values = tokens
    .filter((token) => token.length > 0)
    .map((token) => Number.parseFloat(token));
  if (values.some((value) => !Number.isFinite(value))) {
    return null;
  }
  return Float64Array.from(values);
}

/**
 * Parses STXM `.hdr` text into axis counts, optional axis coordinate arrays, and
 * axis names. Raises when PAxis or QAxis point counts are missing.
 *
 * @param text - Full `.hdr` file contents as UTF-8 text.
 * @returns Structured header metadata including the original raw text.
 * @throws {Error} When PAxis or QAxis Points counts cannot be read.
 */
export function readHdr(text: string): StxmHdrMetadata {
  const paxisCount = parsePointsCount(text, "PAxis");
  const qaxisCount = parsePointsCount(text, "QAxis");
  if (paxisCount === null || qaxisCount === null) {
    throw new Error("Could not find PAxis or QAxis Points in header");
  }

  const out: StxmHdrMetadata = {
    paxisCount,
    qaxisCount,
    raw: text,
  };

  const pname = /PAxis\s*=\s*\{\s*Name\s*=\s*"([^"]*)"/s.exec(text);
  const qname = /QAxis\s*=\s*\{\s*Name\s*=\s*"([^"]*)"/s.exec(text);
  if (pname?.[1]) {
    out.paxisName = pname[1];
  }
  if (qname?.[1]) {
    out.qaxisName = qname[1];
  }

  const parr = parsePointsArray(text, "PAxis");
  const qarr = parsePointsArray(text, "QAxis");
  if (parr) {
    out.paxisPoints = parr;
  }
  if (qarr) {
    out.qaxisPoints = qarr;
  }

  return out;
}
