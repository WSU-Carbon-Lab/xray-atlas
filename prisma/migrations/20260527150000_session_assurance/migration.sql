-- Compliance Phase 1 Wave 3: session_assurance for ORCID OIDC auth_time / amr capture (spec section 4.6).
SET lock_timeout = '2min';

CREATE TABLE next_auth.session_assurance (
  session_id UUID NOT NULL,
  authenticator TEXT,
  asserted_aal TEXT,
  amr_from_upstream JSONB,
  passkey_credential_id VARCHAR(1024),
  established_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_verified_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT session_assurance_pkey PRIMARY KEY (session_id),
  CONSTRAINT session_assurance_session_id_fkey FOREIGN KEY (session_id) REFERENCES next_auth.session(id) ON DELETE CASCADE ON UPDATE NO ACTION
);
