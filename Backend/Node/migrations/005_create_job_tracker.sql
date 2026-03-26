-- Job tracker: save jobs from autofill/job pages for analytics and management.
-- Aligned with design-postgres-tables: UUID for id, FK indexed, timestamptz, text.

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
  CONSTRAINT fk_job_tracker_user
    FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_job_tracker_user_id ON job_tracker (user_id);
CREATE INDEX IF NOT EXISTS idx_job_tracker_created_at ON job_tracker (created_at DESC);

COMMENT ON TABLE job_tracker IS 'Jobs saved by user from autofill/extension for tracking and analytics.';

-- Reuse set_updated_at if it exists (from cover_letters migration)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_job_tracker_updated_at ON job_tracker;
CREATE TRIGGER tr_job_tracker_updated_at
  BEFORE UPDATE ON job_tracker
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
