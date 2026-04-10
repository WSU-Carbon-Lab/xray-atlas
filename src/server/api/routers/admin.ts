/**
 * tRPC procedures for user and role administration. Every procedure is gated by
 * {@link adminProcedure}, which requires an authenticated user with at least one
 * role whose `permissions` grant user administration. Authorization is enforced again inside
 * mutations that could remove the last management-capable account.
 *
 * **Editing users:** `updateUser` updates `user.name` (display name), `user.email`
 * (optional directory contact email when set; unique in DB), `user.orcid`, and replaces all `user_app_role` rows in one
 * transaction. `setUserRoles` only replaces roles. Both enforce at most one lineage role among
 * `administrator`, `maintainer`, and `contributor` (any number of custom roles may be added).
 */
import { z, ZodError } from "zod";
import { TRPCError } from "@trpc/server";
import sharp from "sharp";
import { createTRPCRouter, adminProcedure } from "~/server/api/trpc";
import {
  countUsersWithManageCapabilityExcluding,
  hasManageUsersCapability,
} from "~/server/auth/privileged-role";
import { isDevMockUser } from "~/lib/dev-mock-data";
import { countLineageRolesInSlugs } from "~/lib/app-role-lineage";
import {
  normalizePermissionList,
  normalizeRoleDisplayName,
  parseRolePermissions,
  permissionsArraySchema,
  permissionsGrantManageUsers,
  roleSlugSchema,
  sessionProjectionFromPermissions,
  slugFromRoleDisplayName,
} from "~/lib/app-role-permissions";
import { roleHexColorSchema } from "~/lib/app-role-colors";
import { primaryHexFromRgbaBuffer } from "~/lib/extract-image-primary-hex";
import { parseOrcidForStorage } from "~/lib/orcid";
import { assertSafeRemoteImageUrl } from "~/server/utils/safe-remote-image-url";
import { Prisma, type PrismaClient } from "~/prisma/client";

const optionalFaviconUrlSchema = z.union([
  z.literal(""),
  z.string().url().max(2048),
]);

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
      let remote: URL;
      try {
        remote = assertSafeRemoteImageUrl(input.url);
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "Invalid URL.",
        });
      }
      const res = await fetch(remote.toString(), {
        headers: { Accept: "image/*,*/*;q=0.8" },
        redirect: "follow",
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) {
        return { hex: null };
      }
      const ct = (res.headers.get("content-type") ?? "").toLowerCase();
      if (!ct.startsWith("image/")) {
        return { hex: null };
      }
      const cl = res.headers.get("content-length");
      if (cl !== null && Number(cl) > ICON_FETCH_MAX_BYTES) {
        return { hex: null };
      }
      const ab = await res.arrayBuffer();
      if (ab.byteLength > ICON_FETCH_MAX_BYTES) {
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
