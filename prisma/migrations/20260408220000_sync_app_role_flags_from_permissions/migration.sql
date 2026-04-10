SET lock_timeout = '2min';

UPDATE "next_auth"."app_role"
SET
  "can_access_labs" = (
    "permissions" @> '["labs_access"]'::jsonb
  ),
  "can_manage_users" = (
    "permissions" @> '["user_directory"]'::jsonb
    OR "permissions" @> '["user_roles"]'::jsonb
    OR "permissions" @> '["user_delete"]'::jsonb
  );
