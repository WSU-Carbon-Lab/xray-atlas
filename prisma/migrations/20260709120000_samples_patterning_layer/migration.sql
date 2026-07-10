-- Adds optional sample patterning layer text for NEXAFS contribute and browse sample panels.
-- Deploy before app code that reads/writes samples.patterninglayer (PR #109).
ALTER TABLE "public"."samples" ADD COLUMN "patterninglayer" TEXT;
