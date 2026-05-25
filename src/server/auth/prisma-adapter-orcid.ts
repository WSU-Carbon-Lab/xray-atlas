import { PrismaAdapter } from "@auth/prisma-adapter";
import type { PrismaClient } from "~/prisma/client";
import { parseOrcidForStorage } from "~/lib/orcid";

/**
 * Prisma adapter that sets `user.id` to the bare ORCID iD on first ORCID sign-in.
 * GitHub-only user creation is blocked in the NextAuth `signIn` callback instead.
 */
export function PrismaAdapterOrcid(db: PrismaClient) {
  const base = PrismaAdapter(db);

  return {
    ...base,
    createUser: async (data: {
      id?: string;
      name?: string | null;
      email?: string | null;
      emailVerified?: Date | null;
      image?: string | null;
    }) => {
      let id = data.id;
      if (id) {
        try {
          id = parseOrcidForStorage(id);
        } catch {
          throw new Error("ORCID_SIGN_IN_INVALID_ID");
        }
      } else {
        throw new Error("ORCID_SIGN_IN_MISSING_ID");
      }

      const created = await db.user.create({
        data: {
          id,
          name: data.name ?? null,
          image: data.image ?? null,
        },
      });

      return {
        id: created.id,
        name: created.name,
        email: data.email ?? "",
        emailVerified: data.emailVerified ?? null,
        image: created.image,
      };
    },
  };
}
