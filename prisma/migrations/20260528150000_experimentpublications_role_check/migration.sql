ALTER TABLE "public"."experimentpublications"
ADD CONSTRAINT "experimentpublications_role_check"
CHECK ("role" IN ('cited', 'source'));
