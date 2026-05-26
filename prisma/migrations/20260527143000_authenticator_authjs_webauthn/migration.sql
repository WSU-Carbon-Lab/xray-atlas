-- Compliance Phase 1 Track B: Auth.js WebAuthn authenticator shape (credentialPublicKey, lifecycle fields).
-- Legacy rows lacked credentialPublicKey and cannot be used for verification; force re-enrollment.
SET lock_timeout = '2min';

DELETE FROM next_auth."Authenticator";

ALTER TABLE next_auth."Authenticator" DROP CONSTRAINT IF EXISTS "Authenticator_pkey";

DROP INDEX IF EXISTS next_auth."Authenticator_credentialID_key";

ALTER TABLE next_auth."Authenticator" DROP COLUMN IF EXISTS id;

ALTER TABLE next_auth."Authenticator"
  ADD COLUMN IF NOT EXISTS "credentialPublicKey" TEXT,
  ADD COLUMN IF NOT EXISTS "providerAccountId" VARCHAR(1024),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS aaguid VARCHAR(64),
  ADD COLUMN IF NOT EXISTS attestation_format VARCHAR(64),
  ADD COLUMN IF NOT EXISTS nickname VARCHAR(100);

ALTER TABLE next_auth."Authenticator"
  ALTER COLUMN "credentialPublicKey" SET NOT NULL,
  ALTER COLUMN "providerAccountId" SET NOT NULL;

ALTER TABLE next_auth."Authenticator"
  ADD CONSTRAINT "Authenticator_pkey" PRIMARY KEY ("credentialID");
