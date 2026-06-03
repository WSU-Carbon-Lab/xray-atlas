-- Remote drift: composite primary key on next_auth.user_app_role was missing after ORCID PK migration.
-- All rows have non-null user_id; re-enforce NOT NULL and (user_id, role_id) primary key.

ALTER TABLE next_auth.user_app_role
  ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE next_auth.user_app_role
  ADD CONSTRAINT user_app_role_pkey PRIMARY KEY (user_id, role_id);
