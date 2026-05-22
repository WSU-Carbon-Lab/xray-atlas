import type { TraceData } from "../types";
import {
  isImaginaryChannel,
  isRealChannel,
  type NexafsPlotChannelId,
} from "~/features/process-nexafs/nexafs-plot-channels";

export const LINKED_IMAGINARY_PREFIX = "link-imaginary-";
export const LINKED_REAL_PREFIX = "link-real-";
const GEOMETRY_PREFIX = "geometry-";

const OPTICAL_ROLE_IDS: readonly NexafsPlotChannelId[] = [
  "im-epsilon",
  "re-epsilon",
  "im-chi",
  "re-chi",
  "mass-absorption",
  "normalized",
  "raw",
  "f2",
  "f1",
  "beta",
  "delta",
];

function parseRoleFromTraceName(
  name: string,
): { role: NexafsPlotChannelId; geometryKey: string } | null {
  for (const role of OPTICAL_ROLE_IDS) {
    const prefix = `${role}-`;
    if (name.startsWith(prefix) && name.length > prefix.length) {
      return { role, geometryKey: name.slice(prefix.length) };
    }
  }
  return null;
}

export type TraceGeometryIdentity = {
  readonly linkKind: "imaginary" | "real" | null;
  readonly geometryKey: string | undefined;
  readonly role: NexafsPlotChannelId | null;
};

/**
 * Reads polarization-agnostic geometry keys and optical link roles encoded on trace legend ids or names.
 */
export function parseTraceGeometryIdentity(trace: TraceData): TraceGeometryIdentity {
  const legendId = trace.legendId;
  if (typeof legendId === "string") {
    if (legendId.startsWith(LINKED_IMAGINARY_PREFIX)) {
      return {
        linkKind: "imaginary",
        geometryKey: legendId.slice(LINKED_IMAGINARY_PREFIX.length),
        role: null,
      };
    }
    if (legendId.startsWith(LINKED_REAL_PREFIX)) {
      return {
        linkKind: "real",
        geometryKey: legendId.slice(LINKED_REAL_PREFIX.length),
        role: null,
      };
    }
    if (legendId.startsWith(GEOMETRY_PREFIX)) {
      return {
        linkKind: null,
        geometryKey: legendId.slice(GEOMETRY_PREFIX.length),
        role: null,
      };
    }
  }

  const name = typeof trace.name === "string" ? trace.name : "";
  const fromName = name ? parseRoleFromTraceName(name) : null;
  if (fromName) {
    return {
      linkKind: isImaginaryChannel(fromName.role)
        ? "imaginary"
        : isRealChannel(fromName.role)
          ? "real"
          : null,
      geometryKey: fromName.geometryKey,
      role: fromName.role,
    };
  }

  return { linkKind: null, geometryKey: undefined, role: null };
}
