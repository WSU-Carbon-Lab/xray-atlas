/**
 * tRPC procedures for user and role administration. Every procedure is gated by
 * {@link adminProcedure}, which requires an authenticated user with at least one
 * `AppRole` where `canManageUsers` is true. Authorization is enforced again inside
 * mutations that could remove the last management-capable account.
 *
 * **Editing users:** `updateUser` updates `user.name` (display name), `user.email`
 * (optional directory contact email when set; unique in DB), `user.orcid`, and replaces all `user_app_role` rows in one
 * transaction. `setUserRoles` only replaces roles. Both enforce at most one lineage role among
 * `administrator`, `maintainer`, and `contributor` (any number of custom roles may be added).
 */
import { z, ZodError } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, adminProcedure } from "~/server/api/trpc";
import {
  countUsersWithManageCapabilityExcluding,
  hasManageUsersCapability,
} from "~/server/auth/privileged-role";
import { isDevMockUser } from "~/lib/dev-mock-data";
import { countLineageRolesInSlugs } from "~/lib/app-role-lineage";
import { parseOrcidForStorage } from "~/lib/orcid";
import { Prisma, type PrismaClient } from "~/prisma/client";

const slugSchema = z
  .string()
  .min(2)
  .max(64)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase letters, digits, and single hyphens between segments (e.g. custom-reviewer).",
  );

async function loadAndValidateRoleAssignment(
  db: PrismaClient,
  userId: string,
  roleIds: string[],
): Promise<void> {
  const roles = await db.appRole.findMany({
    where: { id: { in: roleIds } },
    select: { id: true, slug: true, canManageUsers: true },
  });
  if (roles.length !== roleIds.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "One or more role ids are invalid.",
    });
  }
  if (countLineageRolesInSlugs(roles.map((r) => r.slug)) > 1) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "A user may have at most one of Administrator, Maintainer, or Contributor at a time. Assign multiple custom roles as needed.",
    });
  }
  const hadManage = await hasManageUsersCapability(db, userId);
  const willHaveManage = roles.some((r) => r.canManageUsers);
  if (hadManage && !willHaveManage) {
    const others = await countUsersWithManageCapabilityExcluding(db, userId);
    if (others === 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "Cannot remove management access from the last user who has it.",
      });
    }
  }
}

function parseAdminOrcidField(raw: string): string | null {
  const t = raw.trim();
  if (t === "") {
    return null;
  }
  try {
    return parseOrcidForStorage(t);
  } catch (e) {
    if (e instanceof ZodError) {
      const first = e.issues[0]?.message;
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: first ?? "Invalid ORCID.",
      });
    }
    throw e;
  }
}

