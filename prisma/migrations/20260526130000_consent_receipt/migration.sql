-- Compliance Phase 1 Wave 2 Track C: consent_receipt and contribution agreement version (spec section 4.5).
SET lock_timeout = '2min';

ALTER TABLE next_auth."user"
  ADD COLUMN IF NOT EXISTS contribution_agreement_version TEXT;

CREATE TABLE next_auth.consent_receipt (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id VARCHAR(19) NOT NULL,
  agreement_version TEXT NOT NULL,
  accepted_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  orcid_at_acceptance VARCHAR(19) NOT NULL,
  email_at_acceptance TEXT,
  name_at_acceptance TEXT,
  source_ip TEXT,
  CONSTRAINT consent_receipt_pkey PRIMARY KEY (id),
  CONSTRAINT consent_receipt_user_id_fkey FOREIGN KEY (user_id) REFERENCES next_auth."user"(id) ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX consent_receipt_user_id_accepted_at_idx ON next_auth.consent_receipt (user_id, accepted_at);
