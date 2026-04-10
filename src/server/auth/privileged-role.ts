import { APP_ADMINISTRATOR_SLUG } from "~/lib/app-role-lineage";
import type { Prisma, PrismaClient } from "~/prisma/client";

const manageUsersRoleWhere: Prisma.AppRoleWhereInput = {
  OR: [{ canManageUsers: true }, { slug: APP_ADMINISTRATOR_SLUG }],
};

/**
 * Reports whether an `AppRole` assignment grants access to the admin user-management surface,
 * including the built-in {@link APP_ADMINISTRATOR_SLUG} tier when `can_manage_users` is false.
 *
 * @param slug - `AppRole.slug` for the assignment.
 * @param canManageUsers - `AppRole.can_manage_users` for the assignment.
 */
export function roleAssignmentGrantsManageUsers(
  slug: string,
  canManageUsers: boolean,
): boolean {
  return canManageUsers || slug === APP_ADMINISTRATOR_SLUG;
}

/**
 * Resolves whether the user may access maintainer-only dataset operations and Labs
 * (any assigned role with `canAccessLabs`).
 */
export async function hasPrivilegedRole(
  db: PrismaClient,
  userId: string | null,
): Promise<boolean> {
  if (!userId) return false;
  const row = await db.userAppRole.findFirst({
    where: {
      userId,
      role: { canAccessLabs: true },
    },
    select: { userId: true },
  });
  return row != null;
}

/**
 * Resolves whether the user may open the admin user-management surface and call admin tRPC procedures.
 */
export async function hasManageUsersCapability(
  db: PrismaClient,
  userId: string | null,
): Promise<boolean> {
  if (!userId) return false;
  const row = await db.userAppRole.findFirst({
    where: {
      userId,
      role: manageUsersRoleWhere,
    },
    select: { userId: true },
  });
  return row != null;
}

export interface UserSessionCapabilities {
  canAccessLabs: boolean;
  canManageUsers: boolean;
  roleSlugs: string[];
}

/**
 * Loads capability flags and role slugs for session serialization and UI gates.
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
    if (link.role.canAccessLabs) canAccessLabs = true;
    if (roleAssignmentGrantsManageUsers(link.role.slug, link.role.canManageUsers)) {
      canManageUsers = true;
    }
  }
  roleSlugs.sort();
  return { canAccessLabs, canManageUsers, roleSlugs };
}

/**
 * Counts users who have at least one role that grants admin-console access (`can_manage_users`
 * or slug {@link APP_ADMINISTRATOR_SLUG}), used for last-admin guards.
 */
export async function countUsersWithManageUsersCapability(
  db: PrismaClient,
): Promise<number> {
  const rows = await db.userAppRole.groupBy({
    by: ["userId"],
    where: { role: manageUsersRoleWhere },
  });
  return rows.length;
}

/**
 * Counts distinct users (other than `excludeUserId`) who have a role that grants admin-console
 * access (`can_manage_users` or slug {@link APP_ADMINISTRATOR_SLUG}).
 */
export async function countUsersWithManageCapabilityExcluding(
  db: PrismaClient,
  excludeUserId: string,
): Promise<number> {
  const rows = await db.userAppRole.groupBy({
    by: ["userId"],
    where: {
      userId: { not: excludeUserId },
      role: manageUsersRoleWhere,
    },
  });
  return rows.length;
}
