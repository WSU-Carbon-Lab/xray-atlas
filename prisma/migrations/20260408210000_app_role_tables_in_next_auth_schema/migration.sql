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
