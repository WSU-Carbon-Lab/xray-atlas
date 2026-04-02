ALTER TABLE "public"."moleculesynonyms" ADD COLUMN "slug" TEXT;

UPDATE "public"."moleculesynonyms" ms
SET "slug" = COALESCE(
  NULLIF(
    btrim(
      regexp_replace(lower(trim(ms."synonym")), '[^a-z0-9]+', '-', 'g'),
      '-'
    ),
    ''
  ),
  'molecule'
)
WHERE ms."slug" IS NULL;

ALTER TABLE "public"."moleculesynonyms" ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE "public"."moleculesynonyms"
  ADD CONSTRAINT "moleculesynonyms_slug_canonical"
  CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

CREATE INDEX "moleculesynonyms_slug_idx" ON "public"."moleculesynonyms" ("slug");
CREATE INDEX "moleculesynonyms_slug_moleculeid_idx"
  ON "public"."moleculesynonyms" ("slug", "moleculeid");
