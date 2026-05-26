-- Compliance Phase 1 Wave 1: append-only audit_event table (spec section 4.3).
SET lock_timeout = '2min';

CREATE TABLE next_auth.audit_event (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  occurred_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actor_user_id VARCHAR(19),
  subject_user_id VARCHAR(19),
  event_type TEXT NOT NULL,
  event_scope TEXT NOT NULL,
  payload JSONB,
  source_ip TEXT,
  user_agent TEXT,
  session_id UUID,
  CONSTRAINT audit_event_pkey PRIMARY KEY (id)
);

CREATE INDEX audit_event_occurred_at_idx ON next_auth.audit_event (occurred_at);
CREATE INDEX audit_event_actor_user_id_occurred_at_idx ON next_auth.audit_event (actor_user_id, occurred_at);
CREATE INDEX audit_event_subject_user_id_occurred_at_idx ON next_auth.audit_event (subject_user_id, occurred_at);
CREATE INDEX audit_event_event_type_occurred_at_idx ON next_auth.audit_event (event_type, occurred_at);

REVOKE UPDATE, DELETE ON next_auth.audit_event FROM prisma;
GRANT INSERT ON next_auth.audit_event TO prisma;
