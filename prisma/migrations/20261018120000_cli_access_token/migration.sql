-- Read credentials for the nexcat CLI. Plaintext tokens are not stored.
SET lock_timeout = '2min';

CREATE TABLE next_auth.cli_access_token (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id VARCHAR(19) NOT NULL,
  name VARCHAR(64) NOT NULL,
  token_hash VARCHAR(64) NOT NULL,
  token_prefix VARCHAR(16) NOT NULL,
  scope VARCHAR(32) NOT NULL,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMPTZ(6),
  revoked_at TIMESTAMPTZ(6),
  CONSTRAINT cli_access_token_pkey PRIMARY KEY (id),
  CONSTRAINT cli_access_token_token_hash_key UNIQUE (token_hash),
  CONSTRAINT cli_access_token_scope_check CHECK (scope = 'read'),
  CONSTRAINT cli_access_token_user_id_fkey FOREIGN KEY (user_id) REFERENCES next_auth."user"(id) ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX cli_access_token_user_id_idx ON next_auth.cli_access_token (user_id);

CREATE TABLE next_auth.cli_authorization_code (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id VARCHAR(19) NOT NULL,
  code_hash VARCHAR(64) NOT NULL,
  code_challenge VARCHAR(128) NOT NULL,
  redirect_uri VARCHAR(256) NOT NULL,
  expires_at TIMESTAMPTZ(6) NOT NULL,
  consumed_at TIMESTAMPTZ(6),
  CONSTRAINT cli_authorization_code_pkey PRIMARY KEY (id),
  CONSTRAINT cli_authorization_code_code_hash_key UNIQUE (code_hash),
  CONSTRAINT cli_authorization_code_user_id_fkey FOREIGN KEY (user_id) REFERENCES next_auth."user"(id) ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX cli_authorization_code_expires_at_idx ON next_auth.cli_authorization_code (expires_at);
