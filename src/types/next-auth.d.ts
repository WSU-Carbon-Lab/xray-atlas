import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      /** Bare ORCID iD; same value as `next_auth.user.id`. */
      id: string;
      canAccessLabs: boolean;
      canManageUsers: boolean;
      roleSlugs: string[];
    };
  }
}
