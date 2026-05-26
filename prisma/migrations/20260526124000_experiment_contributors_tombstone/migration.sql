-- NEXAFS attribution records for claimed, unclaimed, and detached contributors.
SET lock_timeout = '2min';

CREATE TABLE public.experiment_contributors (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL,
  orcid_id VARCHAR(19) NOT NULL,
  user_id VARCHAR(19),
  role TEXT NOT NULL,
  is_claimed BOOLEAN NOT NULL DEFAULT false,
  is_public_profile_visible BOOLEAN NOT NULL DEFAULT false,
  detached_at TIMESTAMPTZ(6),
  claimed_at TIMESTAMPTZ(6),
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT experiment_contributors_pkey PRIMARY KEY (id),
  CONSTRAINT experiment_contributors_experiment_id_fkey FOREIGN KEY (experiment_id) REFERENCES public.experiments(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT experiment_contributors_user_id_fkey FOREIGN KEY (user_id) REFERENCES next_auth."user"(id) ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT experiment_contributors_role_check CHECK (role IN ('owner', 'collector'))
);

CREATE UNIQUE INDEX experiment_contributors_unique_role
  ON public.experiment_contributors (experiment_id, orcid_id, role);

CREATE INDEX idx_experiment_contributors_experiment_id
  ON public.experiment_contributors (experiment_id);

CREATE INDEX idx_experiment_contributors_orcid_id
  ON public.experiment_contributors (orcid_id);

CREATE INDEX idx_experiment_contributors_user_id
  ON public.experiment_contributors (user_id);

CREATE OR REPLACE FUNCTION public.set_experiment_contributors_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_experiment_contributors_updated_at ON public.experiment_contributors;
CREATE TRIGGER set_experiment_contributors_updated_at
BEFORE UPDATE ON public.experiment_contributors
FOR EACH ROW
EXECUTE FUNCTION public.set_experiment_contributors_updated_at();

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
  e.createdby,
  e.createdby,
  'owner',
  true,
  true,
  e.createdat
FROM public.experiments e
WHERE e.createdby IS NOT NULL
ON CONFLICT (experiment_id, orcid_id, role) DO NOTHING;

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
  contributor_orcid,
  contributor_orcid,
  'collector',
  true,
  true,
  e.createdat
FROM public.experiments e
CROSS JOIN LATERAL unnest(COALESCE(e.collected_by_user_ids, ARRAY[]::text[])) contributor_orcid
WHERE contributor_orcid IS NOT NULL
  AND contributor_orcid <> ''
ON CONFLICT (experiment_id, orcid_id, role) DO NOTHING;
