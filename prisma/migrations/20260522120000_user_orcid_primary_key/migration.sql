-- ORCID apex identity: user.id becomes bare ORCID iD (VARCHAR(19)); drop email/orcid columns.
-- Run `bun scripts/migrate-user-orcid-pk-audit.ts` before applying on production data.
SET lock_timeout = '2min';
SET statement_timeout = 0;

DO $precheck$
DECLARE
  missing_orcid_count INTEGER;
  duplicate_orcid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO missing_orcid_count
  FROM next_auth."user"
  WHERE "orcid" IS NULL OR TRIM("orcid") = '';

  IF missing_orcid_count > 0 THEN
    RAISE EXCEPTION 'Migration blocked: % user row(s) lack orcid. Link ORCID or delete accounts before migrating.', missing_orcid_count;
  END IF;

  SELECT COUNT(*) INTO duplicate_orcid_count
  FROM (
    SELECT "orcid"
    FROM next_auth."user"
    GROUP BY "orcid"
    HAVING COUNT(*) > 1
  ) d;

  IF duplicate_orcid_count > 0 THEN
    RAISE EXCEPTION 'Migration blocked: % duplicate orcid value(s). Resolve before migrating.', duplicate_orcid_count;
  END IF;
END
$precheck$;

DO $ownership$
DECLARE
  target_owner name;
  role_owner name;
BEGIN
  SELECT tableowner INTO target_owner
  FROM pg_tables
  WHERE schemaname = 'next_auth' AND tablename = 'user';

  IF target_owner IS NULL THEN
    RAISE EXCEPTION 'next_auth."user" not found; cannot verify table ownership for migration';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'next_auth' AND tablename = 'user_app_role'
  ) THEN
    RETURN;
  END IF;

  SELECT tableowner INTO role_owner
  FROM pg_tables
  WHERE schemaname = 'next_auth' AND tablename = 'user_app_role';

  IF role_owner IS DISTINCT FROM target_owner THEN
    IF current_setting('is_superuser') = 'on' THEN
      EXECUTE format(
        'ALTER TABLE next_auth.user_app_role OWNER TO %I',
        target_owner
      );
    ELSE
      RAISE EXCEPTION
        'next_auth.user_app_role is owned by %, but next_auth."user" is owned by %. '
        'Run scripts/supabase/orcid-pk-prepare-role-table-ownership.sql in the Supabase SQL Editor, '
        'then mark the failed migration rolled back (`prisma migrate resolve --rolled-back 20260522120000_user_orcid_primary_key`) and retry.',
        role_owner,
        target_owner;
    END IF;
  END IF;
END
$ownership$;

CREATE TABLE IF NOT EXISTS next_auth.user_legacy_id_redirect (
  legacy_uuid UUID NOT NULL,
  orcid_id VARCHAR(19) NOT NULL,
  CONSTRAINT user_legacy_id_redirect_pkey PRIMARY KEY (legacy_uuid)
);

INSERT INTO next_auth.user_legacy_id_redirect (legacy_uuid, orcid_id)
SELECT u."id", u."orcid"
FROM next_auth."user" u
ON CONFLICT (legacy_uuid) DO NOTHING;

ALTER TABLE next_auth."account" DROP CONSTRAINT IF EXISTS "accounts_userId_fkey";
ALTER TABLE next_auth."session" DROP CONSTRAINT IF EXISTS "sessions_userId_fkey";
ALTER TABLE next_auth.user_app_role DROP CONSTRAINT IF EXISTS user_app_role_user_id_fkey;
ALTER TABLE next_auth."Authenticator" DROP CONSTRAINT IF EXISTS "Authenticator_userId_fkey";
ALTER TABLE public.molecule_contributors DROP CONSTRAINT IF EXISTS molecule_contributors_user_id_fkey;
ALTER TABLE public.molecule_favorites DROP CONSTRAINT IF EXISTS molecule_favorites_user_id_fkey;
ALTER TABLE public.molecule_views DROP CONSTRAINT IF EXISTS molecule_views_user_id_fkey;
ALTER TABLE public.experiment_favorites DROP CONSTRAINT IF EXISTS experiment_favorites_user_id_fkey;

ALTER TABLE next_auth."account" ADD COLUMN IF NOT EXISTS user_id_orcid VARCHAR(19);
UPDATE next_auth."account" a
SET user_id_orcid = u."orcid"
FROM next_auth."user" u
WHERE a."userId" = u."id";
ALTER TABLE next_auth."account" DROP COLUMN IF EXISTS "userId";
ALTER TABLE next_auth."account" RENAME COLUMN user_id_orcid TO "userId";

ALTER TABLE next_auth."session" ADD COLUMN IF NOT EXISTS user_id_orcid VARCHAR(19);
UPDATE next_auth."session" s
SET user_id_orcid = u."orcid"
FROM next_auth."user" u
WHERE s."userId" = u."id";
ALTER TABLE next_auth."session" DROP COLUMN IF EXISTS "userId";
ALTER TABLE next_auth."session" RENAME COLUMN user_id_orcid TO "userId";

