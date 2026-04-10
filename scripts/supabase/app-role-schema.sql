-- App roles in next_auth: app_role, user_app_role, linked to next_auth.user.
-- Apply with Supabase SQL Editor or MCP against the direct database host (port 5432).
--
-- Greenfield: run this whole script on an empty database that already has next_auth.user
-- (without legacy user.role), or after removing user.role.
--
-- If tables already exist under public.app_role / public.user_app_role, run instead the
-- Prisma migration 20260408210000_app_role_tables_in_next_auth_schema (or the DO block inside it).

SET lock_timeout = '2min';
SET statement_timeout = 0;

CREATE TABLE "next_auth"."app_role" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "can_access_labs" BOOLEAN NOT NULL DEFAULT false,
    "can_manage_users" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_role_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "app_role_slug_key" ON "next_auth"."app_role"("slug");

CREATE TABLE "next_auth"."user_app_role" (
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,

    CONSTRAINT "user_app_role_pkey" PRIMARY KEY ("user_id","role_id")
);

CREATE INDEX "user_app_role_user_id_idx" ON "next_auth"."user_app_role"("user_id");

CREATE INDEX "user_app_role_role_id_idx" ON "next_auth"."user_app_role"("role_id");

ALTER TABLE "next_auth"."user_app_role" ADD CONSTRAINT "user_app_role_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "next_auth"."user"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "next_auth"."user_app_role" ADD CONSTRAINT "user_app_role_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "next_auth"."app_role"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

INSERT INTO "next_auth"."app_role" ("id", "slug", "display_name", "description", "is_system", "can_access_labs", "can_manage_users", "created_at", "updated_at")
VALUES
  (gen_random_uuid(), 'contributor', 'Contributor', 'Default authenticated user', true, false, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'maintainer', 'Maintainer', 'Can access Labs and privileged dataset operations', true, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'administrator', 'Administrator', 'Full user and role management', true, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

DO $backfill$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns c
    WHERE c.table_schema = 'next_auth'
      AND c.table_name = 'user'
      AND c.column_name = 'role'
  ) THEN
    INSERT INTO "next_auth"."user_app_role" ("user_id", "role_id")
    SELECT u."id", r."id"
    FROM "next_auth"."user" u
    INNER JOIN "next_auth"."app_role" r ON r."slug" = (
      CASE
        WHEN u."role" IN ('admin', 'administrator') THEN 'administrator'
        WHEN u."role" = 'maintainer' THEN 'maintainer'
        ELSE 'contributor'
      END
    )
    ON CONFLICT ("user_id", "role_id") DO NOTHING;
  ELSE
    INSERT INTO "next_auth"."user_app_role" ("user_id", "role_id")
    SELECT u."id", r."id"
    FROM "next_auth"."user" u
    INNER JOIN "next_auth"."app_role" r ON r."slug" = 'contributor'
    WHERE NOT EXISTS (
      SELECT 1 FROM "next_auth"."user_app_role" uar WHERE uar."user_id" = u."id"
    )
    ON CONFLICT ("user_id", "role_id") DO NOTHING;
  END IF;
END
$backfill$;

ALTER TABLE "next_auth"."user" DROP COLUMN IF EXISTS "role";

-- Role visuals and granular permissions live in Prisma migration
-- `20260408183000_app_role_visuals_permissions` (columns color, favicon_url,
-- is_emailable, permissions JSONB). Apply that migration after this script when
-- provisioning greenfield databases.