export const adminRouter = createTRPCRouter({
  listRoles: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.appRole.findMany({
      orderBy: [{ isSystem: "desc" }, { displayName: "asc" }],
    });
  }),

  listUsers: adminProcedure
    .input(
      z.object({
        skip: z.number().min(0).default(0),
        take: z.number().min(1).max(100).default(50),
        q: z.string().trim().max(200).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const q = input.q?.trim();
      const where =
        q && q.length > 0
          ? {
              OR: [
                { email: { contains: q, mode: "insensitive" as const } },
                { name: { contains: q, mode: "insensitive" as const } },
                { orcid: { contains: q, mode: "insensitive" as const } },
              ],
            }
          : undefined;
      const [rows, total] = await Promise.all([
        ctx.db.user.findMany({
          where,
          skip: input.skip,
          take: input.take,
          orderBy: [{ name: "asc" }, { email: "asc" }],
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            orcid: true,
            userAppRoles: {
              include: { role: true },
            },
          },
        }),
        ctx.db.user.count({ where }),
      ]);
      return { rows, total };
    }),

  updateUser: adminProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        name: z.string().max(200),
        email: z.union([z.literal(""), z.string().email().max(320)]),
        orcid: z.string().max(500),
        roleIds: z.array(z.string().uuid()).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.isDevMock && isDevMockUser(input.userId)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot edit the dev mock user.",
        });
      }
      const target = await ctx.db.user.findUnique({
        where: { id: input.userId },
      });
      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
      }
      await loadAndValidateRoleAssignment(ctx.db, input.userId, input.roleIds);

      const nameDb = input.name.trim() === "" ? null : input.name.trim();
      const emailDb = input.email === "" ? null : input.email.trim();

      if (emailDb !== null) {
        const clash = await ctx.db.user.findFirst({
          where: {
            email: emailDb,
            NOT: { id: input.userId },
          },
        });
        if (clash) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Another account already uses this email address.",
          });
        }
      }

      const orcidDb = parseAdminOrcidField(input.orcid);

      try {
        await ctx.db.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: input.userId },
            data: {
              name: nameDb,
              email: emailDb,
              orcid: orcidDb,
            },
          });
          await tx.userAppRole.deleteMany({ where: { userId: input.userId } });
          await tx.userAppRole.createMany({
            data: input.roleIds.map((roleId) => ({
              userId: input.userId,
              roleId,
            })),
          });
        });
      } catch (e) {
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === "P2002"
        ) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Another account already uses this email address.",
          });
        }
        throw e;
      }

      return { success: true as const };
    }),

  setUserRoles: adminProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        roleIds: z.array(z.string().uuid()).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.isDevMock && isDevMockUser(input.userId)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot change roles for the dev mock user.",
        });
      }
      const target = await ctx.db.user.findUnique({
        where: { id: input.userId },
      });
      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
      }
      await loadAndValidateRoleAssignment(ctx.db, input.userId, input.roleIds);
      await ctx.db.$transaction(async (tx) => {
        await tx.userAppRole.deleteMany({ where: { userId: input.userId } });
        await tx.userAppRole.createMany({
          data: input.roleIds.map((roleId) => ({
            userId: input.userId,
            roleId,
          })),
        });
      });
      return { success: true as const };
    }),

  createRole: adminProcedure
    .input(
      z.object({
        slug: slugSchema,
        displayName: z.string().min(1).max(120),
        description: z.string().max(500).optional(),
        canAccessLabs: z.boolean(),
        canManageUsers: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.appRole.findUnique({
        where: { slug: input.slug },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A role with this slug already exists.",
        });
      }
      return ctx.db.appRole.create({
        data: {
          slug: input.slug,
          displayName: input.displayName,
          description: input.description ?? null,
          isSystem: false,
          canAccessLabs: input.canAccessLabs,
          canManageUsers: input.canManageUsers,
        },
      });
    }),

  updateRole: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        displayName: z.string().min(1).max(120).optional(),
        description: z.string().max(500).nullable().optional(),
        canAccessLabs: z.boolean().optional(),
        canManageUsers: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const role = await ctx.db.appRole.findUnique({ where: { id: input.id } });
      if (!role) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Role not found." });
      }
      if (
        role.isSystem &&
        (input.canAccessLabs !== undefined || input.canManageUsers !== undefined)
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "System role capabilities cannot be changed from the admin UI.",
        });
      }
      const data: {
        displayName?: string;
        description?: string | null;
        canAccessLabs?: boolean;
        canManageUsers?: boolean;
      } = {};
      if (input.displayName !== undefined) data.displayName = input.displayName;
      if (input.description !== undefined) data.description = input.description;
      if (!role.isSystem) {
        if (input.canAccessLabs !== undefined)
          data.canAccessLabs = input.canAccessLabs;
        if (input.canManageUsers !== undefined)
          data.canManageUsers = input.canManageUsers;
      }
      return ctx.db.appRole.update({
        where: { id: input.id },
        data,
      });
    }),

  deleteRole: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const role = await ctx.db.appRole.findUnique({
        where: { id: input.id },
        include: {
          _count: { select: { userAppRoles: true } },
        },
      });
      if (!role) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Role not found." });
      }
      if (role.isSystem) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "System roles cannot be deleted.",
        });
      }
      if (role._count.userAppRoles > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Remove this role from all users before deleting it.",
        });
      }
      await ctx.db.appRole.delete({ where: { id: input.id } });
      return { success: true as const };
    }),

  deleteUser: adminProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      if (input.userId === ctx.userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot delete your own account from the admin console.",
        });
      }
      if (ctx.isDevMock && isDevMockUser(input.userId)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot delete the dev mock user.",
        });
      }
      const target = await ctx.db.user.findUnique({
        where: { id: input.userId },
      });
      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
      }
      if (await hasManageUsersCapability(ctx.db, input.userId)) {
        const others = await countUsersWithManageCapabilityExcluding(
          ctx.db,
          input.userId,
        );
        if (others === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot delete the last user with management access.",
          });
        }
      }
      await ctx.db.$transaction(async (tx) => {
        await tx.experiments.deleteMany({
          where: { createdby: input.userId },
        });
        await tx.molecules.deleteMany({
          where: { createdby: input.userId },
        });
        await tx.authenticator.deleteMany({
          where: { userId: input.userId },
        });
        await tx.account.deleteMany({
          where: { userId: input.userId },
        });
        await tx.session.deleteMany({
          where: { userId: input.userId },
        });
        await tx.user.delete({
          where: { id: input.userId },
        });
      });
      return { success: true as const };
    }),
});
