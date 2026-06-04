-- Supabase Storage buckets and RLS for NEXAFS auxiliary file uploads.
-- Apply manually in the Supabase SQL editor or via your deployment workflow.
-- Idempotent where PostgreSQL allows; re-run safe for policy upserts.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'sample-aux',
  'sample-aux',
  true,
  52428800,
  ARRAY[
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/csv',
    'text/tab-separated-values',
    'application/json',
    'application/zip',
    'application/gzip',
    'application/x-gzip',
    'application/x-tar',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/tiff',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/x-hdf5',
    'application/x-hdf',
    'application/netcdf',
    'chemical/x-cif',
    'chemical/x-pdb'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'experiment-aux',
  'experiment-aux',
  true,
  524288000,
  ARRAY[
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/csv',
    'text/tab-separated-values',
    'application/json',
    'application/zip',
    'application/gzip',
    'application/x-gzip',
    'application/x-tar',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/tiff',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/x-hdf5',
    'application/x-hdf',
    'application/netcdf',
    'chemical/x-cif',
    'chemical/x-pdb'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "sample_aux_public_read" ON storage.objects;
CREATE POLICY "sample_aux_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'sample-aux');

DROP POLICY IF EXISTS "sample_aux_authenticated_insert" ON storage.objects;
CREATE POLICY "sample_aux_authenticated_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'sample-aux');

DROP POLICY IF EXISTS "sample_aux_authenticated_delete" ON storage.objects;
CREATE POLICY "sample_aux_authenticated_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'sample-aux');

DROP POLICY IF EXISTS "experiment_aux_public_read" ON storage.objects;
CREATE POLICY "experiment_aux_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'experiment-aux');

DROP POLICY IF EXISTS "experiment_aux_authenticated_insert" ON storage.objects;
CREATE POLICY "experiment_aux_authenticated_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'experiment-aux');

DROP POLICY IF EXISTS "experiment_aux_authenticated_delete" ON storage.objects;
CREATE POLICY "experiment_aux_authenticated_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'experiment-aux');
