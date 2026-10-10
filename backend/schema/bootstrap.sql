-- Minimal app tables for a fresh hosted Postgres. Safe to re-run.
CREATE TABLE IF NOT EXISTS public.users (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  email           text NOT NULL,
  password_hash   text NOT NULL,
  email_verified  boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_users_email UNIQUE (email)
);

CREATE TABLE IF NOT EXISTS public.user_profiles (
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
  CONSTRAINT fk_user_profiles_user
    FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.companies (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL,
  slug             text NOT NULL UNIQUE,
  description      text,
  logo_url         text,
  website_url      text,
  industry         text,
  size_range       text,
  location         text,
  location_country text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.resumes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL,
  name         text NOT NULL,
  file_url     text NOT NULL,
  is_primary   boolean NOT NULL DEFAULT false,
  html_content text,
  uploaded_at  timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_resumes_user
    FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.jobs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       uuid NOT NULL,
  title            text NOT NULL,
  description      text NOT NULL,
  job_type         text NOT NULL,
  employment_type  text NOT NULL,
  location         text,
  location_country text,
  is_remote        boolean NOT NULL DEFAULT false,
  salary_min       numeric(14, 2),
  salary_max       numeric(14, 2),
  salary_currency  text DEFAULT 'USD',
  salary_visible   boolean NOT NULL DEFAULT false,
  metadata         jsonb,
  status           text NOT NULL DEFAULT 'ACTIVE',
  posted_at        timestamptz NOT NULL DEFAULT now(),
  expires_at       timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_jobs_company
    FOREIGN KEY (company_id) REFERENCES public.companies (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.job_applications (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL,
  job_id             uuid NOT NULL,
  resume_id          uuid NOT NULL,
  cover_letter_text  text,
  application_status text NOT NULL DEFAULT 'DRAFT',
  ai_match_score     numeric(5, 4),
  applied_at         timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_job_applications_user_job UNIQUE (user_id, job_id),
  CONSTRAINT fk_job_applications_user
    FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE CASCADE,
  CONSTRAINT fk_job_applications_job
    FOREIGN KEY (job_id) REFERENCES public.jobs (id) ON DELETE CASCADE,
  CONSTRAINT fk_job_applications_resume
    FOREIGN KEY (resume_id) REFERENCES public.resumes (id) ON DELETE RESTRICT
);
