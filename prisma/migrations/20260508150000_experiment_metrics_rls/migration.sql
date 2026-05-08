ALTER TABLE "public"."experiment_metrics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."experiment_metrics" FORCE ROW LEVEL SECURITY;

ALTER TABLE "public"."experiment_metrics_channel" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."experiment_metrics_channel" FORCE ROW LEVEL SECURITY;

GRANT SELECT ON TABLE "public"."experiment_metrics" TO anon, authenticated;
GRANT SELECT ON TABLE "public"."experiment_metrics_channel" TO anon, authenticated;

CREATE POLICY "experiment_metrics_select_public"
ON "public"."experiment_metrics"
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM "public"."experiments" AS e
    WHERE e.id = experiment_id
  )
);

CREATE POLICY "experiment_metrics_channel_select_public"
ON "public"."experiment_metrics_channel"
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM "public"."experiments" AS e
    WHERE e.id = experiment_id
  )
);
