SET lock_timeout = '2min';

ALTER TABLE public.facilities
  ADD COLUMN IF NOT EXISTS websiteurl TEXT,
  ADD COLUMN IF NOT EXISTS faviconurl TEXT;
