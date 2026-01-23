-- Enable Row Level Security on all public tables
-- This migration implements RLS policies to protect against direct Supabase REST API access
-- Note: Prisma operations use service role and bypass RLS, but these policies protect the REST API

-- Helper function to check if current role is service role (bypasses RLS)
-- Service role operations will always be allowed
CREATE OR REPLACE FUNCTION is_service_role()
RETURNS boolean AS $$
BEGIN
  RETURN current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    OR current_user = 'postgres'
    OR current_user = 'supabase_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reference Tables: Public read, authenticated write via service role
-- These tables contain reference data that should be publicly readable

ALTER TABLE calibrationmethods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "calibrationmethods_select_policy" ON calibrationmethods
  FOR SELECT USING (true);
CREATE POLICY "calibrationmethods_all_service_role" ON calibrationmethods
  FOR ALL USING (is_service_role());

ALTER TABLE edges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "edges_select_policy" ON edges
  FOR SELECT USING (true);
CREATE POLICY "edges_all_service_role" ON edges
  FOR ALL USING (is_service_role());

ALTER TABLE polarizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "polarizations_select_policy" ON polarizations
  FOR SELECT USING (true);
CREATE POLICY "polarizations_all_service_role" ON polarizations
  FOR ALL USING (is_service_role());

ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "facilities_select_policy" ON facilities
  FOR SELECT USING (true);
CREATE POLICY "facilities_all_service_role" ON facilities
  FOR ALL USING (is_service_role());

ALTER TABLE instruments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "instruments_select_policy" ON instruments
  FOR SELECT USING (true);
CREATE POLICY "instruments_all_service_role" ON instruments
  FOR ALL USING (is_service_role());

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vendors_select_policy" ON vendors
  FOR SELECT USING (true);
CREATE POLICY "vendors_all_service_role" ON vendors
  FOR ALL USING (is_service_role());

ALTER TABLE publications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "publications_select_policy" ON publications
  FOR SELECT USING (true);
CREATE POLICY "publications_all_service_role" ON publications
  FOR ALL USING (is_service_role());

-- Data Tables: Public read, service role write
-- These tables contain user-contributed data that should be publicly readable
-- Write operations are restricted to service role (via Prisma)

ALTER TABLE molecules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "molecules_select_policy" ON molecules
  FOR SELECT USING (true);
CREATE POLICY "molecules_all_service_role" ON molecules
  FOR ALL USING (is_service_role());

ALTER TABLE moleculesynonyms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "moleculesynonyms_select_policy" ON moleculesynonyms
  FOR SELECT USING (true);
CREATE POLICY "moleculesynonyms_all_service_role" ON moleculesynonyms
  FOR ALL USING (is_service_role());

ALTER TABLE samples ENABLE ROW LEVEL SECURITY;
CREATE POLICY "samples_select_policy" ON samples
  FOR SELECT USING (true);
CREATE POLICY "samples_all_service_role" ON samples
  FOR ALL USING (is_service_role());

ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;
-- experiments table already has RLS enabled, but we need to add policies
CREATE POLICY "experiments_select_policy" ON experiments
  FOR SELECT USING (true);
CREATE POLICY "experiments_all_service_role" ON experiments
  FOR ALL USING (is_service_role());

ALTER TABLE spectrumpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spectrumpoints_select_policy" ON spectrumpoints
  FOR SELECT USING (true);
CREATE POLICY "spectrumpoints_all_service_role" ON spectrumpoints
  FOR ALL USING (is_service_role());

ALTER TABLE experimentquality ENABLE ROW LEVEL SECURITY;
CREATE POLICY "experimentquality_select_policy" ON experimentquality
  FOR SELECT USING (true);
CREATE POLICY "experimentquality_all_service_role" ON experimentquality
  FOR ALL USING (is_service_role());

ALTER TABLE experimentpublications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "experimentpublications_select_policy" ON experimentpublications
  FOR SELECT USING (true);
CREATE POLICY "experimentpublications_all_service_role" ON experimentpublications
  FOR ALL USING (is_service_role());

ALTER TABLE peaksets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "peaksets_select_policy" ON peaksets
  FOR SELECT USING (true);
CREATE POLICY "peaksets_all_service_role" ON peaksets
  FOR ALL USING (is_service_role());

-- User Interaction Tables

ALTER TABLE moleculeupvotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "moleculeupvotes_select_policy" ON moleculeupvotes
  FOR SELECT USING (true);
CREATE POLICY "moleculeupvotes_all_service_role" ON moleculeupvotes
  FOR ALL USING (is_service_role());

ALTER TABLE collaborators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "collaborators_select_policy" ON collaborators
  FOR SELECT USING (true);
CREATE POLICY "collaborators_all_service_role" ON collaborators
  FOR ALL USING (is_service_role());

-- Users table: Public read for profile data, service role for all operations
-- users table already has RLS enabled, but needs policies
CREATE POLICY "users_select_policy" ON users
  FOR SELECT USING (true);
CREATE POLICY "users_all_service_role" ON users
  FOR ALL USING (is_service_role());
