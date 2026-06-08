CREATE TYPE "public"."DashboardProcessingSessionStatus" AS ENUM ('draft', 'processing', 'ready', 'archived');

CREATE TABLE "public"."dashboard_processing_session" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" VARCHAR(19) NOT NULL,
    "instrument_slug" TEXT NOT NULL,
    "title" TEXT,
    "status" "public"."DashboardProcessingSessionStatus" NOT NULL DEFAULT 'draft',
    "step_metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dashboard_processing_session_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "dashboard_processing_session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "next_auth"."user" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX "idx_dashboard_processing_session_user_id" ON "public"."dashboard_processing_session" ("user_id");
CREATE INDEX "idx_dashboard_processing_session_user_updated" ON "public"."dashboard_processing_session" ("user_id", "updated_at" DESC);
