-- Canonical molecule contributor roles: linked (initial ingest) and edited (metadata edits).
-- Legacy values: creator/contributor -> linked; editor -> edited.

UPDATE public.molecule_contributors
SET contribution_type = 'linked'
WHERE contribution_type IN ('creator', 'contributor');

UPDATE public.molecule_contributors
SET contribution_type = 'edited'
WHERE contribution_type = 'editor';

INSERT INTO public.molecule_contributors (molecule_id, user_id, contribution_type, contributed_at)
SELECT m.id, m.createdby, 'linked', COALESCE(m.createdat, NOW())
FROM public.molecules m
WHERE m.createdby IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.molecule_contributors mc
    WHERE mc.molecule_id = m.id
      AND mc.user_id = m.createdby
      AND mc.contribution_type = 'linked'
  );

DELETE FROM public.molecule_contributors mc
USING public.molecule_contributors mc2
WHERE mc.molecule_id = mc2.molecule_id
  AND mc.user_id IS NOT DISTINCT FROM mc2.user_id
  AND mc.contribution_type = mc2.contribution_type
  AND mc.contributed_at > mc2.contributed_at;

ALTER TABLE public.molecule_contributors
  ALTER COLUMN contribution_type SET DEFAULT 'linked';

ALTER TABLE public.molecule_contributors
  DROP CONSTRAINT IF EXISTS molecule_contributors_contribution_type_check;

ALTER TABLE public.molecule_contributors
  ADD CONSTRAINT molecule_contributors_contribution_type_check
  CHECK (contribution_type IN ('linked', 'edited'));

ALTER TABLE public.molecule_contributors
  DROP CONSTRAINT IF EXISTS molecule_contributors_unique_role;

ALTER TABLE public.molecule_contributors
  ADD CONSTRAINT molecule_contributors_unique_role
  UNIQUE (molecule_id, user_id, contribution_type);
