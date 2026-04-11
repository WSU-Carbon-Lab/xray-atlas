-- If `bun prisma migrate deploy` appears to hang: ensure DIRECT_URL uses the Supabase
-- **direct** host `db.<project-ref>.supabase.co:5432` (not the transaction pooler :6543).
-- Optional query params: `?sslmode=require&connect_timeout=30`
-- You may also paste this file into Supabase Dashboard > SQL Editor and run it, then mark the migration applied:
--   bunx prisma migrate resolve --applied 20260404120000_app_roles_and_user_app_role
SET lock_timeout = '2min';
SET statement_timeout = 0;

CREATE TABLE "public"."app_role" (
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

CREATE UNIQUE INDEX "app_role_slug_key" ON "public"."app_role"("slug");

CREATE TABLE "public"."user_app_role" (
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,

    CONSTRAINT "user_app_role_pkey" PRIMARY KEY ("user_id","role_id")
);

CREATE INDEX "user_app_role_user_id_idx" ON "public"."user_app_role"("user_id");

CREATE INDEX "user_app_role_role_id_idx" ON "public"."user_app_role"("role_id");

ALTER TABLE "public"."user_app_role" ADD CONSTRAINT "user_app_role_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "next_auth"."user"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "public"."user_app_role" ADD CONSTRAINT "user_app_role_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."app_role"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

INSERT INTO "public"."app_role" ("id", "slug", "display_name", "description", "is_system", "can_access_labs", "can_manage_users", "created_at", "updated_at")
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
    INSERT INTO "public"."user_app_role" ("user_id", "role_id")
    SELECT u."id", r."id"
    FROM "next_auth"."user" u
    INNER JOIN "public"."app_role" r ON r."slug" = (
      CASE
        WHEN u."role" IN ('admin', 'administrator') THEN 'administrator'
        WHEN u."role" = 'maintainer' THEN 'maintainer'
        ELSE 'contributor'
      END
    )
    ON CONFLICT ("user_id", "role_id") DO NOTHING;
  ELSE
    INSERT INTO "public"."user_app_role" ("user_id", "role_id")
    SELECT u."id", r."id"
    FROM "next_auth"."user" u
    INNER JOIN "public"."app_role" r ON r."slug" = 'contributor'
    WHERE NOT EXISTS (
      SELECT 1 FROM "public"."user_app_role" uar WHERE uar."user_id" = u."id"
    )
    ON CONFLICT ("user_id", "role_id") DO NOTHING;
  END IF;
END
$backfill$;

ALTER TABLE "next_auth"."user" DROP COLUMN IF EXISTS "role";
