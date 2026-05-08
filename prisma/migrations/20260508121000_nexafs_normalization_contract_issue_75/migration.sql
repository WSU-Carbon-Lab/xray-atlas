ALTER TABLE "public"."experiments"
ADD COLUMN "normalization_scope" TEXT,
ADD COLUMN "normalization_ranges" JSONB,
ADD COLUMN "uploaded_channels" JSONB,
ADD COLUMN "channel_provenance" JSONB,
ADD COLUMN "validation_summary" JSONB,
ADD COLUMN "quality_scores" JSONB;

ALTER TABLE "public"."spectrumpoints"
ADD COLUMN "rawabserr" DOUBLE PRECISION,
ADD COLUMN "oderr" DOUBLE PRECISION,
ADD COLUMN "massabsorptionerr" DOUBLE PRECISION,
ADD COLUMN "betaerr" DOUBLE PRECISION;

UPDATE "public"."experiments" e
SET "uploaded_channels" = channels.channels
FROM (
  SELECT
    sp.experimentid,
    to_jsonb(
      array_remove(
        ARRAY[
          'rawabs',
          CASE WHEN bool_or(sp.od IS NOT NULL) THEN 'od' ELSE NULL END,
          CASE
            WHEN bool_or(sp.massabsorption IS NOT NULL)
              THEN 'massabsorption'
            ELSE NULL
          END,
          CASE WHEN bool_or(sp.beta IS NOT NULL) THEN 'beta' ELSE NULL END
        ],
        NULL
      )
    ) AS channels
  FROM "public"."spectrumpoints" sp
  GROUP BY sp.experimentid
) channels
WHERE e.id = channels.experimentid
  AND e.uploaded_channels IS NULL;

UPDATE "public"."experiments" e
SET "channel_provenance" = jsonb_build_object(
  'rawabs', 'uploaded_authoritative',
  'od', CASE
    WHEN EXISTS (
      SELECT 1 FROM "public"."spectrumpoints" sp
      WHERE sp.experimentid = e.id
        AND sp.od IS NOT NULL
    ) THEN 'derived'
    ELSE 'missing'
  END,
  'massabsorption', CASE
    WHEN EXISTS (
      SELECT 1 FROM "public"."spectrumpoints" sp
      WHERE sp.experimentid = e.id
        AND sp.massabsorption IS NOT NULL
    ) THEN 'derived_with_assumptions'
    ELSE 'missing'
  END,
  'beta', CASE
    WHEN EXISTS (
      SELECT 1 FROM "public"."spectrumpoints" sp
      WHERE sp.experimentid = e.id
        AND sp.beta IS NOT NULL
    ) THEN 'derived_with_assumptions'
    ELSE 'missing'
  END
)
WHERE e.channel_provenance IS NULL;
