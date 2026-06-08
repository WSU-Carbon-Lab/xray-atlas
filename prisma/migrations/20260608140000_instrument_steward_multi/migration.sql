SET lock_timeout = '2min';

ALTER TABLE public.instrument_steward
  DROP CONSTRAINT instrument_steward_pkey;

ALTER TABLE public.instrument_steward
  ADD CONSTRAINT instrument_steward_pkey PRIMARY KEY (instrument_id, user_id);

CREATE INDEX IF NOT EXISTS idx_instrument_steward_instrument_id
  ON public.instrument_steward (instrument_id);
