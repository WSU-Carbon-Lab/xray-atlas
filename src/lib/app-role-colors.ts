/**
 * Default role accent color and Zod validation; preset list is shared via `hex-color-presets.ts`.
 */
import { z } from "zod";

import {
  DISCORD_STYLE_HEX_COLOR_PRESETS,
  type HexColorPreset,
} from "~/lib/hex-color-presets";

export const roleHexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Use a #RRGGBB hex color.");

export const DEFAULT_ROLE_COLOR = "#5865F2";

export type RoleColorPreset = HexColorPreset;

export const ROLE_COLOR_PRESETS: readonly RoleColorPreset[] =
  DISCORD_STYLE_HEX_COLOR_PRESETS;
