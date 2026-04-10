/**
 * Granular application permissions stored on `AppRole.permissions` (JSON string array).
 * Session gates (`canAccessLabs`, `canManageUsers`) are derived when roles are saved so
 * existing middleware and layout checks keep working until callers migrate to explicit checks.
 */
import { z } from "zod";

export const APP_PERMISSION_KEYS = [
  "user_directory",
  "user_roles",
  "user_delete",
  "instrument_edit",
  "instrument_active",
  "instrument_remove",
  "molecule_edit",
  "molecule_add",
  "molecule_delete",
  "data_upload",
  "data_delete",
  "data_edit_peaks",
  "data_edit_normalization",
  "data_comment",
  "labs_access",
] as const;

export type AppPermissionKey = (typeof APP_PERMISSION_KEYS)[number];

const PERMISSION_KEY_SET = new Set<string>(APP_PERMISSION_KEYS);

export const appPermissionKeySchema = z
  .string()
  .refine((s): s is AppPermissionKey => PERMISSION_KEY_SET.has(s), {
    message: "Invalid permission key.",
  });

export const permissionsArraySchema = z.array(appPermissionKeySchema);

export interface PermissionGroupDefinition {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly items: readonly { key: AppPermissionKey; label: string }[];
}

/**
 * Permission keys grouped for admin UI (Discord-style sections).
 */
export const APP_PERMISSION_GROUPS: readonly PermissionGroupDefinition[] = [
  {
    id: "user",
    title: "User management",
    description: "Directory and account administration",
    items: [
      { key: "user_directory", label: "Edit user directory data" },
      { key: "user_roles", label: "Assign and manage roles" },
      { key: "user_delete", label: "Delete user accounts" },
    ],
  },
  {
    id: "instrument",
    title: "Instrument management",
    description: "Facility instrument directory",
    items: [
      { key: "instrument_edit", label: "Edit instrument directory data" },
      { key: "instrument_active", label: "Set active / inactive status" },
      { key: "instrument_remove", label: "Remove instruments" },
    ],
  },
  {
    id: "molecule",
    title: "Molecule management",
    description: "Molecule records and metadata",
    items: [
      { key: "molecule_edit", label: "Edit molecules" },
      { key: "molecule_add", label: "Add molecules" },
      { key: "molecule_delete", label: "Delete molecules" },
    ],
  },
  {
    id: "data",
    title: "Data management",
    description: "Spectra and analysis artifacts",
    items: [
      { key: "data_upload", label: "Upload data" },
      { key: "data_delete", label: "Delete data" },
      { key: "data_edit_peaks", label: "Edit peaks" },
      { key: "data_edit_normalization", label: "Edit normalization" },
      { key: "data_comment", label: "Comment on data" },
    ],
  },
  {
    id: "labs",
    title: "Labs and experiments",
    description: "Privileged tooling and sandbox-style surfaces",
    items: [{ key: "labs_access", label: "Access Labs / maintainer-tier tools" }],
  },
] as const;

/**
 * Normalizes a role display name to lowercase single spaces between words.
 */
export function normalizeRoleDisplayName(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Builds a URL-safe slug from a normalized display name: spaces become underscores;
 * only `a-z`, `0-9`, and `_` are kept; runs of underscores collapse.
 */
export function slugFromRoleDisplayName(displayName: string): string {
  const base = normalizeRoleDisplayName(displayName).replace(/\s+/g, "_");
  const cleaned = base
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return cleaned;
}

const slugUnderscoreSchema = z
  .string()
  .min(2)
  .max(64)
  .regex(
    /^[a-z0-9]+(?:_[a-z0-9]+)*$/,
    "Use lowercase letters, digits, and underscores (e.g. team_moderator).",
  );

export { slugUnderscoreSchema as roleSlugSchema };

/**
 * Deduplicates and validates a permission list for persistence.
 */
export function normalizePermissionList(keys: string[]): AppPermissionKey[] {
  const out: AppPermissionKey[] = [];
  const seen = new Set<string>();
  for (const k of keys) {
    if (!PERMISSION_KEY_SET.has(k) || seen.has(k)) continue;
    seen.add(k);
    out.push(k as AppPermissionKey);
  }
  return out;
}

/**
 * Maps stored permissions to legacy `can_access_labs` / `can_manage_users` columns so
 * `hasManageUsersCapability`, sandbox layout, and the avatar menu stay consistent.
 */
export function legacyCapabilitiesFromPermissions(
  permissions: readonly AppPermissionKey[],
): { canAccessLabs: boolean; canManageUsers: boolean } {
  const s = new Set(permissions);
  return {
    canManageUsers:
      s.has("user_directory") || s.has("user_roles") || s.has("user_delete"),
    canAccessLabs: s.has("labs_access"),
  };
}

/**
 * Reads `AppRole.permissions` JSON into a typed, ordered unique list; invalid entries drop.
 */
export function parseRolePermissions(raw: unknown): AppPermissionKey[] {
  if (raw == null || !Array.isArray(raw)) return [];
  const out: AppPermissionKey[] = [];
  for (const x of raw) {
    if (typeof x !== "string") continue;
    const p = appPermissionKeySchema.safeParse(x);
    if (p.success) out.push(p.data);
  }
  return normalizePermissionList(out);
}

/**
 * Full permission set for the built-in administrator lineage role.
 */
export const ADMINISTRATOR_PERMISSION_PRESET: readonly AppPermissionKey[] = [
  ...APP_PERMISSION_KEYS,
];
