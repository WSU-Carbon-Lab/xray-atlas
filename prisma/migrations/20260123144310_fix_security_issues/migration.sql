-- Fix security and performance issues identified by Supabase advisors

-- Remove duplicate index on users.orcid
-- Keep the unique constraint index (users_orcid_key), drop the redundant idx_user_orcid
DROP INDEX IF EXISTS idx_user_orcid;

-- Fix function search_path for spectrumpoints_statement_summary
-- Check if function exists before altering
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'spectrumpoints_statement_summary'
  ) THEN
    ALTER FUNCTION public.spectrumpoints_statement_summary 
      SET search_path = public;
  END IF;
END $$;
