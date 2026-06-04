SET lock_timeout = '2min';

CREATE TYPE public."ExperimentContributorClaimStatus" AS ENUM (
  'pending',
  'accepted',
  'declined',
  'unclaimed'
);

ALTER TABLE public.experiment_contributors
  ADD COLUMN claim_status public."ExperimentContributorClaimStatus" NOT NULL DEFAULT 'pending';

ALTER TABLE next_auth."user"
  ADD COLUMN show_name_on_pending_attributions BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN auto_accept_attributions BOOLEAN NOT NULL DEFAULT false;

UPDATE public.experiment_contributors ec
SET claim_status = CASE
  WHEN ec.detached_at IS NOT NULL THEN 'unclaimed'::public."ExperimentContributorClaimStatus"
  WHEN ec.is_claimed = true AND ec.is_public_profile_visible = true THEN 'accepted'::public."ExperimentContributorClaimStatus"
  ELSE 'pending'::public."ExperimentContributorClaimStatus"
END;

CREATE INDEX idx_experiment_contributors_orcid_claim_status
  ON public.experiment_contributors (orcid_id, claim_status);

UPDATE next_auth."user" u
SET show_name_on_pending_attributions = true
WHERE EXISTS (
  SELECT 1
  FROM next_auth.user_app_role uar
  INNER JOIN next_auth.app_role ar ON ar.id = uar.role_id
  WHERE uar.user_id = u.id
    AND ar.slug IN ('administrator', 'maintainer')
);
