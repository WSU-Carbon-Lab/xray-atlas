import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { ProcessMethod } from "@prisma/client";

export const samplesRouter = createTRPCRouter({
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const sample = await ctx.db.samples.findUnique({
        where: { id: input.id },
        include: {
          molecules: {
            include: {
              moleculesynonyms: {
                orderBy: [{ order: "asc" }, { synonym: "asc" }], // Order=0 first
              },
            },
          },
          experiments: {
            include: {
              edges: true,
              instruments: true,
            },
            orderBy: {
              createdat: "desc",
            },
          },
        },
      });

      if (!sample) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Sample not found",
        });
      }

      return sample;
    }),

  list: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        cursor: z.string().uuid().optional(),
        moleculeId: z.string().uuid().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: {
        moleculeid?: string;
      } = {};

      if (input.moleculeId) {
        where.moleculeid = input.moleculeId;
      }

      const samples = await ctx.db.samples.findMany({
        where,
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        include: {
          molecules: {
            include: {
              moleculesynonyms: {
                take: 1,
              },
            },
          },
        },
        orderBy: {
          createdat: "desc",
        },
      });

      let nextCursor: string | undefined = undefined;
      if (samples.length > input.limit) {
        const nextItem = samples.pop();
        nextCursor = nextItem?.id;
      }

      return {
        samples,
        nextCursor,
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        moleculeid: z.string().uuid(),
        identifier: z.string().optional(),
        processMethod: z.nativeEnum(ProcessMethod).optional(),
        substrate: z.string().optional(),
        solvent: z.string().optional(),
        thickness: z.number().optional(),
        molecularWeight: z.number().optional(),
        preparationdate: z.date().optional(),
        vendorid: z.string().uuid().optional(),
        vendorName: z.string().optional(), // For creating vendor on-the-fly
        vendorUrl: z.string().url().optional().or(z.literal("")),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      let vendorId = input.vendorid;

      // Create vendor on-the-fly if vendorName is provided but vendorid is not
      if (!vendorId && input.vendorName) {
        // Check if vendor already exists
        const existingVendor = await ctx.db.vendors.findUnique({
          where: { name: input.vendorName.trim() },
        });

        if (existingVendor) {
          vendorId = existingVendor.id;
        } else {
          // Create new vendor
          const newVendor = await ctx.db.vendors.create({
            data: {
              name: input.vendorName.trim(),
              url: input.vendorUrl?.trim() || null,
            },
          });
          vendorId = newVendor.id;
        }
      }

      // Generate identifier if not provided
      let sampleIdentifier = input.identifier?.trim();
      if (!sampleIdentifier) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        sampleIdentifier = `SAMPLE-${timestamp}-${random}`;

        // Ensure uniqueness
        let counter = 0;
        while (counter < 10) {
          const existingSample = await ctx.db.samples.findUnique({
            where: { identifier: sampleIdentifier },
          });

          if (!existingSample) break;

          const newRandom = Math.random().toString(36).substring(2, 8).toUpperCase();
          sampleIdentifier = `SAMPLE-${timestamp}-${newRandom}`;
          counter++;
        }
      } else {
        // Check if provided identifier is unique
        const existingSample = await ctx.db.samples.findUnique({
          where: { identifier: sampleIdentifier },
        });

        if (existingSample) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A sample with this identifier already exists. Please choose another identifier.",
          });
        }
      }

      const sample = await ctx.db.samples.create({
        data: {
          moleculeid: input.moleculeid,
          identifier: sampleIdentifier,
          processmethod: input.processMethod ?? null,
          substrate: input.substrate?.trim() || null,
          solvent: input.solvent?.trim() || null,
          thickness: input.thickness ?? null,
          molecularweight: input.molecularWeight ?? null,
          preparationdate: input.preparationdate,
          vendorid: vendorId,
        },
        include: {
          molecules: {
            include: {
              moleculesynonyms: {
                orderBy: [{ order: "asc" }, { synonym: "asc" }], // Order=0 first
              },
            },
          },
          vendors: true,
        },
      });

      return sample;
    }),
});
