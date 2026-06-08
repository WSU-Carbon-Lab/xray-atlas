ALTER TABLE "public"."dashboard_processing_session"
ADD COLUMN "linked_experiment_id" UUID;

ALTER TABLE "public"."dashboard_processing_session"
ADD CONSTRAINT "dashboard_processing_session_linked_experiment_id_fkey"
FOREIGN KEY ("linked_experiment_id") REFERENCES "public"."experiments" ("id") ON DELETE SET NULL ON UPDATE NO ACTION;

CREATE INDEX "idx_dashboard_processing_session_linked_experiment"
ON "public"."dashboard_processing_session" ("linked_experiment_id");
