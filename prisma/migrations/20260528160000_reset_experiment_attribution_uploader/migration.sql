-- Reset experiment contributor attribution: sole legacy uploader ORCID for all existing datasets.
-- Aligns with DataCite roadmap `uploaded_by` (interim `experiment_contributors.role = owner`).
SET lock_timeout = '2min';

DELETE FROM public.experiment_contributors;

UPDATE public.experiments
SET
  createdby = '0000-0002-6371-2123',
  collected_by_user_ids = ARRAY[]::text[];

INSERT INTO public.experiment_contributors (
  experiment_id,
  orcid_id,
  user_id,
  role,
  is_claimed,
  is_public_profile_visible,
  claimed_at
)
SELECT
  e.id,
  '0000-0002-6371-2123',
  '0000-0002-6371-2123',
  'owner',
  true,
  true,
  COALESCE(e.createdat, CURRENT_TIMESTAMP)
FROM public.experiments e
ON CONFLICT (experiment_id, orcid_id, role) DO NOTHING;
