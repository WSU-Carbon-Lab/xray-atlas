-- Applied on Supabase as migration `grant_next_auth_prisma_permissions`.
-- Grants the `prisma` role full access to next_auth and aligns object ownership.
-- `audit_event` INSERT-only (no UPDATE/DELETE) is enforced in migration 20260526120000_audit_event;
-- the ownership loop below still assigns table owner to `prisma` for new next_auth tables.

GRANT USAGE, CREATE ON SCHEMA next_auth TO prisma;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA next_auth TO prisma;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA next_auth TO prisma;
GRANT ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA next_auth TO prisma;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA next_auth
  GRANT ALL PRIVILEGES ON TABLES TO prisma;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA next_auth
  GRANT ALL PRIVILEGES ON SEQUENCES TO prisma;

DO $grant_prisma$
DECLARE
  rel record;
BEGIN
  FOR rel IN
    SELECT c.relname AS object_name,
           CASE c.relkind
             WHEN 'S' THEN 'sequence'
             WHEN 'r' THEN 'table'
             WHEN 'p' THEN 'table'
           END AS object_kind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'next_auth'
      AND c.relkind IN ('r', 'p', 'S')
  LOOP
    IF rel.object_kind = 'sequence' THEN
      EXECUTE format(
        'ALTER SEQUENCE next_auth.%I OWNER TO prisma',
        rel.object_name
      );
    ELSE
      EXECUTE format(
        'ALTER TABLE next_auth.%I OWNER TO prisma',
        rel.object_name
      );
    END IF;
  END LOOP;
END
$grant_prisma$;

GRANT prisma TO postgres;
