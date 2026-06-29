-- Cover letters: multiple per user, optional link to job (template for a job).
-- Files stored in Cloudinary (cover-letters folder); this table stores metadata + URL.
-- Aligned with design-postgres-tables: UUID for id, FK indexed, timestamptz, text.

CREATE TABLE IF NOT EXISTS cover_letters (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL,
  job_id       uuid,                    -- optional: link to jobs(id) if you have internal jobs table
  title        text NOT NULL,
  file_url     text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_cover_letters_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_cover_letters_user_id ON cover_letters (user_id);
CREATE INDEX idx_cover_letters_job_id ON cover_letters (job_id)
  WHERE job_id IS NOT NULL;

COMMENT ON TABLE cover_letters IS 'User uploads of cover letter files (e.g. PDF); stored in Cloudinary.';

-- updated_at trigger (reuse existing function if present)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_cover_letters_updated_at ON cover_letters;
CREATE TRIGGER tr_cover_letters_updated_at
  BEFORE UPDATE ON cover_letters
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
