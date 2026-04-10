/**
 * User capability resolution for sessions and server-side guards. All decisions derive from
 * `AppRole.permissions` JSON only; boolean columns on `AppRole` are not consulted here.
 */
import {
  parseRolePermissions,
  permissionsGrantLabsAccess,
  permissionsGrantManageUsers,
} from "~/lib/app-role-permissions";
import { Prisma, type PrismaClient } from "~/prisma/client";

export interface UserSessionCapabilities {
  canAccessLabs: boolean;
  canManageUsers: boolean;
  roleSlugs: string[];
}

/**
 * Loads capability flags and role slugs for session serialization and UI gates by OR-ing
 * projections across all assigned roles.
 *
 * @param db - Prisma client (pooled app DB).
 * @param userId - `next_auth.user.id` (UUID).
 */
export async function getUserSessionCapabilities(
  db: PrismaClient,
  userId: string,
): Promise<UserSessionCapabilities> {
  const links = await db.userAppRole.findMany({
    where: { userId },
    include: { role: true },
  });
  let canAccessLabs = false;
  let canManageUsers = false;
  const roleSlugs: string[] = [];
  for (const link of links) {
    roleSlugs.push(link.role.slug);
    const perms = parseRolePermissions(link.role.permissions);
    if (permissionsGrantLabsAccess(perms)) canAccessLabs = true;
    if (permissionsGrantManageUsers(perms)) canManageUsers = true;
  }
  roleSlugs.sort();
  return { canAccessLabs, canManageUsers, roleSlugs };
}

/**
 * Resolves whether the user may access maintainer-only dataset operations and Labs
 * (any assigned role whose permissions include `labs_access`).
 *
 * @param db - Prisma client (pooled app DB).
 * @param userId - Authenticated user id, or `null` when unauthenticated.
 */
export async function hasPrivilegedRole(
  db: PrismaClient,
  userId: string | null,
): Promise<boolean> {
  if (!userId) return false;
  const links = await db.userAppRole.findMany({
    where: { userId },
    select: { role: { select: { permissions: true } } },
  });
  return links.some((l) =>
    permissionsGrantLabsAccess(parseRolePermissions(l.role.permissions)),
  );
}

/**
 * Resolves whether the user may open the admin user-management surface and call admin tRPC procedures
 * (any assigned role with `user_directory`, `user_roles`, or `user_delete` in `permissions`).
 *
 * @param db - Prisma client (pooled app DB).
 * @param userId - Authenticated user id, or `null` when unauthenticated.
 */
export async function hasManageUsersCapability(
  db: PrismaClient,
  userId: string | null,
): Promise<boolean> {
  if (!userId) return false;
  const links = await db.userAppRole.findMany({
    where: { userId },
    select: { role: { select: { permissions: true } } },
  });
  return links.some((l) =>
    permissionsGrantManageUsers(parseRolePermissions(l.role.permissions)),
  );
}

const manageUsersPermissionContainmentSql = Prisma.sql`(
  ar.permissions @> '["user_directory"]'::jsonb
  OR ar.permissions @> '["user_roles"]'::jsonb
  OR ar.permissions @> '["user_delete"]'::jsonb
)`;

/**
 * Counts distinct users who have at least one role that grants admin-console access, for last-admin guards.
 * Uses Postgres `jsonb @>` against `AppRole.permissions` (authoritative list).
 *
 * @param db - Prisma client (pooled app DB).
 */
export async function countUsersWithManageUsersCapability(
  db: PrismaClient,
): Promise<number> {
  const rows = await db.$queryRaw<[{ count: bigint }]>(Prisma.sql`
    SELECT COUNT(*)::bigint AS count FROM (
      SELECT uar.user_id
      FROM next_auth.user_app_role uar
      INNER JOIN next_auth.app_role ar ON ar.id = uar.role_id
      WHERE ${manageUsersPermissionContainmentSql}
      GROUP BY uar.user_id
    ) t
  `);
  return Number(rows[0]?.count ?? 0);
}

/**
 * Counts distinct users (other than `excludeUserId`) who have a role that grants admin-console access.
 *
 * @param excludeUserId - `next_auth.user.id` to omit from the count (UUID string).
 */
export async function countUsersWithManageCapabilityExcluding(
  db: PrismaClient,
  excludeUserId: string,
): Promise<number> {
  const rows = await db.$queryRaw<[{ count: bigint }]>(Prisma.sql`
    SELECT COUNT(*)::bigint AS count FROM (
      SELECT uar.user_id
      FROM next_auth.user_app_role uar
      INNER JOIN next_auth.app_role ar ON ar.id = uar.role_id
      WHERE uar.user_id <> ${excludeUserId}
        AND ${manageUsersPermissionContainmentSql}
      GROUP BY uar.user_id
    ) t
  `);
  return Number(rows[0]?.count ?? 0);
}
