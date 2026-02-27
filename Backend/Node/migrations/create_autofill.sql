-- Autofill form fields: stored values and which fields to exclude from autofill
-- Used by extension/web to pre-fill job application forms; profile data is merged server-side.

CREATE TABLE IF NOT EXISTS public.user_autofill (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL,
  data              jsonb NOT NULL DEFAULT '{}',
  excluded_field_keys jsonb NOT NULL DEFAULT '[]',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_autofill_user_id UNIQUE (user_id),
  CONSTRAINT fk_user_autofill_user
    FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_autofill_user_id ON public.user_autofill (user_id);

COMMENT ON TABLE public.user_autofill IS 'Per-user autofill data for job application forms; data = field key -> value, excluded_field_keys = array of keys to not autofill.';
