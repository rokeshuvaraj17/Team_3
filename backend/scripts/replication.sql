-- =============================================================================
-- Replication objects: change-log + capture triggers.
-- Idempotent and safe to re-run on BOTH databases (primary + secondary).
--
-- How it works:
--   * Every data table gets an AFTER INSERT/UPDATE/DELETE trigger that records
--     the change (full row as jsonb) into public.replication_log.
--   * The replication worker ships unshipped log rows to the peer database and
--     applies them inside a transaction that sets the GUC `app.replicating='on'`.
--   * All replication-aware triggers below check that GUC and SKIP their work
--     when it is 'on', so applied changes are NOT re-logged (no feedback loop)
--     and updated_at is preserved exactly. This needs no superuser, so it works
--     on Supabase (unlike session_replication_role).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.replication_log (
  seq         bigserial PRIMARY KEY,
  table_name  text NOT NULL,
  op          char(1) NOT NULL,            -- I / U / D
  row_id      uuid NOT NULL,               -- every table's PK is "id"
  row_data    jsonb,                       -- full NEW row for I/U; NULL for D
  changed_at  timestamptz NOT NULL DEFAULT now(),
  shipped     boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_replication_log_unshipped
  ON public.replication_log (seq) WHERE shipped = false;

-- Capture function: records the change, unless we're currently applying a
-- replicated change (then it's a no-op so nothing echoes back to the peer).
CREATE OR REPLACE FUNCTION public.replication_capture()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_setting('app.replicating', true) = 'on' THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.replication_log (table_name, op, row_id, row_data)
    VALUES (TG_TABLE_NAME, 'D', OLD.id, NULL);
    RETURN OLD;
  ELSE
    INSERT INTO public.replication_log (table_name, op, row_id, row_data)
    VALUES (TG_TABLE_NAME, left(TG_OP, 1), NEW.id, to_jsonb(NEW));
    RETURN NEW;
  END IF;
END;
$$;

-- Make the existing updated_at trigger replication-aware: during replication we
-- keep the source row's updated_at instead of overwriting it with now().
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_setting('app.replicating', true) = 'on' THEN
    RETURN NEW;
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Make the resume-owner check replication-aware (already validated at source).
CREATE OR REPLACE FUNCTION public.check_job_application_resume_owner()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_setting('app.replicating', true) = 'on' THEN
    RETURN NEW;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM resumes r
    WHERE r.id = NEW.resume_id AND r.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Resume must belong to the applicant';
  END IF;
  RETURN NEW;
END;
$$;

-- Attach the capture trigger to every base table except the log itself.
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name <> 'replication_log'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS tr_%s_replication ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER tr_%s_replication
         AFTER INSERT OR UPDATE OR DELETE ON public.%I
         FOR EACH ROW EXECUTE PROCEDURE public.replication_capture()',
      t, t
    );
  END LOOP;
END;
$$;
