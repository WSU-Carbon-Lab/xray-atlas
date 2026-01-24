-- Setup NextAuth schema permissions for Supabase
-- This migration configures secure access to the next_auth schema
-- This script is idempotent and safe to run multiple times

-- Grant permissions to postgres role (used by DATABASE_URL)
-- Note: postgres is a superuser role, but explicit grants ensure compatibility
DO $$
BEGIN
  -- Grant schema usage
  EXECUTE 'GRANT USAGE ON SCHEMA next_auth TO postgres';

  -- Grant table permissions (only if tables exist)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'next_auth' AND table_name = 'users') THEN
    EXECUTE 'GRANT ALL ON ALL TABLES IN SCHEMA next_auth TO postgres';
  END IF;

  -- Grant function permissions (only if functions exist)
  IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'next_auth') THEN
    EXECUTE 'GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA next_auth TO postgres';
  END IF;

  -- Grant sequence permissions (only if sequences exist)
  IF EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_schema = 'next_auth') THEN
    EXECUTE 'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA next_auth TO postgres';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Note: Some permissions may already be set or postgres may have default access';
END $$;

-- Also grant to service_role for consistency (if using service_role connection)
DO $$
BEGIN
  EXECUTE 'GRANT USAGE ON SCHEMA next_auth TO service_role';
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'next_auth' AND table_name = 'users') THEN
    EXECUTE 'GRANT ALL ON ALL TABLES IN SCHEMA next_auth TO service_role';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'next_auth') THEN
    EXECUTE 'GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA next_auth TO service_role';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_schema = 'next_auth') THEN
    EXECUTE 'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA next_auth TO service_role';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Note: service_role permissions may already be set';
END $$;

-- Set default privileges for future objects (safe to run multiple times)
ALTER DEFAULT PRIVILEGES IN SCHEMA next_auth GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA next_auth GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA next_auth GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA next_auth GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA next_auth GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA next_auth GRANT ALL ON FUNCTIONS TO service_role;

-- Enable RLS on next_auth tables (idempotent - safe to run multiple times)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'next_auth' AND table_name = 'users') THEN
    ALTER TABLE next_auth.users ENABLE ROW LEVEL SECURITY;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'next_auth' AND table_name = 'sessions') THEN
    ALTER TABLE next_auth.sessions ENABLE ROW LEVEL SECURITY;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'next_auth' AND table_name = 'accounts') THEN
    ALTER TABLE next_auth.accounts ENABLE ROW LEVEL SECURITY;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'next_auth' AND table_name = 'verification_tokens') THEN
    ALTER TABLE next_auth.verification_tokens ENABLE ROW LEVEL SECURITY;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'RLS may already be enabled on some tables';
END $$;
