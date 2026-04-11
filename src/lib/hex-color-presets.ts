/**
 * Shared hex color validation and preset list for UI color selectors (roles, branding, etc.).
 * Keeps preset data out of domain-specific modules while allowing reuse.
 */
import { z } from "zod";

export const hexSixSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Use a #RRGGBB hex color.");

export interface HexColorPreset {
  readonly label: string;
  readonly value: string;
}

/**
 * Quick picks for role and UI accents: original Discord-inspired set plus extra distinct hues.
 */
export const DISCORD_STYLE_HEX_COLOR_PRESETS: readonly HexColorPreset[] = [
  { label: "Blurple", value: "#5865F2" },
  { label: "Green", value: "#57F287" },
  { label: "Gold", value: "#FEE75C" },
  { label: "Fuchsia", value: "#EB459E" },
  { label: "Red", value: "#ED4245" },
  { label: "Purple", value: "#9B59B6" },
  { label: "Teal", value: "#1ABC9C" },
  { label: "Orange", value: "#E67E22" },
  { label: "Slate", value: "#99AAB5" },
  { label: "White", value: "#FFFFFF" },
  { label: "Sky", value: "#0EA5E9" },
  { label: "Indigo", value: "#6366F1" },
  { label: "Rose", value: "#F43F5E" },
  { label: "Amber", value: "#F59E0B" },
  { label: "Lime", value: "#84CC16" },
  { label: "Emerald", value: "#10B981" },
  { label: "Cyan", value: "#06B6D4" },
  { label: "Violet", value: "#8B5CF6" },
  { label: "Pink", value: "#EC4899" },
  { label: "Navy", value: "#1E3A5F" },
  { label: "Brown", value: "#92400E" },
  { label: "Stone", value: "#78716C" },
  { label: "Zinc", value: "#71717A" },
  { label: "Charcoal", value: "#27272A" },
];

/**
 * Normalizes `raw` to uppercase `#RRGGBB` when valid; otherwise returns `fallback` coerced the same way (or `#000000` if needed).
 *
 * @param raw - Candidate hex string (may include whitespace).
 * @param fallback - Replacement when `raw` is not six-digit hex.
 */
export function coerceHexSix(raw: string, fallback: string): string {
  const trimmed = raw.trim();
  const direct = hexSixSchema.safeParse(trimmed);
  if (direct.success) {
    return direct.data.toUpperCase();
  }
  const fb = hexSixSchema.safeParse(fallback.trim());
  if (fb.success) {
    return fb.data.toUpperCase();
  }
  return "#000000";
}
