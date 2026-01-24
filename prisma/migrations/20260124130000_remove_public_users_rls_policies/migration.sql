-- Remove RLS policies referencing public.users table
-- This table no longer exists as we've consolidated to next_auth.users

-- Drop RLS policies for public.users if they exist
DO $$
BEGIN
  -- Drop users_select_policy if it exists
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND policyname = 'users_select_policy'
  ) THEN
    DROP POLICY "users_select_policy" ON "public"."users";
  END IF;

  -- Drop users_all_service_role if it exists
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND policyname = 'users_all_service_role'
  ) THEN
    DROP POLICY "users_all_service_role" ON "public"."users";
  END IF;
END $$;

-- Note: We do not drop the public.users table here as it may not exist
-- If it exists, it should be dropped separately after data migration
