import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { Prisma, ExperimentType, ProcessMethod } from "@prisma/client";
import { normalizeSampleSubstrate } from "~/lib/normalizeSampleSubstrate";
import {
  coalesceUploadedOrDerived,
  computeSpectrumDerivedScalarColumns,
} from "~/server/nexafs/computeSpectrumDerivedColumns";
import { fetchNexafsBrowseGrouped } from "~/server/nexafs/nexafsBrowseGroups";
import { hasPrivilegedRole } from "~/server/auth/privileged-role";

const emptyDerivedScalars = (): {
  od: Array<number | null>;
  massabsorption: Array<number | null>;
  beta: Array<number | null>;
} => ({ od: [], massabsorption: [], beta: [] });

const experimentCommentInputSchema = z.object({
  text: z.string().trim().min(1).max(2000),
});

type ExperimentQualityComment = {
  id: string;
  userId: string;
  userName: string | null;
  text: string;
  createdAt: string;
};

function spectrumRowsHaveUploadedDerivedScalars(
  points: ReadonlyArray<{
    od?: number;
    massabsorption?: number;
    beta?: number;
  }>,
): boolean {
  if (points.length === 0) return false;
  return points.every(
    (p) =>
      typeof p.od === "number" &&
      Number.isFinite(p.od) &&
      typeof p.massabsorption === "number" &&
      Number.isFinite(p.massabsorption) &&
      typeof p.beta === "number" &&
      Number.isFinite(p.beta),
  );
}

