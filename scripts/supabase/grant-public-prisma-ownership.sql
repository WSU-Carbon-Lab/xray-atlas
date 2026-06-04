-- Align public NEXAFS table ownership with the `prisma` migrate role.
-- Prisma migrate deploy issues ALTER TABLE; Postgres error 42501 occurs when the
-- connecting role is not the table owner. Run after imports or manual DDL that
-- leaves these tables owned by `postgres` or another role.
-- Complements scripts/supabase/grant-next-auth-prisma-permissions.sql (next_auth only).

ALTER TABLE IF EXISTS public.experiment_metrics OWNER TO prisma;
ALTER TABLE IF EXISTS public.experiments OWNER TO prisma;
ALTER TABLE IF EXISTS public.experimentpublications OWNER TO prisma;
ALTER TABLE IF EXISTS public.experiment_contributors OWNER TO prisma;

ALTER TABLE IF EXISTS public.experiment_metrics_channel OWNER TO prisma;
ALTER TABLE IF EXISTS public.attribution_team OWNER TO prisma;
ALTER TABLE IF EXISTS public.attribution_team_member OWNER TO prisma;
ALTER TABLE IF EXISTS public.spectrumpoints OWNER TO prisma;
ALTER TABLE IF EXISTS public.samples OWNER TO prisma;
-- Re-run this script after bulk imports or manual DDL in the Supabase dashboard when migrate deploy hits 42501.
