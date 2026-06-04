ALTER TABLE "public"."attribution_team"
ADD COLUMN "institution" TEXT,
ADD COLUMN "research_group_name" TEXT,
ADD COLUMN "group_type" TEXT NOT NULL DEFAULT 'beamtime',
ADD COLUMN "pi_orcid_id" VARCHAR(19),
ADD COLUMN "experiment_lead_orcid_id" VARCHAR(19);

ALTER TABLE "public"."attribution_team"
ADD CONSTRAINT "attribution_team_group_type_check"
CHECK ("group_type" IN ('beamtime', 'working'));
