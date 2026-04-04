import type { PrismaClient } from "~/prisma/client";

export const PRIVILEGED_ROLES = ["admin", "maintainer"] as const;

export async function hasPrivilegedRole(
  db: PrismaClient,
  userId: string | null,
): Promise<boolean> {
  if (!userId) return false;
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return (
    user?.role != null &&
    PRIVILEGED_ROLES.includes(user.role as (typeof PRIVILEGED_ROLES)[number])
  );
}