export const experimentsRouter = createTRPCRouter({
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const experiment = await ctx.db.experiments.findUnique({
        where: { id: input.id },
        include: {
          samples: {
            include: {
              molecules: {
                include: {
                  moleculesynonyms: {
                    orderBy: [{ order: "asc" }, { synonym: "asc" }],
                  },
                },
              },
            },
          },
          edges: true,
          instruments: {
            include: {
              facilities: true,
            },
          },
          polarizations: true,
          calibrationmethods: true,
          experimentpublications: {
            include: {
              publications: true,
            },
          },
          experimentquality: true,
          spectrumpoints: {
            orderBy: {
              energyev: "asc",
            },
            take: 1000, // Limit spectrum points for performance
          },
        },
      });

      if (!experiment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Experiment not found",
        });
      }

      return experiment;
    }),

  list: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        cursor: z.string().uuid().optional(),
        sampleId: z.string().uuid().optional(),
        edgeId: z.string().uuid().optional(),
        instrumentId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: {
        sampleid?: string;
        edgeid?: string;
        instrumentid?: string;
      } = {};

      if (input.sampleId) {
        where.sampleid = input.sampleId;
      }
      if (input.edgeId) {
        where.edgeid = input.edgeId;
      }
      if (input.instrumentId) {
        where.instrumentid = input.instrumentId;
      }
      const experiments = await ctx.db.experiments.findMany({
        where,
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        include: {
          samples: {
            include: {
              molecules: {
                include: {
                  moleculesynonyms: {
                    orderBy: [{ order: "asc" }],
                    take: 1,
                  },
                },
              },
            },
          },
          edges: true,
          instruments: true,
        },
        orderBy: {
          createdat: "desc",
        },
      });

      let nextCursor: string | undefined = undefined;
      if (experiments.length > input.limit) {
        const nextItem = experiments.pop();
        nextCursor = nextItem?.id;
      }

      return {
        experiments,
        nextCursor,
      };
    }),

  browseMoleculeOptions: publicProcedure
    .input(
      z.object({
        query: z.string().optional(),
        limit: z.number().min(1).max(200).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const base: Prisma.moleculesWhereInput = {
        samples: {
          some: {
            experiments: {
              some: {},
            },
          },
        },
      };
      const q = input.query?.trim();
      const where: Prisma.moleculesWhereInput = q
        ? {
            AND: [
              base,
              {
                OR: [
                  { iupacname: { contains: q, mode: "insensitive" } },
                  { chemicalformula: { contains: q, mode: "insensitive" } },
                ],
              },
            ],
          }
        : base;

      return ctx.db.molecules.findMany({
        where,
        select: {
          id: true,
          iupacname: true,
          chemicalformula: true,
        },
        orderBy: { iupacname: "asc" },
        take: input.limit,
      });
    }),

  browseMoleculeSummary: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.molecules.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          iupacname: true,
          chemicalformula: true,
        },
      });
    }),

  browseList: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(12),
        offset: z.number().min(0).default(0),
        sortBy: z
          .enum(["newest", "upload", "molecule", "edge", "instrument"])
          .default("newest"),
        moleculeId: z.string().uuid().optional(),
        edgeId: z.string().uuid().optional(),
        instrumentId: z.string().optional(),
        experimentType: z.nativeEnum(ExperimentType).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { groups, total } = await fetchNexafsBrowseGrouped(ctx.db, {
        viewerUserId: ctx.userId,
        filters: {
          moleculeId: input.moleculeId,
          edgeId: input.edgeId,
          instrumentId: input.instrumentId,
          experimentType: input.experimentType,
        },
        searchQuery: null,
        sortBy: input.sortBy,
        limit: input.limit,
        offset: input.offset,
      });

      return {
        groups,
        total,
        hasMore: input.offset + groups.length < total,
      };
    }),

  browseSearch: publicProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().min(1).max(50).default(12),
        offset: z.number().min(0).default(0),
        sortBy: z
          .enum(["newest", "upload", "molecule", "edge", "instrument"])
          .default("newest"),
        moleculeId: z.string().uuid().optional(),
        edgeId: z.string().uuid().optional(),
        instrumentId: z.string().optional(),
        experimentType: z.nativeEnum(ExperimentType).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { groups, total } = await fetchNexafsBrowseGrouped(ctx.db, {
        viewerUserId: ctx.userId,
        filters: {
          moleculeId: input.moleculeId,
          edgeId: input.edgeId,
          instrumentId: input.instrumentId,
          experimentType: input.experimentType,
        },
        searchQuery: input.query.trim(),
        sortBy: input.sortBy,
        limit: input.limit,
        offset: input.offset,
      });

      return { groups, total };
    }),

  findByPolarization: publicProcedure
    .input(
      z.object({
        azimuthDeg: z.number(),
        polarDeg: z.number(),
        tolerance: z.number().default(0.1), // Default tolerance in degrees
        limit: z.number().min(1).max(100).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Uses idx_polarization_geom for efficient geometry lookups
      // Find polarizations within tolerance, then get their experiments
      const polarizations = await ctx.db.polarizations.findMany({
        where: {
          azimuthdeg: {
            gte: input.azimuthDeg - input.tolerance,
            lte: input.azimuthDeg + input.tolerance,
          },
          polardeg: {
            gte: input.polarDeg - input.tolerance,
            lte: input.polarDeg + input.tolerance,
          },
        },
        include: {
          experiments: {
            take: input.limit,
            include: {
              samples: {
                include: {
                  molecules: {
                    include: {
                      moleculesynonyms: {
                        orderBy: [{ order: "asc" }],
                        take: 1,
                      },
                    },
                  },
                },
              },
              edges: true,
              instruments: true,
            },
            orderBy: {
              createdat: "desc",
            },
          },
        },
      });

      // Flatten experiments from all matching polarizations
      const experiments = polarizations.flatMap((p) => p.experiments);

      return {
        experiments: experiments.slice(0, input.limit),
        count: experiments.length,
      };
    }),

  toggleFavorite: protectedProcedure
    .input(z.object({ experimentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const experiment = await ctx.db.experiments.findUnique({
        where: { id: input.experimentId },
        select: { id: true },
      });
      if (!experiment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Experiment not found",
        });
      }

      const existing = await ctx.db.experimentfavorites.findUnique({
        where: {
          experimentid_userid: {
            experimentid: input.experimentId,
            userid: ctx.userId,
          },
        },
      });

      if (existing) {
        await ctx.db.$transaction(async (tx) => {
          await tx.experimentfavorites.delete({
            where: {
              experimentid_userid: {
                experimentid: input.experimentId,
                userid: ctx.userId,
              },
            },
          });
          await tx.experimentquality.upsert({
            where: { experimentid: input.experimentId },
            create: { experimentid: input.experimentId, favorites: 0 },
            update: {
              favorites: {
                decrement: 1,
              },
            },
          });
          await tx.$executeRaw`
            UPDATE experimentquality
            SET favorites = GREATEST(favorites, 0)
            WHERE experimentid = ${input.experimentId}::uuid
          `;
        });
        const quality = await ctx.db.experimentquality.findUnique({
          where: { experimentid: input.experimentId },
          select: { favorites: true },
        });
        return { favorited: false, favoriteCount: quality?.favorites ?? 0 };
      }

      await ctx.db.$transaction(async (tx) => {
        await tx.experimentfavorites.create({
          data: {
            experimentid: input.experimentId,
            userid: ctx.userId,
          },
        });
        await tx.experimentquality.upsert({
          where: { experimentid: input.experimentId },
          create: { experimentid: input.experimentId, favorites: 1 },
          update: {
            favorites: {
              increment: 1,
            },
          },
        });
      });

      const quality = await ctx.db.experimentquality.findUnique({
        where: { experimentid: input.experimentId },
        select: { favorites: true },
      });
      return { favorited: true, favoriteCount: quality?.favorites ?? 1 };
    }),

  getQuality: publicProcedure
    .input(z.object({ experimentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const quality = await ctx.db.experimentquality.findUnique({
        where: { experimentid: input.experimentId },
        select: {
          favorites: true,
          comments: true,
        },
      });
      const comments = Array.isArray(quality?.comments)
        ? (quality.comments as ExperimentQualityComment[])
        : [];
      return {
        favorites: quality?.favorites ?? 0,
        comments,
      };
    }),

  addQualityComment: protectedProcedure
    .input(
      z.object({
        experimentId: z.string().uuid(),
        comment: experimentCommentInputSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const author = await ctx.db.user.findUnique({
        where: { id: ctx.userId },
        select: { name: true },
      });
      const existing = await ctx.db.experimentquality.findUnique({
        where: { experimentid: input.experimentId },
        select: { comments: true, favorites: true },
      });
      const currentComments = Array.isArray(existing?.comments)
        ? (existing.comments as ExperimentQualityComment[])
        : [];
      const nextComment: ExperimentQualityComment = {
        id: crypto.randomUUID(),
        userId: ctx.userId,
        userName: author?.name ?? null,
        text: input.comment.text,
        createdAt: new Date().toISOString(),
      };
      const comments = [...currentComments, nextComment];
      await ctx.db.experimentquality.upsert({
        where: { experimentid: input.experimentId },
        create: {
          experimentid: input.experimentId,
          favorites: existing?.favorites ?? 0,
          comments,
        },
        update: {
          comments,
        },
      });
      return { comments };
    }),

  removeQualityComment: protectedProcedure
    .input(
      z.object({
        experimentId: z.string().uuid(),
        commentId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.experimentquality.findUnique({
        where: { experimentid: input.experimentId },
        select: { comments: true },
      });
      const currentComments = Array.isArray(existing?.comments)
        ? (existing.comments as ExperimentQualityComment[])
        : [];
      const target = currentComments.find(
        (comment) => comment.id === input.commentId,
      );
      if (!target) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Comment not found",
        });
      }
      const isAuthor = target.userId === ctx.userId;
      const isPrivilegedUser = await hasPrivilegedRole(ctx.db, ctx.userId);
      if (!isAuthor && !isPrivilegedUser) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to remove this comment",
        });
      }
      const comments = currentComments.filter(
        (comment) => comment.id !== input.commentId,
      );
      await ctx.db.experimentquality.update({
        where: { experimentid: input.experimentId },
        data: { comments },
      });
      return { comments };
    }),

  listEdges: publicProcedure.query(async ({ ctx }) => {
    const edges = await ctx.db.edges.findMany();
    const priorityRank = (e: { targetatom: string; corestate: string }) => {
      const atom = e.targetatom.trim().toUpperCase();
      const cs = e.corestate.trim().toUpperCase();
      const isK = cs === "K";
      const cEdge = isK && (atom === "C" || atom === "CARBON");
      const nEdge = isK && (atom === "N" || atom === "NITROGEN");
      const sEdge =
        isK && (atom === "S" || atom === "SULFUR" || atom === "SULPHUR");
      if (cEdge) return 0;
      if (nEdge) return 1;
      if (sEdge) return 2;
      return 3;
    };
    edges.sort((a, b) => {
      const pa = priorityRank(a);
      const pb = priorityRank(b);
      if (pa !== pb) return pa - pb;
      const t = a.targetatom.localeCompare(b.targetatom, undefined, {
        sensitivity: "base",
      });
      if (t !== 0) return t;
      return a.corestate.localeCompare(b.corestate, undefined, {
        sensitivity: "base",
      });
    });
    return { edges };
  }),

  listCalibrationMethods: publicProcedure.query(async ({ ctx }) => {
    const methods = await ctx.db.calibrationmethods.findMany({
      orderBy: { name: "asc" },
    });

    return { calibrationMethods: methods };
  }),

  createEdge: protectedProcedure
    .input(
      z.object({
        targetatom: z.string().min(1, "Target atom is required"),
        corestate: z.string().min(1, "Core state is required"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const isPrivilegedUser = await hasPrivilegedRole(ctx.db, ctx.userId);
      if (!isPrivilegedUser) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only maintainers can create new edges",
        });
      }
      // Check if edge already exists
      const existingEdge = await ctx.db.edges.findUnique({
        where: {
          targetatom_corestate: {
            targetatom: input.targetatom,
            corestate: input.corestate,
          },
        },
      });

      if (existingEdge) {
        return existingEdge;
      }

      // Create new edge
      const edge = await ctx.db.edges.create({
        data: {
          targetatom: input.targetatom,
          corestate: input.corestate,
        },
      });

      return edge;
    }),

  createCalibrationMethod: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const isPrivilegedUser = await hasPrivilegedRole(ctx.db, ctx.userId);
      if (!isPrivilegedUser) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only maintainers can create calibration methods",
        });
      }
      // Check if calibration method already exists
      const existingMethod = await ctx.db.calibrationmethods.findUnique({
        where: { name: input.name.trim() },
      });

      if (existingMethod) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A calibration method with this name already exists",
        });
      }

      // Create new calibration method
      const method = await ctx.db.calibrationmethods.create({
        data: {
          name: input.name.trim(),
          description: input.description?.trim() ?? null,
        },
      });

      return method;
    }),

  create: protectedProcedure
    .input(
      z.object({
        sampleid: z.string().uuid(),
        instrumentid: z.string(),
        edgeid: z.string().uuid(),
        polarizationid: z.string().uuid(),
        calibrationid: z.string().uuid().optional(),
        isstandard: z.boolean().default(false),
        referencestandard: z.string().optional(),
        experimenttype: z.nativeEnum(ExperimentType).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const kind =
        input.experimenttype != null
          ? await ctx.db.nexafsexperimentkinds.findUnique({
              where: { experimenttype: input.experimenttype },
              select: { id: true },
            })
          : null;

      const experimentId = crypto.randomUUID();

      const experiment = await ctx.db.experiments.create({
        data: {
          id: experimentId,
          ...input,
          createdby: ctx.userId ?? undefined,
          experimenttype: input.experimenttype ?? null,
          nexafsexperimentkindid: kind?.id ?? null,
        },
        include: {
          samples: true,
          edges: true,
          instruments: true,
        },
      });

      return experiment;
    }),

  createWithSpectrum: protectedProcedure
    .input(
      z.object({
        sample: z.object({
          moleculeId: z.string().uuid(),
          identifier: z.string().optional(),
          processMethod: z.nativeEnum(ProcessMethod).optional(),
          substrate: z.string().optional(),
          solvent: z.string().optional(),
          thickness: z.number().optional(),
          molecularWeight: z.number().optional(),
          vendor: z.object({
            existingVendorId: z.string().uuid().optional(),
            name: z.string().optional(),
            url: z.string().url().optional(),
          }),
        }),
        experiment: z.object({
          instrumentId: z.string(),
          edgeId: z.string().uuid(),
          experimentType: z.nativeEnum(ExperimentType),
          calibrationId: z.string().uuid().optional(),
          referenceStandard: z.string().optional(),
          isStandard: z.boolean().optional(),
        }),
        geometry: z
          .object({
            mode: z.enum(["fixed", "csv"]),
            fixed: z
              .object({
                theta: z.number(),
                phi: z.number(),
              })
              .optional(),
            csvGeometries: z
              .array(
                z.object({
                  theta: z.number(),
                  phi: z.number(),
                }),
              )
              .optional(),
          })
          .superRefine((value, ctx) => {
            if (value.mode === "fixed" && !value.fixed) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Fixed geometry requires theta and phi values",
              });
            }
            if (
              value.mode === "csv" &&
              (!value.csvGeometries || value.csvGeometries.length === 0)
            ) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message:
                  "CSV geometry mode requires at least one geometry entry",
              });
            }
          }),
        spectrum: z.object({
          points: z
            .array(
              z.object({
                energy: z.number(),
                absorption: z.number(),
                theta: z.number().optional(),
                phi: z.number().optional(),
                i0: z.number().optional(),
                od: z.number().optional(),
                massabsorption: z.number().optional(),
                beta: z.number().optional(),
              }),
            )
            .min(1, "Spectrum CSV must contain at least one row"),
        }),
        peaksets: z
          .array(
            z.object({
              energy: z.number(),
              intensity: z.number().optional(),
              bond: z.string().optional(),
              transition: z.string().optional(),
            }),
          )
          .optional(),
        collectedByUserIds: z.array(z.string().uuid()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const {
        sample: sampleInput,
        experiment: experimentInput,
        geometry: geometryInput,
        spectrum: spectrumInput,
        collectedByUserIds,
      } = input;
      const isPrivilegedUser = await hasPrivilegedRole(ctx.db, ctx.userId);
      const requestedCollectedBy = [...new Set(collectedByUserIds ?? [])];
      if (
        !isPrivilegedUser &&
        requestedCollectedBy.some((userId) => userId !== ctx.userId)
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only attribute collection to your own user account",
        });
      }

      const moleculeRow = await ctx.db.molecules.findUnique({
        where: { id: sampleInput.moleculeId },
        select: { chemicalformula: true },
      });
      const chemicalFormula = moleculeRow?.chemicalformula ?? null;

      type SpectrumPoint = (typeof spectrumInput.points)[number];

      interface GeometryGroup {
        theta: number;
        phi: number;
        points: SpectrumPoint[];
      }

      const geometryGroups: GeometryGroup[] = [];

      if (geometryInput.mode === "fixed") {
        const fixedGeometry = geometryInput.fixed!;
        geometryGroups.push({
          theta: fixedGeometry.theta,
          phi: fixedGeometry.phi,
          points: spectrumInput.points.map((point) => ({
            ...point,
            theta: fixedGeometry.theta,
            phi: fixedGeometry.phi,
          })),
        });
      } else {
        const groupedByGeometry = new Map<string, GeometryGroup>();

        for (const point of spectrumInput.points) {
          if (point.theta === undefined || point.phi === undefined) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "Spectrum CSV must include theta and phi columns when using CSV geometry mode.",
            });
          }

          const key = `${point.theta}:${point.phi}`;
          if (!groupedByGeometry.has(key)) {
            groupedByGeometry.set(key, {
              theta: point.theta,
              phi: point.phi,
              points: [],
            });
          }

          groupedByGeometry.get(key)!.points.push(point);
        }

        if (groupedByGeometry.size === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No spectrum points with geometry information were found.",
          });
        }

        geometryGroups.push(...groupedByGeometry.values());
      }

      const derivedByGroup: Array<
        Awaited<ReturnType<typeof computeSpectrumDerivedScalarColumns>>
      > = [];

      for (const group of geometryGroups) {
        if (spectrumRowsHaveUploadedDerivedScalars(group.points)) {
          derivedByGroup.push(emptyDerivedScalars());
        } else {
          derivedByGroup.push(
            await computeSpectrumDerivedScalarColumns(
              group.points,
              chemicalFormula,
            ),
          );
        }
      }

      const transactionResult = await ctx.db.$transaction(
        async (tx) => {
          const kind =
            experimentInput.experimentType != null
              ? await tx.nexafsexperimentkinds.findUnique({
                  where: { experimenttype: experimentInput.experimentType },
                  select: { id: true },
                })
              : null;
          const normalizedCollectedBy =
            requestedCollectedBy.length > 0
              ? requestedCollectedBy
              : ctx.userId != null
                ? [ctx.userId]
                : [];
          if (normalizedCollectedBy.length > 0) {
            const existingUsers = await tx.user.findMany({
              where: { id: { in: normalizedCollectedBy } },
              select: { id: true },
            });
            if (existingUsers.length !== normalizedCollectedBy.length) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "One or more collected-by users do not exist",
              });
            }
          }

          // Resolve vendor
          let vendorId: string | null =
            sampleInput.vendor.existingVendorId ?? null;
          const vendorNameTrimmed = sampleInput.vendor.name?.trim();

          if (!vendorId && vendorNameTrimmed) {
            const existingVendor = await tx.vendors.findUnique({
              where: { name: vendorNameTrimmed },
            });

            if (existingVendor) {
              vendorId = existingVendor.id;
            } else {
              const newVendor = await tx.vendors.create({
                data: {
                  name: vendorNameTrimmed,
                  url: sampleInput.vendor.url?.trim() ?? null,
                },
              });
              vendorId = newVendor.id;
            }
          }

          if (!vendorId && !vendorNameTrimmed) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "Please select an existing vendor or provide a new vendor name.",
            });
          }

          // Generate identifier if not provided, or ensure it's unique if provided
          let sampleIdentifier = sampleInput.identifier?.trim();

          if (!sampleIdentifier) {
            // Generate a unique identifier if not provided
            // Format: SAMPLE-{timestamp}-{random}
            const timestamp = Date.now();
            const random = Math.random()
              .toString(36)
              .substring(2, 8)
              .toUpperCase();
            sampleIdentifier = `SAMPLE-${timestamp}-${random}`;

            // Ensure uniqueness (very unlikely but check anyway)
            let counter = 0;
            while (counter < 10) {
              const existingSample = await tx.samples.findUnique({
                where: { identifier: sampleIdentifier },
              });

              if (!existingSample) break;

              // Regenerate if collision
              const newRandom = Math.random()
                .toString(36)
                .substring(2, 8)
                .toUpperCase();
              sampleIdentifier = `SAMPLE-${timestamp}-${newRandom}`;
              counter++;
            }
          }

          // Check if sample with this identifier already exists
          let sample = await tx.samples.findUnique({
            where: { identifier: sampleIdentifier },
          });

          if (!sample) {
            // Create new sample if it doesn't exist
            sample = await tx.samples.create({
              data: {
                moleculeid: sampleInput.moleculeId,
                identifier: sampleIdentifier,
                processmethod: sampleInput.processMethod ?? null,
                substrate: normalizeSampleSubstrate(sampleInput.substrate),
                solvent: sampleInput.solvent?.trim() ?? null,
                thickness: sampleInput.thickness ?? null,
                molecularweight: sampleInput.molecularWeight ?? null,
                vendorid: vendorId,
              },
            });
          } else {
            if (sample.moleculeid !== sampleInput.moleculeId) {
              throw new TRPCError({
                code: "CONFLICT",
                message:
                  "A sample with this identifier already exists for a different molecule.",
              });
            }
          }

          const polarizationIdByGeometry = new Map<string, string>();

          const getOrCreatePolarizationId = async (
            theta: number,
            phi: number,
          ) => {
            const key = `${theta}:${phi}`;
            const cached = polarizationIdByGeometry.get(key);
            if (cached) return cached;

            const existingPolarization = await tx.polarizations.findFirst({
              where: {
                polardeg: new Prisma.Decimal(theta),
                azimuthdeg: new Prisma.Decimal(phi),
              },
              select: { id: true },
            });

            if (existingPolarization) {
              polarizationIdByGeometry.set(key, existingPolarization.id);
              return existingPolarization.id;
            }

            const createdPolarization = await tx.polarizations.create({
              data: {
                polardeg: new Prisma.Decimal(theta),
                azimuthdeg: new Prisma.Decimal(phi),
              },
              select: { id: true },
            });
            polarizationIdByGeometry.set(key, createdPolarization.id);
            return createdPolarization.id;
          };

          const firstGeometry = geometryGroups[0];
          if (!firstGeometry) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "No geometry groups were resolved from the uploaded spectrum.",
            });
          }

          const defaultPolarizationId = await getOrCreatePolarizationId(
            firstGeometry.theta,
            firstGeometry.phi,
          );

          const experimentId = crypto.randomUUID();
          const experiment = await tx.experiments.create({
            data: {
              id: experimentId,
              sampleid: sample.id,
              instrumentid: experimentInput.instrumentId,
              edgeid: experimentInput.edgeId,
              polarizationid: defaultPolarizationId,
              calibrationid: experimentInput.calibrationId ?? null,
              isstandard: experimentInput.isStandard ?? false,
              referencestandard: experimentInput.referenceStandard ?? null,
              createdby: ctx.userId ?? undefined,
              experimenttype: experimentInput.experimentType,
              nexafsexperimentkindid: kind?.id ?? null,
              collectedbyuserids: normalizedCollectedBy,
            },
            include: {
              samples: true,
              edges: true,
              instruments: true,
            },
          });

          let spectrumPointsCreated = 0;
          for (
            let groupIndex = 0;
            groupIndex < geometryGroups.length;
            groupIndex += 1
          ) {
            const group = geometryGroups[groupIndex]!;
            const derived = derivedByGroup[groupIndex]!;
            const polarizationId = await getOrCreatePolarizationId(
              group.theta,
              group.phi,
            );

            const spectrumData = group.points.map((point, i) => ({
              experimentid: experiment.id,
              polarizationid: polarizationId,
              energyev: point.energy,
              rawabs: point.absorption,
              od: coalesceUploadedOrDerived(point.od, derived.od[i] ?? null),
              massabsorption: coalesceUploadedOrDerived(
                point.massabsorption,
                derived.massabsorption[i] ?? null,
              ),
              beta: coalesceUploadedOrDerived(
                point.beta,
                derived.beta[i] ?? null,
              ),
              i0: coalesceUploadedOrDerived(point.i0, null),
            }));

            if (spectrumData.length > 0) {
              const created = await tx.spectrumpoints.createMany({
                data: spectrumData,
              });
              spectrumPointsCreated += created.count;
            }
          }

          if (input.peaksets && input.peaksets.length > 0) {
            const peaksetsData = input.peaksets.map((peak) => ({
              experimentid: experiment.id,
              energyev: peak.energy,
              intensity: peak.intensity ?? null,
              bond: peak.bond ?? null,
              transition: peak.transition ?? null,
            }));
            await tx.peaksets.createMany({ data: peaksetsData });
          }

          return {
            sample,
            experiments: [
              {
                experiment,
                spectrumPointsCreated,
              },
            ],
          };
        },
        { timeout: 60000 },
      );

      return transactionResult;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        calibrationid: z.string().uuid().optional(),
        isstandard: z.boolean().optional(),
        referencestandard: z.string().optional(),
        experimenttype: z.nativeEnum(ExperimentType).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;
      const existingExperiment = await ctx.db.experiments.findUnique({
        where: { id },
        select: { createdby: true },
      });
      if (!existingExperiment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Experiment not found",
        });
      }
      const canMutate =
        existingExperiment.createdby != null &&
        ctx.userId != null &&
        existingExperiment.createdby === ctx.userId;
      const isPrivilegedUser = await hasPrivilegedRole(ctx.db, ctx.userId);
      if (!canMutate && !isPrivilegedUser) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to update this experiment",
        });
      }

      const experiment = await ctx.db.experiments.update({
        where: { id },
        data: updateData,
        include: {
          samples: true,
          edges: true,
          instruments: true,
        },
      });

      return experiment;
    }),
});
