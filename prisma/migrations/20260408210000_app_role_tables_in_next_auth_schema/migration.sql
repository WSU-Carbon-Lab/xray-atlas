SET lock_timeout = '2min';

DO $move$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'app_role'
  ) THEN
    ALTER TABLE "public"."user_app_role" DROP CONSTRAINT IF EXISTS "user_app_role_user_id_fkey";
    ALTER TABLE "public"."user_app_role" DROP CONSTRAINT IF EXISTS "user_app_role_role_id_fkey";

    ALTER TABLE "public"."app_role" SET SCHEMA next_auth;
    ALTER TABLE "public"."user_app_role" SET SCHEMA next_auth;

    ALTER TABLE "next_auth"."user_app_role" ADD CONSTRAINT "user_app_role_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "next_auth"."user"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    ALTER TABLE "next_auth"."user_app_role" ADD CONSTRAINT "user_app_role_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "next_auth"."app_role"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END
$move$;

ALTER TABLE "next_auth"."app_role"
  ADD COLUMN IF NOT EXISTS "color" VARCHAR(16) NOT NULL DEFAULT '#5865F2';

ALTER TABLE "next_auth"."app_role"
  ADD COLUMN IF NOT EXISTS "favicon_url" VARCHAR(2048);

ALTER TABLE "next_auth"."app_role"
  ADD COLUMN IF NOT EXISTS "is_emailable" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "next_auth"."app_role"
  ADD COLUMN IF NOT EXISTS "permissions" JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE "next_auth"."app_role"
SET
  "permissions" = '["user_directory","user_roles","user_delete","instrument_edit","instrument_active","instrument_remove","molecule_edit","molecule_add","molecule_delete","data_upload","data_delete","data_edit_peaks","data_edit_normalization","data_comment","labs_access"]'::jsonb,
  "color" = '#ED4245',
  "display_name" = lower("display_name")
WHERE "slug" = 'administrator';

UPDATE "next_auth"."app_role"
SET
  "permissions" = '["instrument_edit","instrument_active","molecule_edit","molecule_add","data_upload","data_delete","data_edit_peaks","data_edit_normalization","data_comment","labs_access"]'::jsonb,
  "color" = '#5865F2',
  "display_name" = lower("display_name")
WHERE "slug" = 'maintainer';

UPDATE "next_auth"."app_role"
SET
  "permissions" = '["data_upload","molecule_add","molecule_edit","data_edit_peaks","data_edit_normalization","data_comment"]'::jsonb,
  "color" = '#99AAB5',
  "display_name" = lower("display_name")
WHERE "slug" = 'contributor';

UPDATE "next_auth"."app_role"
SET
  "can_manage_users" = true,
  "can_access_labs" = true
WHERE "slug" = 'administrator';

UPDATE "next_auth"."app_role"
SET
  "can_manage_users" = false,
  "can_access_labs" = true
WHERE "slug" = 'maintainer';

UPDATE "next_auth"."app_role"
SET
  "can_manage_users" = false,
  "can_access_labs" = false
WHERE "slug" = 'contributor';
