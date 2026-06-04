import { z } from "zod";
import { Prisma } from "~/prisma/client";

export const moleculeBrowseFiltersSchema = z.object({
  tagIds: z.array(z.string().uuid()).optional().default([]),
  hasExperimentData: z.boolean().optional(),
  hasCas: z.boolean().optional(),
  hasPubchem: z.boolean().optional(),
});

export type MoleculeBrowseFiltersInput = z.infer<
  typeof moleculeBrowseFiltersSchema
>;

export interface NormalizedMoleculeBrowseFilters {
  tagIds: string[];
  hasExperimentData: boolean;
  hasCas: boolean;
  hasPubchem: boolean;
}

export function normalizeMoleculeBrowseFilters(
  input: MoleculeBrowseFiltersInput,
): NormalizedMoleculeBrowseFilters {
  return {
    tagIds: input.tagIds ?? [],
    hasExperimentData: input.hasExperimentData === true,
    hasCas: input.hasCas === true,
    hasPubchem: input.hasPubchem === true,
  };
}

export function prismaMoleculeBrowseWhere(
  filters: NormalizedMoleculeBrowseFilters,
): Prisma.moleculesWhereInput {
  const parts: Prisma.moleculesWhereInput[] = [];
  if (filters.tagIds.length > 0) {
    parts.push({
      moleculetags: { some: { tagid: { in: filters.tagIds } } },
    });
  }
  if (filters.hasExperimentData) {
    parts.push({
      samples: { some: { experiments: { some: {} } } },
    });
  }
  if (filters.hasCas) {
    parts.push({ casnumber: { not: null } });
  }
  if (filters.hasPubchem) {
    parts.push({ pubchemcid: { not: null } });
  }
  if (parts.length === 0) return {};
  return { AND: parts };
}

export function sqlMoleculeBrowseFilters(
  filters: NormalizedMoleculeBrowseFilters,
  moleculeTableAlias = "m",
): Prisma.Sql {
  const clauses: Prisma.Sql[] = [];
  const m = Prisma.raw(moleculeTableAlias);

  if (filters.tagIds.length > 0) {
    clauses.push(Prisma.sql`
      EXISTS (
        SELECT 1 FROM public.molecule_tags mt
        WHERE mt.molecule_id = ${m}.id
        AND mt.tag_id = ANY(${filters.tagIds}::uuid[])
      )
    `);
  }
  if (filters.hasExperimentData) {
    clauses.push(Prisma.sql`
      EXISTS (
        SELECT 1 FROM public.samples s
        INNER JOIN public.experiments e ON e.sampleid = s.id
        WHERE s.moleculeid = ${m}.id
      )
    `);
  }
  if (filters.hasCas) {
    clauses.push(Prisma.sql`${m}.casnumber IS NOT NULL`);
  }
  if (filters.hasPubchem) {
    clauses.push(Prisma.sql`${m}.pubchemcid IS NOT NULL`);
  }

  if (clauses.length === 0) {
    return Prisma.sql`TRUE`;
  }
  return Prisma.join(clauses, " AND ");
}
