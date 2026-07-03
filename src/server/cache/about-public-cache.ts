import { cachePublicCatalogRead } from "~/server/cache/public-catalog-cache";
import { db } from "~/server/db";

const CORE_MAINTAINER_LINEAGE_SLUGS = ["maintainer", "administrator"] as const;

/**
 * Loads collaborators and hosts for the public About page from Postgres only.
 */
async function loadAboutCollaborators() {
  const collaborators = await db.collaborators.findMany({
    orderBy: [{ ishost: "desc" }, { displayorder: "asc" }, { name: "asc" }],
  });

  return {
    hosts: collaborators.filter((c) => c.ishost),
    collaborators: collaborators.filter((c) => !c.ishost),
  };
}

/**
 * Loads lineage maintainers and administrators for the public About page from Postgres only.
 */
async function loadCoreMaintainers() {
  const rows = await db.user.findMany({
    where: {
      userAppRoles: {
        some: {
          role: {
            slug: { in: [...CORE_MAINTAINER_LINEAGE_SLUGS] },
          },
        },
      },
    },
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      image: true,
      userAppRoles: {
        where: {
          role: {
            slug: { in: [...CORE_MAINTAINER_LINEAGE_SLUGS] },
          },
        },
        take: 1,
        select: {
          role: {
            select: {
              slug: true,
            },
          },
        },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    image: row.image,
    lineageRoleSlug: row.userAppRoles[0]?.role.slug ?? null,
  }));
}

/**
 * Cached collaborators and hosts listing for the public About page.
 */
export const getCachedAboutCollaborators = cachePublicCatalogRead(
  "about-collaborators",
  ["about", "collaborators"],
  loadAboutCollaborators,
  3600,
);

/**
 * Cached lineage maintainers and administrators for the public About page.
 */
export const getCachedCoreMaintainers = cachePublicCatalogRead(
  "about-core-maintainers",
  ["about", "core-maintainers"],
  loadCoreMaintainers,
  3600,
);
