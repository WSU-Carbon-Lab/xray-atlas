import type { PrismaClient } from "~/prisma/client";

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
      role: { canManageUsers: true },
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
    if (link.role.canManageUsers) canManageUsers = true;
  }
  roleSlugs.sort();
  return { canAccessLabs, canManageUsers, roleSlugs };
}

/**
 * Counts users who have at least one role with `canManageUsers` (used for last-admin guards).
 */
export async function countUsersWithManageUsersCapability(
  db: PrismaClient,
): Promise<number> {
  const rows = await db.userAppRole.groupBy({
    by: ["userId"],
    where: { role: { canManageUsers: true } },
  });
  return rows.length;
}

/**
 * Counts distinct users (other than `excludeUserId`) who have a role with `canManageUsers`.
 */
export async function countUsersWithManageCapabilityExcluding(
  db: PrismaClient,
  excludeUserId: string,
): Promise<number> {
  const rows = await db.userAppRole.groupBy({
    by: ["userId"],
    where: {
      userId: { not: excludeUserId },
      role: { canManageUsers: true },
    },
  });
  return rows.length;
}
