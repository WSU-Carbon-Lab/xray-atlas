import { z } from "zod";
import { classifyAttributionSearchQuery } from "~/lib/attribution-researcher-search";
import { orcidUserIdSchema } from "~/lib/orcid";
import { userHasCurrentContributionAgreement } from "~/lib/nexafs-attribution";
import type { PrismaClient } from "~/prisma/client";
import { fetchOrcidExpandedSearchByName } from "~/server/orcid/orcidExpandedSearch";
import { fetchOrcidPublicPersonSummary } from "~/server/orcid/orcidPublicRecord";

export const researcherSearchHitSchema = z.object({
  orcid: orcidUserIdSchema,
  displayName: z.string(),
  affiliation: z.string().nullable(),
  source: z.enum(["atlas", "orcid"]),
  hasAtlasProfile: z.boolean(),
  hasContributionAgreement: z.boolean(),
  imageUrl: z.string().nullable(),
});

export type ResearcherSearchHit = z.infer<typeof researcherSearchHitSchema>;

export type SearchResearchersForAttributionResult = {
  results: ResearcherSearchHit[];
  orcidSearchUnavailable: boolean;
};

function hitFromAtlasUser(user: {
  id: string;
  name: string | null;
  image: string | null;
  contributionAgreementAccepted: boolean;
  contributionAgreementVersion: string | null;
}): ResearcherSearchHit {
  const imageUrl = user.image?.trim() ?? null;
  return {
    orcid: user.id,
    displayName: user.name?.trim() ?? user.id,
    affiliation: null,
    source: "atlas",
    hasAtlasProfile: true,
    hasContributionAgreement: userHasCurrentContributionAgreement(user),
    imageUrl,
  };
}

/**
 * Merges Atlas account hits with ORCID registry hits for attribution pickers (deduped by ORCID).
 */
export async function searchResearchersForAttribution(
  db: PrismaClient,
  input: { query: string; limit: number },
): Promise<SearchResearchersForAttributionResult> {
  const q = input.query.trim();
  const { mode, normalizedOrcid } = classifyAttributionSearchQuery(q);
  const limit = input.limit;

  if (mode === "full_orcid" && normalizedOrcid) {
    return searchByFullOrcid(db, normalizedOrcid);
  }

  if (mode === "partial_orcid" && normalizedOrcid) {
    return searchByPartialOrcid(db, normalizedOrcid, limit);
  }

  return searchByNameText(db, q, limit);
}

async function searchByFullOrcid(
  db: PrismaClient,
  orcid: string,
): Promise<SearchResearchersForAttributionResult> {
  const atlasUser = await db.user.findUnique({
    where: { id: orcid },
    select: {
      id: true,
      name: true,
      image: true,
      contributionAgreementAccepted: true,
      contributionAgreementVersion: true,
    },
  });

  if (atlasUser && orcidUserIdSchema.safeParse(atlasUser.id).success) {
    return { results: [hitFromAtlasUser(atlasUser)], orcidSearchUnavailable: false };
  }

  try {
    const summary = await fetchOrcidPublicPersonSummary(orcid);
    if (summary) {
      return {
        results: [
          {
            orcid: summary.orcid,
            displayName: summary.displayName,
            affiliation: summary.affiliation,
            source: "orcid",
            hasAtlasProfile: false,
            hasContributionAgreement: false,
            imageUrl: null,
          },
        ],
        orcidSearchUnavailable: false,
      };
    }
  } catch {
    return {
      results: [
        {
          orcid,
          displayName: orcid,
          affiliation: null,
          source: "orcid",
          hasAtlasProfile: false,
          hasContributionAgreement: false,
          imageUrl: null,
        },
      ],
      orcidSearchUnavailable: true,
    };
  }

  return {
    results: [
      {
        orcid,
        displayName: orcid,
        affiliation: null,
        source: "orcid",
        hasAtlasProfile: false,
        hasContributionAgreement: false,
        imageUrl: null,
      },
    ],
    orcidSearchUnavailable: false,
  };
}

async function searchByPartialOrcid(
  db: PrismaClient,
  fragment: string,
  limit: number,
): Promise<SearchResearchersForAttributionResult> {
  const atlasUsers = await db.user.findMany({
    where: { id: { contains: fragment, mode: "insensitive" } },
    take: limit,
    orderBy: [{ id: "asc" }],
    select: {
      id: true,
      name: true,
      image: true,
      contributionAgreementAccepted: true,
      contributionAgreementVersion: true,
    },
  });

  const results: ResearcherSearchHit[] = [];
  for (const user of atlasUsers) {
    if (!orcidUserIdSchema.safeParse(user.id).success) continue;
    results.push(hitFromAtlasUser(user));
    if (results.length >= limit) break;
  }

  return { results, orcidSearchUnavailable: false };
}

async function searchByNameText(
  db: PrismaClient,
  q: string,
  limit: number,
): Promise<SearchResearchersForAttributionResult> {
  const atlasTake = Math.min(8, limit);
  const orcidTake = Math.min(20, limit + 5);

  const atlasWhere = {
    OR: [
      { name: { contains: q, mode: "insensitive" as const } },
      { id: { contains: q, mode: "insensitive" as const } },
    ],
  };

  const atlasUsersPromise = db.user.findMany({
    where: atlasWhere,
    take: atlasTake,
    orderBy: [{ name: "asc" }, { id: "asc" }],
    select: {
      id: true,
      name: true,
      image: true,
      contributionAgreementAccepted: true,
      contributionAgreementVersion: true,
    },
  });

  let orcidHits: Awaited<ReturnType<typeof fetchOrcidExpandedSearchByName>> = [];
  let orcidSearchUnavailable = false;

  const [atlasUsers, orcidResult] = await Promise.all([
    atlasUsersPromise,
    fetchOrcidExpandedSearchByName(q, orcidTake).then(
      (hits) => ({ hits, failed: false as const }),
      () => ({ hits: [] as typeof orcidHits, failed: true as const }),
    ),
  ]);

  if (orcidResult.failed) {
    orcidSearchUnavailable = true;
  } else {
    orcidHits = orcidResult.hits;
  }

  const atlasOrcidSet = new Set(
    atlasUsers
      .map((user) => user.id)
      .filter((id) => orcidUserIdSchema.safeParse(id).success),
  );

  const merged: ResearcherSearchHit[] = [];

  for (const user of atlasUsers) {
    if (!orcidUserIdSchema.safeParse(user.id).success) continue;
    merged.push(hitFromAtlasUser(user));
  }

  for (const hit of orcidHits) {
    if (merged.length >= limit) break;
    if (atlasOrcidSet.has(hit.orcid)) continue;
    merged.push({
      orcid: hit.orcid,
      displayName: hit.displayName,
      affiliation: hit.affiliation,
      source: "orcid",
      hasAtlasProfile: false,
      hasContributionAgreement: false,
      imageUrl: null,
    });
  }

  return { results: merged, orcidSearchUnavailable };
}
