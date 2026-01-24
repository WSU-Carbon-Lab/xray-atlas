-- Extend next_auth.users with application-specific fields
-- This migration adds fields that were previously in public.users

-- Add application fields to next_auth.users
ALTER TABLE "next_auth"."users" 
  ADD COLUMN IF NOT EXISTS "orcid" TEXT,
  ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'contributor',
  ADD COLUMN IF NOT EXISTS "contributionAgreementAccepted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "contributionAgreementDate" TIMESTAMPTZ;

-- Create index on orcid for faster lookups
CREATE INDEX IF NOT EXISTS "users_orcid_idx" ON "next_auth"."users"("orcid");

-- Update foreign key columns to UUID type
-- First, drop existing foreign keys if they exist (they may not exist yet)
DO $$
BEGIN
  -- Drop foreign key constraints if they exist
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND constraint_name = 'experiments_createdby_fkey'
  ) THEN
    ALTER TABLE "public"."experiments" DROP CONSTRAINT "experiments_createdby_fkey";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND constraint_name = 'molecules_createdby_fkey'
  ) THEN
    ALTER TABLE "public"."molecules" DROP CONSTRAINT "molecules_createdby_fkey";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND constraint_name = 'moleculeupvotes_userid_fkey'
  ) THEN
    ALTER TABLE "public"."moleculeupvotes" DROP CONSTRAINT "moleculeupvotes_userid_fkey";
  END IF;
END $$;

-- Convert createdby/userid columns to UUID
-- First, clear any invalid data (non-UUID strings)
UPDATE "public"."experiments" 
SET "createdby" = NULL 
WHERE "createdby" IS NOT NULL 
AND "createdby" !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

UPDATE "public"."molecules" 
SET "createdby" = NULL 
WHERE "createdby" IS NOT NULL 
AND "createdby" !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

UPDATE "public"."moleculeupvotes" 
SET "userid" = NULL 
WHERE "userid" IS NOT NULL 
AND "userid" !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Alter column types to UUID
ALTER TABLE "public"."experiments" 
  ALTER COLUMN "createdby" TYPE UUID USING "createdby"::UUID;

ALTER TABLE "public"."molecules" 
  ALTER COLUMN "createdby" TYPE UUID USING "createdby"::UUID;

ALTER TABLE "public"."moleculeupvotes" 
  ALTER COLUMN "userid" TYPE UUID USING "userid"::UUID;

-- Add foreign key constraints
ALTER TABLE "public"."experiments" 
  ADD CONSTRAINT "experiments_createdby_fkey" 
  FOREIGN KEY ("createdby") 
  REFERENCES "next_auth"."users"("id") 
  ON UPDATE NO ACTION 
  ON DELETE SET NULL;

ALTER TABLE "public"."molecules" 
  ADD CONSTRAINT "molecules_createdby_fkey" 
  FOREIGN KEY ("createdby") 
  REFERENCES "next_auth"."users"("id") 
  ON UPDATE NO ACTION 
  ON DELETE SET NULL;

ALTER TABLE "public"."moleculeupvotes" 
  ADD CONSTRAINT "moleculeupvotes_userid_fkey" 
  FOREIGN KEY ("userid") 
  REFERENCES "next_auth"."users"("id") 
  ON UPDATE NO ACTION 
  ON DELETE CASCADE;
