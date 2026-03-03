-- Add is_default to user_api_keys so one key per user can be the default for AI (resume, cover letter, autofill).
-- Run after create_api_keys.sql.

ALTER TABLE public.user_api_keys
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

-- At most one key per user can be default
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_api_keys_user_default
  ON public.user_api_keys (user_id)
  WHERE is_default = true;

COMMENT ON COLUMN public.user_api_keys.is_default IS 'When true, this key is used as default for AI (resume, cover letter, autofill) when client does not send api_key_id.';
