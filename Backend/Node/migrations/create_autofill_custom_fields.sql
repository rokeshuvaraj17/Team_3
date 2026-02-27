-- Custom key/value pairs for autofill (site-specific or one-off fields)
-- key = field identifier (e.g. "custom_question_1"), value = value to fill

CREATE TABLE IF NOT EXISTS public.user_autofill_custom_fields (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL,
  field_key  text NOT NULL,
  field_value text NOT NULL DEFAULT '',
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_user_autofill_custom_user
    FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_autofill_custom_user_id ON public.user_autofill_custom_fields (user_id);

COMMENT ON TABLE public.user_autofill_custom_fields IS 'User-defined key/value pairs for autofilling custom or site-specific form fields.';
