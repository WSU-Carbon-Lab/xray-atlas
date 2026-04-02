ALTER TABLE "public"."experiments"
DROP COLUMN IF EXISTS "source_json_path";

ALTER TABLE "public"."experimentquality"
DROP COLUMN IF EXISTS "downvotes";

ALTER TABLE "public"."experimentquality"
DROP COLUMN IF EXISTS "upvotes";

ALTER TABLE "public"."experimentquality"
ADD COLUMN IF NOT EXISTS "favorites" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "public"."experiment_favorites" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "experiment_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "experiment_favorites_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "experiment_favorites_experiment_id_user_id_key" UNIQUE ("experiment_id", "user_id"),
  CONSTRAINT "experiment_favorites_experiment_id_fkey" FOREIGN KEY ("experiment_id") REFERENCES "public"."experiments" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "experiment_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "next_auth"."user" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX IF NOT EXISTS "experiment_favorites_experiment_id_idx"
ON "public"."experiment_favorites" ("experiment_id");

CREATE INDEX IF NOT EXISTS "experiment_favorites_user_id_idx"
ON "public"."experiment_favorites" ("user_id");
