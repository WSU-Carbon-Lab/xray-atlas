/**
 * tRPC procedures for user and role administration. Every procedure is gated by
 * {@link adminProcedure}, which requires an authenticated user with at least one
 * role whose `permissions` grant user administration. Authorization is enforced again inside
 * mutations that could remove the last management-capable account.
 *
 * **Last admin:** Role-stripping checks are not run under a serializable transaction; concurrent
 * admins could theoretically both pass counts in a narrow race. Recovery is operational: core
 * maintainers can fix `next_auth.user_app_role` / `AppRole` assignments in Supabase or Postgres.
 *
 * **Editing users:** `updateUser` updates `user.name` (display name) and replaces all `user_app_role` rows in one
 * transaction. `setUserRoles` only replaces roles. Both enforce at most one lineage role among
 * `administrator`, `maintainer`, and `contributor` (any number of custom roles may be added).
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import sharp from "sharp";
import { createTRPCRouter, adminProcedure } from "~/server/api/trpc";
import {
  auditRequestMetaFromTrpcContext,
  emitAuditEvent,
  type AuditRequestMeta,
} from "~/server/audit";
import {
  assertAal3PasskeyBeforePrivilegedRole,
} from "~/server/auth/passkey-policy";
import {
  countUsersWithManageCapabilityExcluding,
  hasManageUsersCapability,
} from "~/server/auth/privileged-role";
import { countLineageRolesInSlugs } from "~/lib/app-role-lineage";
import { orcidUserIdSchema } from "~/lib/orcid";
import {
  normalizePermissionList,
  normalizeRoleDisplayName,
  parseRolePermissions,
  permissionsArraySchema,
  permissionsGrantLabsAccess,
  permissionsGrantManageUsers,
  roleSlugSchema,
  sessionProjectionFromPermissions,
  slugFromRoleDisplayName,
} from "~/lib/app-role-permissions";
import { roleHexColorSchema } from "~/lib/app-role-colors";
import { primaryHexFromRgbaBuffer } from "~/lib/extract-image-primary-hex";
import { fetchRemoteImageBytesForSampling } from "~/server/utils/safe-remote-image-url";
import type { Prisma, PrismaClient } from "~/prisma/client";

const optionalFaviconUrlSchema = z.union([
  z.literal(""),
  z.string().url().max(2048),
]);

async function emitRoleChangeAudits(
  tx: Prisma.TransactionClient,
  params: {
    actorUserId: string;
    subjectUserId: string;
    previousRoleIds: string[];
    nextRoleIds: string[];
    requestMeta: AuditRequestMeta;
    eventScope: string;
  },
): Promise<void> {
  const previous = new Set(params.previousRoleIds);
  const next = new Set(params.nextRoleIds);
  for (const roleId of params.nextRoleIds) {
    if (!previous.has(roleId)) {
      await emitAuditEvent({
        db: tx,
        eventType: "role.assign",
        eventScope: params.eventScope,
        actorUserId: params.actorUserId,
        subjectUserId: params.subjectUserId,
        payload: { roleId },
        requestMeta: params.requestMeta,
      });
    }
  }
  for (const roleId of params.previousRoleIds) {
    if (!next.has(roleId)) {
      await emitAuditEvent({
        db: tx,
        eventType: "role.revoke",
        eventScope: params.eventScope,
        actorUserId: params.actorUserId,
        subjectUserId: params.subjectUserId,
        payload: { roleId },
        requestMeta: params.requestMeta,
      });
    }
  }
}

const appRoleAdminDtoSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  displayName: z.string(),
  description: z.string().nullable(),
  isSystem: z.boolean(),
  canAccessLabs: z.boolean(),
  canManageUsers: z.boolean(),
  color: z.string(),
  faviconUrl: z.string().nullable(),
  isEmailable: z.boolean(),
  permissions: z.array(z.string()),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

const adminListUserRowSchema = z.object({
  id: orcidUserIdSchema,
  name: z.string().nullable(),
  image: z.string().nullable(),
  userAppRoles: z.array(
    z.object({
      role: z.object({
        id: z.string().uuid(),
        displayName: z.string(),
        slug: z.string(),
        color: z.string(),
        faviconUrl: z.string().nullable(),
        isSystem: z.boolean(),
      }),
    }),
  ),
});

function toAppRoleAdminDto(r: {
  id: string;
  slug: string;
  displayName: string;
  description: string | null;
  isSystem: boolean;
  canAccessLabs: boolean;
  canManageUsers: boolean;
  color: string;
  faviconUrl: string | null;
  isEmailable: boolean;
  permissions: unknown;
  createdAt: Date;
  updatedAt: Date;
}): z.infer<typeof appRoleAdminDtoSchema> {
  return {
    id: r.id,
    slug: r.slug,
    displayName: r.displayName,
    description: r.description,
    isSystem: r.isSystem,
    ...sessionProjectionFromPermissions(
      normalizePermissionList(parseRolePermissions(r.permissions)),
    ),
    color: r.color,
    faviconUrl: r.faviconUrl,
    isEmailable: r.isEmailable,
    permissions: normalizePermissionList(parseRolePermissions(r.permissions)),
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

async function loadAndValidateRoleAssignment(
  db: PrismaClient,
  userId: string,
  roleIds: string[],
): Promise<void> {
  const roles = await db.appRole.findMany({
    where: { id: { in: roleIds } },
    select: { id: true, slug: true, permissions: true },
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
  const willHaveManage = roles.some((r) =>
    permissionsGrantManageUsers(parseRolePermissions(r.permissions)),
  );
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
  const willRequireAal3 = roles.some((role) => {
    const permissions = parseRolePermissions(role.permissions);
    return (
      permissionsGrantManageUsers(permissions) ||
      permissionsGrantLabsAccess(permissions)
    );
  });
  try {
    await assertAal3PasskeyBeforePrivilegedRole(db, userId, willRequireAal3);
  } catch (error) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        error instanceof Error
          ? error.message
          : "Privileged role requires a hardware security key passkey.",
    });
  }
}

const ICON_FETCH_MAX_BYTES = 2 * 1024 * 1024;

export const adminRouter = createTRPCRouter({
  /**
   * Fetches a remote icon (http/https), decodes it server-side, and returns a dominant opaque `#RRGGBB`
   * suitable for role accent color. Used when admins paste a favicon URL; URL is SSRF-filtered.
   * Exposed as a query (read-only, idempotent) for correct HTTP/tRPC semantics.
   */
  sampleIconPrimaryHex: adminProcedure
    .input(z.object({ url: z.string().url().max(2048) }))
    .output(z.object({ hex: z.string().nullable() }))
    .query(async ({ input }) => {
      let ab: ArrayBuffer | null;
      try {
        ab = await fetchRemoteImageBytesForSampling(
          input.url,
          ICON_FETCH_MAX_BYTES,
          12_000,
        );
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "Invalid URL.",
        });
      }
      if (!ab) {
        return { hex: null };
      }
      const buf = Buffer.from(ab);
      let raw: Buffer;
      let width: number;
      let height: number;
      try {
        const out = await sharp(buf)
          .rotate()
          .resize(64, 64, { fit: "inside" })
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true });
        raw = out.data;
        width = out.info.width;
        height = out.info.height;
        if (out.info.channels !== 4) {
          return { hex: null };
        }
      } catch {
        return { hex: null };
      }
      const hex = primaryHexFromRgbaBuffer(
        new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength),
        width,
        height,
      );
      if (!hex) {
        return { hex: null };
      }
      const parsed = roleHexColorSchema.safeParse(hex);
      return { hex: parsed.success ? parsed.data.toUpperCase() : null };
    }),

  listRoles: adminProcedure
    .output(z.array(appRoleAdminDtoSchema))
    .query(async ({ ctx }) => {
      const rows = await ctx.db.appRole.findMany({
        orderBy: [{ isSystem: "desc" }, { displayName: "asc" }],
      });
      return rows.map(toAppRoleAdminDto);
    }),

  listUsers: adminProcedure
    .input(
      z.object({
        skip: z.number().min(0).default(0),
        take: z.number().min(1).max(100).default(50),
        q: z.string().trim().max(200).optional(),
      }),
    )
    .output(
      z.object({
        rows: z.array(adminListUserRowSchema),
        total: z.number(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const q = input.q?.trim();
      const where =
        q && q.length > 0
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" as const } },
                { id: { contains: q, mode: "insensitive" as const } },
              ],
            }
          : undefined;
      const [rows, total] = await Promise.all([
        ctx.db.user.findMany({
          where,
          skip: input.skip,
          take: input.take,
          orderBy: [{ name: "asc" }, { id: "asc" }],
          select: {
            id: true,
            name: true,
            image: true,
            userAppRoles: {
              include: {
                role: {
                  select: {
                    id: true,
                    displayName: true,
                    slug: true,
                    color: true,
                    faviconUrl: true,
                    isSystem: true,
                  },
                },
              },
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
        userId: orcidUserIdSchema,
        name: z.string().max(200),
        roleIds: z.array(z.string().uuid()).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const target = await ctx.db.user.findUnique({
        where: { id: input.userId },
      });
      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
      }
      await loadAndValidateRoleAssignment(ctx.db, input.userId, input.roleIds);

      const nameDb = input.name.trim() === "" ? null : input.name.trim();
      const previousRoles = await ctx.db.userAppRole.findMany({
        where: { userId: input.userId },
        select: { roleId: true },
      });
      const requestMeta = auditRequestMetaFromTrpcContext({
        clientIp: ctx.clientIp,
        userAgent: ctx.userAgent,
      });

      await ctx.db.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: input.userId },
          data: {
            name: nameDb,
          },
        });
        await tx.userAppRole.deleteMany({ where: { userId: input.userId } });
        await tx.userAppRole.createMany({
          data: input.roleIds.map((roleId) => ({
            userId: input.userId,
            roleId,
          })),
        });
        if (ctx.userId) {
          await emitRoleChangeAudits(tx, {
            actorUserId: ctx.userId,
            subjectUserId: input.userId,
            previousRoleIds: previousRoles.map((row) => row.roleId),
            nextRoleIds: input.roleIds,
            requestMeta,
            eventScope: "admin.updateUser",
          });
        }
      });

      return { success: true as const };
    }),

  setUserRoles: adminProcedure
    .input(
      z.object({
        userId: orcidUserIdSchema,
        roleIds: z.array(z.string().uuid()).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const target = await ctx.db.user.findUnique({
        where: { id: input.userId },
      });
      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
      }
      await loadAndValidateRoleAssignment(ctx.db, input.userId, input.roleIds);
      const previousRoles = await ctx.db.userAppRole.findMany({
        where: { userId: input.userId },
        select: { roleId: true },
      });
      const requestMeta = auditRequestMetaFromTrpcContext({
        clientIp: ctx.clientIp,
        userAgent: ctx.userAgent,
      });
      await ctx.db.$transaction(async (tx) => {
        await tx.userAppRole.deleteMany({ where: { userId: input.userId } });
        await tx.userAppRole.createMany({
          data: input.roleIds.map((roleId) => ({
            userId: input.userId,
            roleId,
          })),
        });
        if (ctx.userId) {
          await emitRoleChangeAudits(tx, {
            actorUserId: ctx.userId,
            subjectUserId: input.userId,
            previousRoleIds: previousRoles.map((row) => row.roleId),
            nextRoleIds: input.roleIds,
            requestMeta,
            eventScope: "admin.setUserRoles",
          });
        }
      });
      return { success: true as const };
    }),

  createRole: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(120),
        slug: roleSlugSchema.optional(),
        description: z.string().max(2000).optional(),
        color: roleHexColorSchema,
        faviconUrl: optionalFaviconUrlSchema.optional(),
        permissions: permissionsArraySchema,
        isEmailable: z.boolean(),
      }),
    )
    .output(appRoleAdminDtoSchema)
    .mutation(async ({ ctx, input }) => {
      const displayName = normalizeRoleDisplayName(input.name);
      const slug =
        input.slug ?? slugFromRoleDisplayName(displayName);
      if (slug.length < 2) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Could not derive a valid slug from the name; use at least two letters or digits.",
        });
      }
      const existing = await ctx.db.appRole.findUnique({
        where: { slug },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A role with this slug already exists.",
        });
      }
      const perms = normalizePermissionList(input.permissions);
      const projection = sessionProjectionFromPermissions(perms);
      const favicon =
        input.faviconUrl === undefined || input.faviconUrl === ""
          ? null
          : input.faviconUrl;
      const row = await ctx.db.appRole.create({
        data: {
          slug,
          displayName,
          description: input.description?.trim()
            ? input.description.trim()
            : null,
          color: input.color,
          faviconUrl: favicon,
          isEmailable: input.isEmailable,
          permissions: perms as unknown as Prisma.InputJsonValue,
          isSystem: false,
          canAccessLabs: projection.canAccessLabs,
          canManageUsers: projection.canManageUsers,
        },
      });
      return toAppRoleAdminDto(row);
    }),

  updateRole: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(120).optional(),
        description: z.string().max(2000).nullable().optional(),
        color: roleHexColorSchema.optional(),
        faviconUrl: optionalFaviconUrlSchema.nullable().optional(),
        permissions: permissionsArraySchema.optional(),
        isEmailable: z.boolean().optional(),
      }),
    )
    .output(appRoleAdminDtoSchema)
    .mutation(async ({ ctx, input }) => {
      const role = await ctx.db.appRole.findUnique({ where: { id: input.id } });
      if (!role) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Role not found." });
      }
      if (role.isSystem && input.permissions !== undefined) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "System role permissions cannot be changed.",
        });
      }
      const data: {
        displayName?: string;
        description?: string | null;
        color?: string;
        faviconUrl?: string | null;
        isEmailable?: boolean;
        permissions?: Prisma.InputJsonValue;
        canAccessLabs?: boolean;
        canManageUsers?: boolean;
      } = {};
      if (input.name !== undefined) {
        data.displayName = normalizeRoleDisplayName(input.name);
      }
      if (input.description !== undefined) {
        data.description = input.description;
      }
      if (input.color !== undefined) {
        data.color = input.color;
      }
      if (input.faviconUrl !== undefined) {
        data.faviconUrl =
          input.faviconUrl === "" || input.faviconUrl === null
            ? null
            : input.faviconUrl;
      }
      if (input.isEmailable !== undefined) {
        data.isEmailable = input.isEmailable;
      }
      if (!role.isSystem && input.permissions !== undefined) {
        const perms = normalizePermissionList(input.permissions);
        data.permissions = perms as unknown as Prisma.InputJsonValue;
        const projection = sessionProjectionFromPermissions(perms);
        data.canAccessLabs = projection.canAccessLabs;
        data.canManageUsers = projection.canManageUsers;
      }
      const row = await ctx.db.appRole.update({
        where: { id: input.id },
        data,
      });
      return toAppRoleAdminDto(row);
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

  // Hard-deletes today; Phase 4 may soft-disable via user.disabledAt before tombstone erasure.
  deleteUser: adminProcedure
    .input(z.object({ userId: orcidUserIdSchema }))
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
      const requestMeta = auditRequestMetaFromTrpcContext({
        clientIp: ctx.clientIp,
        userAgent: ctx.userAgent,
      });
      await ctx.db.$transaction(async (tx) => {
        await tx.experiments.deleteMany({
          where: { createdby: input.userId },
        });
        await tx.molecules.deleteMany({
          where: { createdby: input.userId },
        });
        await tx.moleculeviews.updateMany({
          where: { userid: input.userId },
          data: { userid: null },
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
        await emitAuditEvent({
          db: tx,
          eventType: "user.delete",
          eventScope: "admin.deleteUser",
          actorUserId: ctx.userId,
          subjectUserId: input.userId,
          requestMeta,
        });
      });
      return { success: true as const };
    }),
});
