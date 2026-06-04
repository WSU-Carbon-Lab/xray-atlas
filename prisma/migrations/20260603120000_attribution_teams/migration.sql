CREATE TABLE "public"."attribution_team" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "owner_id" VARCHAR(19) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attribution_team_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "attribution_team_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "next_auth"."user" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX "idx_attribution_team_owner_id" ON "public"."attribution_team" ("owner_id");

CREATE TABLE "public"."attribution_team_member" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "team_id" UUID NOT NULL,
    "orcid_id" VARCHAR(19) NOT NULL,
    "user_id" VARCHAR(19),
    "display_name" TEXT,
    "contributor_type" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attribution_team_member_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "attribution_team_member_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."attribution_team" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "attribution_team_member_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "next_auth"."user" ("id") ON DELETE SET NULL ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX "attribution_team_member_unique_role" ON "public"."attribution_team_member" ("team_id", "orcid_id", "contributor_type");
CREATE INDEX "idx_attribution_team_member_team_id" ON "public"."attribution_team_member" ("team_id");
CREATE INDEX "idx_attribution_team_member_orcid_id" ON "public"."attribution_team_member" ("orcid_id");
