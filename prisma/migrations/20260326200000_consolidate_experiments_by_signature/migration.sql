CREATE TEMP TABLE experiment_signature_canonical AS
SELECT
  sampleid,
  instrumentid,
  edgeid,
  experimenttype,
  (array_agg(id ORDER BY createdat DESC, id DESC))[1] AS canonical_id
FROM public.experiments
GROUP BY sampleid, instrumentid, edgeid, experimenttype
HAVING COUNT(*) > 1;

CREATE TEMP TABLE experiment_signature_duplicates AS
SELECT
  e.id AS duplicate_id,
  c.canonical_id
FROM public.experiments e
INNER JOIN experiment_signature_canonical c
  ON c.sampleid = e.sampleid
 AND c.instrumentid = e.instrumentid
 AND c.edgeid = e.edgeid
 AND c.experimenttype IS NOT DISTINCT FROM e.experimenttype
WHERE e.id <> c.canonical_id;

UPDATE public.experiments ce
SET collected_by_user_ids = merged.collected_by_user_ids
FROM (
  SELECT
    c.canonical_id,
    COALESCE(
      array_agg(DISTINCT uid) FILTER (WHERE uid IS NOT NULL AND btrim(uid) <> ''),
      ARRAY[]::text[]
    ) AS collected_by_user_ids
  FROM experiment_signature_canonical c
  INNER JOIN public.experiments e
    ON c.sampleid = e.sampleid
   AND c.instrumentid = e.instrumentid
   AND c.edgeid = e.edgeid
   AND c.experimenttype IS NOT DISTINCT FROM e.experimenttype
  LEFT JOIN LATERAL unnest(COALESCE(e.collected_by_user_ids, ARRAY[]::text[])) AS u(uid) ON TRUE
  GROUP BY c.canonical_id
) merged
WHERE ce.id = merged.canonical_id;

UPDATE public.spectrumpoints sp
SET experimentid = d.canonical_id
FROM experiment_signature_duplicates d
WHERE sp.experimentid = d.duplicate_id;

INSERT INTO public.experimentpublications (experimentid, publicationid, role)
SELECT
  d.canonical_id,
  ep.publicationid,
  ep.role
FROM public.experimentpublications ep
INNER JOIN experiment_signature_duplicates d ON d.duplicate_id = ep.experimentid
ON CONFLICT (experimentid, publicationid) DO NOTHING;

DELETE FROM public.experimentpublications ep
USING experiment_signature_duplicates d
WHERE ep.experimentid = d.duplicate_id;

INSERT INTO public.experimentquality (
  experimentid,
  signaltonoise,
  userrating,
  upvotes,
  downvotes,
  comments,
  lastchecked
)
SELECT
  d.canonical_id,
  eq.signaltonoise,
  eq.userrating,
  eq.upvotes,
  eq.downvotes,
  eq.comments,
  eq.lastchecked
FROM public.experimentquality eq
INNER JOIN experiment_signature_duplicates d ON d.duplicate_id = eq.experimentid
ON CONFLICT (experimentid) DO NOTHING;

DELETE FROM public.experimentquality eq
USING experiment_signature_duplicates d
WHERE eq.experimentid = d.duplicate_id;

INSERT INTO public.peaksets (id, experimentid, energyev, intensity, bond, transition)
SELECT
  gen_random_uuid(),
  d.canonical_id,
  pk.energyev,
  pk.intensity,
  pk.bond,
  pk.transition
FROM public.peaksets pk
INNER JOIN experiment_signature_duplicates d ON d.duplicate_id = pk.experimentid
WHERE NOT EXISTS (
  SELECT 1
  FROM public.peaksets existing
  WHERE existing.experimentid = d.canonical_id
    AND existing.energyev = pk.energyev
    AND COALESCE(existing.intensity, -1) = COALESCE(pk.intensity, -1)
    AND COALESCE(existing.bond, '') = COALESCE(pk.bond, '')
    AND COALESCE(existing.transition, '') = COALESCE(pk.transition, '')
);

DELETE FROM public.peaksets pk
USING experiment_signature_duplicates d
WHERE pk.experimentid = d.duplicate_id;

DELETE FROM public.experiments e
USING experiment_signature_duplicates d
WHERE e.id = d.duplicate_id;
