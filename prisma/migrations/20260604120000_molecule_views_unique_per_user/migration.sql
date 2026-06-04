DELETE FROM public.molecule_views mv
USING (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY molecule_id, user_id
        ORDER BY viewed_at ASC, id ASC
      ) AS rn
    FROM public.molecule_views
    WHERE user_id IS NOT NULL
  ) ranked
  WHERE ranked.rn > 1
) dup
WHERE mv.id = dup.id;

CREATE UNIQUE INDEX "molecule_views_molecule_user_key"
ON public.molecule_views (molecule_id, user_id)
WHERE user_id IS NOT NULL;
