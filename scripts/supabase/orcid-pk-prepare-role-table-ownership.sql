-- Run once in the Supabase SQL Editor (postgres superuser) before
-- `prisma migrate deploy` for `20260522120000_user_orcid_primary_key`.
--
-- Aligns ownership of role tables with `next_auth."user"` so Prisma migrate can
-- DROP/ADD constraints and rewrite `user_app_role.user_id` during the ORCID PK swap.

DO $owner$
DECLARE
  target_owner name;
  role_table text;
BEGIN
  SELECT tableowner INTO target_owner
  FROM pg_tables
  WHERE schemaname = 'next_auth' AND tablename = 'user';

  IF target_owner IS NULL THEN
    RAISE EXCEPTION 'next_auth."user" not found; cannot determine target owner';
  END IF;

  FOREACH role_table IN ARRAY ARRAY['user_app_role', 'app_role']
  LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_tables
      WHERE schemaname = 'next_auth' AND tablename = role_table
    ) THEN
      EXECUTE format(
        'ALTER TABLE next_auth.%I OWNER TO %I',
        role_table,
        target_owner
      );
      RAISE NOTICE 'next_auth.% owner set to %', role_table, target_owner;
    END IF;
  END LOOP;
END
$owner$;
