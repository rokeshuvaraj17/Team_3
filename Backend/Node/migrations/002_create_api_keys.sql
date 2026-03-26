-- API key providers (OpenAI, Gemini, OpenRouter, etc.) and user API keys
-- Run this migration on your Supabase/Postgres database.

-- Providers reference table (slug used in code; name for display)
CREATE TABLE IF NOT EXISTS public.api_key_providers (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       text NOT NULL UNIQUE,
  name       text NOT NULL,
  description text,
  base_url   text,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.api_key_providers IS 'Supported AI/LLM API providers (OpenAI, Gemini, OpenRouter, etc.)';

-- User API keys: one row per user per provider (optional: allow multiple keys per provider via label)
CREATE TABLE IF NOT EXISTS public.user_api_keys (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  provider_id uuid NOT NULL,
  label       text,
  api_key_enc text NOT NULL,
  is_active   boolean NOT NULL DEFAULT true,
  last_used_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_user_api_keys_user
    FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE CASCADE,
  CONSTRAINT fk_user_api_keys_provider
    FOREIGN KEY (provider_id) REFERENCES public.api_key_providers (id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON public.user_api_keys (user_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_provider_id ON public.user_api_keys (provider_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_api_keys_user_provider_label
  ON public.user_api_keys (user_id, provider_id, COALESCE(label, ''));

COMMENT ON TABLE public.user_api_keys IS 'User-provided API keys for AI providers; api_key_enc stores the key (consider encrypting at rest in production).';

-- Seed default providers (idempotent: only insert if slug missing)
INSERT INTO public.api_key_providers (slug, name, description, base_url, display_order)
VALUES
  ('openai', 'OpenAI', 'GPT-4, GPT-3.5, and other OpenAI models', 'https://api.openai.com/v1', 10),
  ('gemini', 'Google Gemini', 'Gemini Pro and other Google AI models', 'https://generativelanguage.googleapis.com', 20),
  ('anthropic', 'Anthropic', 'Claude models', 'https://api.anthropic.com', 30),
  ('openrouter', 'OpenRouter', 'Unified API for many models (OpenAI, Anthropic, etc.)', 'https://openrouter.ai/api/v1', 40),
  ('groq', 'Groq', 'Fast inference (Llama, Mixtral)', 'https://api.groq.com/openai/v1', 50),
  ('together', 'Together AI', 'Open-source and custom models', 'https://api.together.xyz/v1', 60),
  ('mistral', 'Mistral AI', 'Mistral and Mixtral models', 'https://api.mistral.ai/v1', 70),
  ('cohere', 'Cohere', 'Command and embed models', 'https://api.cohere.ai', 80)
ON CONFLICT (slug) DO NOTHING;
