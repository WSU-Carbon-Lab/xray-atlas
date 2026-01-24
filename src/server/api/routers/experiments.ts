import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { Prisma, ExperimentType, ProcessMethod } from "@prisma/client";

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
        measurementDate: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Build where clause to leverage idx_experiment_lookup composite index
      // When multiple fields are provided, PostgreSQL will use the composite index efficiently
      const where: {
        sampleid?: string;
        edgeid?: string;
        instrumentid?: string;
        measurementdate?: Date;
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
      if (input.measurementDate) {
        where.measurementdate = input.measurementDate;
      }

      // Prisma will automatically use idx_experiment_lookup when filtering by these fields
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

  listEdges: publicProcedure.query(async ({ ctx }) => {
    const edges = await ctx.db.edges.findMany({
      orderBy: [{ targetatom: "asc" }, { corestate: "asc" }],
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
        measurementdate: z.date(),
        experimenttype: z.nativeEnum(ExperimentType).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const experiment = await ctx.db.experiments.create({
        data: {
          ...input,
          createdby: ctx.userId ?? undefined,
          experimenttype: input.experimenttype ?? null,
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
          preparationDate: z.string().datetime().optional(),
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
          measurementDate: z.string().datetime().optional(),
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
            if (value.mode === "csv" && (!value.csvGeometries || value.csvGeometries.length === 0)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "CSV geometry mode requires at least one geometry entry",
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
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const {
        sample: sampleInput,
        experiment: experimentInput,
        geometry: geometryInput,
        spectrum: spectrumInput,
      } = input;

      const parseOptionalDate = (value?: string) => {
        if (!value) return null;
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid date format. Please provide ISO date strings.",
          });
        }
        return date;
      };

      const transactionResult = await ctx.db.$transaction(async (tx) => {
        // Resolve vendor
        let vendorId: string | null = sampleInput.vendor.existingVendorId ?? null;
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
            message: "Please select an existing vendor or provide a new vendor name.",
          });
        }

        // Generate identifier if not provided, or ensure it's unique if provided
        let sampleIdentifier = sampleInput.identifier?.trim();

        if (!sampleIdentifier) {
          // Generate a unique identifier if not provided
          // Format: SAMPLE-{timestamp}-{random}
          const timestamp = Date.now();
          const random = Math.random().toString(36).substring(2, 8).toUpperCase();
          sampleIdentifier = `SAMPLE-${timestamp}-${random}`;

          // Ensure uniqueness (very unlikely but check anyway)
          let counter = 0;
          while (counter < 10) {
            const existingSample = await tx.samples.findUnique({
              where: { identifier: sampleIdentifier },
            });

            if (!existingSample) break;

            // Regenerate if collision
            const newRandom = Math.random().toString(36).substring(2, 8).toUpperCase();
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
              substrate: sampleInput.substrate?.trim() ?? null,
              solvent: sampleInput.solvent?.trim() ?? null,
              thickness: sampleInput.thickness ?? null,
              molecularweight: sampleInput.molecularWeight ?? null,
              preparationdate: parseOptionalDate(sampleInput.preparationDate),
              vendorid: vendorId,
            },
          });
        } else {
          // Sample exists - verify it matches the molecule (and optionally update metadata)
          if (sample.moleculeid !== sampleInput.moleculeId) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "A sample with this identifier already exists for a different molecule.",
            });
          }
          // Optionally update sample metadata if provided (for consistency)
          // For now, we'll just reuse the existing sample
        }

        const measurementDate = parseOptionalDate(experimentInput.measurementDate) ?? new Date();

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

        const experimentsCreated = [] as Array<{
          experiment: Awaited<ReturnType<typeof tx.experiments.create>>;
          spectrumPointsCreated: number;
        }>;

        const getOrCreatePolarization = async (theta: number, phi: number) => {
          const existingPolarization = await tx.polarizations.findFirst({
            where: {
              polardeg: new Prisma.Decimal(theta),
              azimuthdeg: new Prisma.Decimal(phi),
            },
          });

          if (existingPolarization) {
            return existingPolarization;
          }

          return tx.polarizations.create({
            data: {
              polardeg: new Prisma.Decimal(theta),
              azimuthdeg: new Prisma.Decimal(phi),
            },
          });
        };

        for (const group of geometryGroups) {
          const polarization = await getOrCreatePolarization(group.theta, group.phi);

          const experiment = await tx.experiments.create({
            data: {
              sampleid: sample.id,
              instrumentid: experimentInput.instrumentId,
              edgeid: experimentInput.edgeId,
              polarizationid: polarization.id,
              calibrationid: experimentInput.calibrationId ?? null,
              isstandard: experimentInput.isStandard ?? false,
              referencestandard: experimentInput.referenceStandard ?? null,
              measurementdate: measurementDate,
              createdby: ctx.userId ?? undefined,
              experimenttype: experimentInput.experimentType,
            },
            include: {
              samples: true,
              edges: true,
              instruments: true,
            },
          });

          const spectrumData = group.points.map((point) => ({
            experimentid: experiment.id,
            energyev: point.energy,
            rawabs: point.absorption,
            processedabs: null,
            i0: null,
          }));

          if (spectrumData.length > 0) {
            await tx.spectrumpoints.createMany({ data: spectrumData });
          }

          // Create peaksets if provided
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

          experimentsCreated.push({
            experiment,
            spectrumPointsCreated: spectrumData.length,
          });
        }

        return {
          sample,
          experiments: experimentsCreated,
        };
      });

      return transactionResult;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        calibrationid: z.string().uuid().optional(),
        isstandard: z.boolean().optional(),
        referencestandard: z.string().optional(),
        measurementdate: z.date().optional(),
        experimenttype: z.nativeEnum(ExperimentType).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

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
