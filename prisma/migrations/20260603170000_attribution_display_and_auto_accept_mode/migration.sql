SET lock_timeout = '2min';

ALTER TABLE next_auth."user"
  ADD COLUMN auto_accept_mode TEXT NOT NULL DEFAULT 'off',
  ADD COLUMN attribution_display_preferences JSONB NOT NULL DEFAULT '{"pending":"orcid_only","accepted":"name_and_avatar","unclaimed":"orcid_only"}'::jsonb;

ALTER TABLE next_auth."user"
  ADD CONSTRAINT user_auto_accept_mode_check
  CHECK (auto_accept_mode IN ('off', 'all'));

UPDATE next_auth."user"
SET auto_accept_mode = 'all'
WHERE auto_accept_attributions = true;

UPDATE next_auth."user" u
SET attribution_display_preferences = jsonb_set(
  attribution_display_preferences,
  '{pending}',
  '"name_and_avatar"'::jsonb
)
WHERE EXISTS (
  SELECT 1
  FROM next_auth.user_app_role uar
  INNER JOIN next_auth.app_role ar ON ar.id = uar.role_id
  WHERE uar.user_id = u.id
    AND ar.slug IN ('administrator', 'maintainer')
);

UPDATE next_auth."user"
SET attribution_display_preferences = jsonb_set(
  attribution_display_preferences,
  '{pending}',
  '"name_only"'::jsonb
)
WHERE show_name_on_pending_attributions = true
  AND NOT EXISTS (
    SELECT 1
    FROM next_auth.user_app_role uar
    INNER JOIN next_auth.app_role ar ON ar.id = uar.role_id
    WHERE uar.user_id = next_auth."user".id
      AND ar.slug IN ('administrator', 'maintainer')
  );

ALTER TABLE next_auth."user"
  DROP COLUMN show_name_on_pending_attributions,
  DROP COLUMN auto_accept_attributions;
