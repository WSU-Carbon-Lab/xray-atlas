-- Private Supabase Storage bucket for optical model tensor blobs.
-- Applied once through the Supabase SQL editor or MCP. Idempotent.
-- Private (public = false) with no storage.objects policies: only the service role (used by the
-- server) and signed URLs can read or write. 134217728 bytes = 128 MiB, matching MAX_TENSOR_BYTES.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'optical-model-tensors',
  'optical-model-tensors',
  false,
  134217728,
  ARRAY['application/octet-stream', 'application/zip', 'application/vnd.apache.parquet']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
