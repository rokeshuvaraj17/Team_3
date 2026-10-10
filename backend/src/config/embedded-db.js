const path = require('path')
const fs = require('fs')

let client = null

const BOOTSTRAP_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  email           text NOT NULL,
  password_hash   text NOT NULL,
  email_verified  boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_users_email UNIQUE (email)
);

CREATE TABLE IF NOT EXISTS user_profiles (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL UNIQUE,
  display_name      text NOT NULL,
  headline          text,
  summary           text,
  location          text,
  location_country  text,
  state             text,
  profile_image_url text,
  phone             text,
  website_url       text,
  linkedin_url      text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_user_profiles_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_autofill (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL UNIQUE,
  data               jsonb NOT NULL DEFAULT '{}',
  excluded_field_keys jsonb NOT NULL DEFAULT '[]',
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_user_autofill_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS job_tracker (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL,
  company_name       text,
  position_title     text,
  location           text,
  min_salary         numeric(12, 2),
  max_salary         numeric(12, 2),
  currency           text,
  salary_period      text,
  job_type           text,
  job_description    text,
  notes              text,
  application_status text DEFAULT 'not_applied',
  job_posting_url    text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_job_tracker_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS resumes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL,
  name         text NOT NULL,
  file_url     text NOT NULL,
  is_primary   boolean NOT NULL DEFAULT false,
  html_content text,
  uploaded_at  timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_resumes_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cover_letters (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL,
  job_id       uuid,
  title        text NOT NULL,
  file_url     text NOT NULL,
  html_content text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_cover_letters_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS api_key_providers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text NOT NULL UNIQUE,
  name          text NOT NULL,
  description   text,
  base_url      text,
  display_order int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_api_keys (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL,
  provider_id  uuid NOT NULL,
  label        text,
  api_key_enc  text NOT NULL,
  is_active    boolean NOT NULL DEFAULT true,
  last_used_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_user_api_keys_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_user_api_keys_provider FOREIGN KEY (provider_id) REFERENCES api_key_providers (id) ON DELETE RESTRICT
);

INSERT INTO api_key_providers (slug, name, description, base_url, display_order)
VALUES
  ('openai', 'OpenAI', 'GPT-4, GPT-3.5, and other OpenAI models', 'https://api.openai.com/v1', 10),
  ('gemini', 'Google Gemini', 'Gemini Pro and other Google AI models', 'https://generativelanguage.googleapis.com', 20),
  ('anthropic', 'Anthropic', 'Claude models', 'https://api.anthropic.com', 30),
  ('openrouter', 'OpenRouter', 'Unified API for many models', 'https://openrouter.ai/api/v1', 40)
ON CONFLICT (slug) DO NOTHING;
`

function isEnabled() {
  const raw = String(process.env.EMBEDDED_PG || '').trim().toLowerCase()
  return raw === '1' || raw === 'true' || raw === 'yes'
}

async function start() {
  const { PGlite } = require('@electric-sql/pglite')
  const dataDir = process.env.EMBEDDED_PG_DIR || path.join(process.cwd(), 'data', 'pglite')
  fs.mkdirSync(dataDir, { recursive: true })
  client = new PGlite(dataDir)
  await client.waitReady
  await client.exec(BOOTSTRAP_SQL)
  console.log(`[db] embedded PGlite ready at ${dataDir}`)
  return client
}

async function query(text, params) {
  if (!client) throw new Error('Embedded database not started')
  return client.query(text, params)
}

const adapter = {
  query,
  getStatus() {
    return {
      primaryConfigured: true,
      secondaryConfigured: false,
      embedded: true,
      nodes: [{ name: 'embedded', up: Boolean(client) }],
    }
  },
  isConnectionError() {
    return false
  },
}

module.exports = { isEnabled, start, adapter }
