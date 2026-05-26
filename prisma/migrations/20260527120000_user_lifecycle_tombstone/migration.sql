-- Compliance Phase 1 Wave 2 Track D: user lifecycle columns and user_tombstone (spec sections 4.1, 4.4 Pattern A).
SET lock_timeout = '2min';

ALTER TABLE next_auth."user"
  ADD COLUMN IF NOT EXISTS "disabledAt" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "disabledReason" TEXT,
  ADD COLUMN IF NOT EXISTS "lastActivityAt" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "mfaEnforcedAt" TIMESTAMPTZ(6);

CREATE TABLE next_auth.user_tombstone (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  former_orcid VARCHAR(19),
  erased_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  erasure_scope TEXT NOT NULL,
  preserved_display TEXT,
  CONSTRAINT user_tombstone_pkey PRIMARY KEY (id)
);