ALTER TABLE next_auth.user_app_role ADD COLUMN IF NOT EXISTS user_id_orcid VARCHAR(19);
UPDATE next_auth.user_app_role uar
SET user_id_orcid = u."orcid"
FROM next_auth."user" u
WHERE uar.user_id = u."id";
ALTER TABLE next_auth.user_app_role DROP COLUMN user_id;
ALTER TABLE next_auth.user_app_role RENAME COLUMN user_id_orcid TO user_id;

ALTER TABLE next_auth."Authenticator" ADD COLUMN IF NOT EXISTS user_id_orcid VARCHAR(19);
UPDATE next_auth."Authenticator" auth
SET user_id_orcid = u."orcid"
FROM next_auth."user" u
WHERE auth."userId" = u."id";
ALTER TABLE next_auth."Authenticator" DROP COLUMN "userId";
ALTER TABLE next_auth."Authenticator" RENAME COLUMN user_id_orcid TO "userId";

ALTER TABLE public.molecule_contributors ADD COLUMN IF NOT EXISTS user_id_orcid VARCHAR(19);
UPDATE public.molecule_contributors mc
SET user_id_orcid = u."orcid"
FROM next_auth."user" u
WHERE mc.user_id = u."id";
ALTER TABLE public.molecule_contributors DROP COLUMN user_id;
ALTER TABLE public.molecule_contributors RENAME COLUMN user_id_orcid TO user_id;

ALTER TABLE public.molecule_favorites ADD COLUMN IF NOT EXISTS user_id_orcid VARCHAR(19);
UPDATE public.molecule_favorites mf
SET user_id_orcid = u."orcid"
FROM next_auth."user" u
WHERE mf.user_id = u."id";
ALTER TABLE public.molecule_favorites DROP COLUMN user_id;
ALTER TABLE public.molecule_favorites RENAME COLUMN user_id_orcid TO user_id;

ALTER TABLE public.molecule_views ADD COLUMN IF NOT EXISTS user_id_orcid VARCHAR(19);
UPDATE public.molecule_views mv
SET user_id_orcid = u."orcid"
FROM next_auth."user" u
WHERE mv.user_id = u."id";
ALTER TABLE public.molecule_views DROP COLUMN user_id;
ALTER TABLE public.molecule_views RENAME COLUMN user_id_orcid TO user_id;

ALTER TABLE public.experiment_favorites ADD COLUMN IF NOT EXISTS user_id_orcid VARCHAR(19);
UPDATE public.experiment_favorites ef
SET user_id_orcid = u."orcid"
FROM next_auth."user" u
WHERE ef.user_id = u."id";
ALTER TABLE public.experiment_favorites DROP COLUMN user_id;
ALTER TABLE public.experiment_favorites RENAME COLUMN user_id_orcid TO user_id;

UPDATE public.molecules m
SET createdby = u."orcid"
FROM next_auth."user" u
WHERE m.createdby IS NOT NULL AND m.createdby = u."id"::text;

UPDATE public.experiments e
SET createdby = u."orcid"
FROM next_auth."user" u
WHERE e.createdby IS NOT NULL AND e.createdby = u."id"::text;

UPDATE public.experiments e
SET collected_by_user_ids = COALESCE(
  (
    SELECT array_agg(
      COALESCE(u."orcid", elem)
      ORDER BY ord
    )
    FROM unnest(e.collected_by_user_ids) WITH ORDINALITY AS t(elem, ord)
    LEFT JOIN next_auth."user" u ON u."id"::text = elem
  ),
  ARRAY[]::text[]
)
WHERE cardinality(e.collected_by_user_ids) > 0;

ALTER TABLE next_auth."user" ADD COLUMN IF NOT EXISTS id_orcid VARCHAR(19);
UPDATE next_auth."user" SET id_orcid = "orcid";

ALTER TABLE next_auth."user" DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE next_auth."user" DROP CONSTRAINT IF EXISTS email_unique;
DROP INDEX IF EXISTS next_auth.users_orcid_idx;

ALTER TABLE next_auth."user" DROP COLUMN "id";
ALTER TABLE next_auth."user" DROP COLUMN IF EXISTS "orcid";
ALTER TABLE next_auth."user" DROP COLUMN IF EXISTS "email";
ALTER TABLE next_auth."user" DROP COLUMN IF EXISTS "emailVerified";

ALTER TABLE next_auth."user" RENAME COLUMN id_orcid TO "id";
ALTER TABLE next_auth."user" ADD CONSTRAINT users_pkey PRIMARY KEY ("id");

ALTER TABLE next_auth."account"
  ADD CONSTRAINT "accounts_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES next_auth."user"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE next_auth."session"
  ADD CONSTRAINT "sessions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES next_auth."user"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE next_auth.user_app_role
  ADD CONSTRAINT user_app_role_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES next_auth."user"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE next_auth."Authenticator"
  ADD CONSTRAINT "Authenticator_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES next_auth."user"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE public.molecule_contributors
  ADD CONSTRAINT molecule_contributors_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES next_auth."user"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE public.molecule_favorites
  ADD CONSTRAINT molecule_favorites_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES next_auth."user"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE public.molecule_views
  ADD CONSTRAINT molecule_views_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES next_auth."user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE public.experiment_favorites
  ADD CONSTRAINT experiment_favorites_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES next_auth."user"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
