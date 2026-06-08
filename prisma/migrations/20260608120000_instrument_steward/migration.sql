SET lock_timeout = '2min';

CREATE TABLE public.instrument_steward (
  instrument_id TEXT NOT NULL,
  user_id VARCHAR(19) NOT NULL,
  assigned_by_user_id VARCHAR(19) NOT NULL,
  assigned_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  claim_issue_url TEXT,
  notes TEXT,
  CONSTRAINT instrument_steward_pkey PRIMARY KEY (instrument_id),
  CONSTRAINT instrument_steward_instrument_id_fkey
    FOREIGN KEY (instrument_id) REFERENCES public.instruments(id)
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT instrument_steward_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES next_auth."user"(id)
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT instrument_steward_assigned_by_user_id_fkey
    FOREIGN KEY (assigned_by_user_id) REFERENCES next_auth."user"(id)
    ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE INDEX idx_instrument_steward_user_id
  ON public.instrument_steward (user_id);
