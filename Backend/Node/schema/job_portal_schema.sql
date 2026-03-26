-- =============================================================================
-- Production Job Application Portal Schema (PostgreSQL)
-- Similar to LinkedIn/Naukri. Optimized for scale and query performance.
-- Data types aligned with PostgreSQL best practices (pg-aiguide / design-postgres-tables).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Extensions (run as superuser or with extension privileges)
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "citext";   -- Case-insensitive email (UNIQUE/lookups)
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- gen_random_uuid() if PG < 13
-- Optional for fuzzy/LIKE search at scale: CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- -----------------------------------------------------------------------------
-- ENUM types (domain constraints, index-friendly, clear semantics)
-- -----------------------------------------------------------------------------

CREATE TYPE employment_type AS ENUM (
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'INTERNSHIP',
  'FREELANCE',
  'VOLUNTEER'
);

COMMENT ON TYPE employment_type IS 'Used for job listings and work experience.';

CREATE TYPE application_status AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'SHORTLISTED',
  'INTERVIEWING',
  'OFFER_EXTENDED',
  'OFFER_ACCEPTED',
  'REJECTED',
  'WITHDRAWN'
);

CREATE TYPE job_type AS ENUM (
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'INTERNSHIP',
  'FREELANCE',
  'VOLUNTEER'
);

CREATE TYPE proficiency_level AS ENUM (
  'BEGINNER',
  'INTERMEDIATE',
  'ADVANCED',
  'EXPERT',
  'NATIVE'
);

COMMENT ON TYPE proficiency_level IS 'Used for skills and languages.';

-- -----------------------------------------------------------------------------
-- 1. Users (authentication only; extended data in user_profiles)
-- -----------------------------------------------------------------------------

CREATE TABLE users (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  email           citext NOT NULL,
  password_hash   text NOT NULL,
  email_verified  boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_users_email UNIQUE (email)
);

CREATE INDEX idx_users_email ON users (email);

COMMENT ON TABLE users IS 'Account authentication. One row per account.';

-- -----------------------------------------------------------------------------
-- 2. User profiles (1:1 with users; extended profile data)
-- -----------------------------------------------------------------------------

CREATE TABLE user_profiles (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL,
  display_name       text NOT NULL,
  headline           text,
  summary            text,
  location           text,
  location_country   text,             -- ISO 3166-1 alpha-2; text + CHECK avoids char(n) padding
  state             text,              -- State / province / region
  profile_image_url  text,
  phone             text,
  website_url       text,
  linkedin_url      text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_profiles_user_id UNIQUE (user_id),
  CONSTRAINT fk_user_profiles_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT chk_user_profiles_country
    CHECK (location_country IS NULL OR char_length(location_country) = 2)
);

CREATE INDEX idx_user_profiles_user_id ON user_profiles (user_id);
CREATE INDEX idx_user_profiles_location_country ON user_profiles (location_country)
  WHERE location_country IS NOT NULL;
CREATE INDEX idx_user_profiles_display_name_trgm ON user_profiles (display_name text_pattern_ops);

COMMENT ON TABLE user_profiles IS 'Extended profile; one per user. Search/filter by location and name.';

-- -----------------------------------------------------------------------------
-- 3. Companies (employers posting jobs)
-- -----------------------------------------------------------------------------

CREATE TABLE companies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  slug            text NOT NULL,
  description     text,
  logo_url        text,
  website_url     text,
  industry        text,
  size_range      text,               -- e.g. '1-10', '11-50', '51-200'
  location        text,
  location_country text,              -- ISO 3166-1 alpha-2
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_companies_slug UNIQUE (slug),
  CONSTRAINT chk_companies_country
    CHECK (location_country IS NULL OR char_length(location_country) = 2)
);

CREATE UNIQUE INDEX idx_companies_slug ON companies (slug);
CREATE INDEX idx_companies_name ON companies (name text_pattern_ops);
CREATE INDEX idx_companies_location_country ON companies (location_country)
  WHERE location_country IS NOT NULL;
CREATE INDEX idx_companies_industry ON companies (industry)
  WHERE industry IS NOT NULL;

COMMENT ON TABLE companies IS 'Employers; slug used in URLs.';

-- -----------------------------------------------------------------------------
-- 4. Work experiences (multiple per user; optional link to company)
-- -----------------------------------------------------------------------------

CREATE TABLE work_experiences (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL,
  company_id        uuid,
  company_name      text,              -- Denormalized when company_id NULL (e.g. startup)
  job_title         text NOT NULL,
  employment_type   employment_type NOT NULL,
  location          text,
  is_current        boolean NOT NULL DEFAULT false,
  start_date        date NOT NULL,
  end_date         date,
  description       text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_work_experiences_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_work_experiences_company
    FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE SET NULL,
  CONSTRAINT chk_work_experiences_dates
    CHECK (end_date IS NULL OR end_date >= start_date),
  CONSTRAINT chk_work_experiences_company
    CHECK (company_id IS NOT NULL OR company_name IS NOT NULL)
);

CREATE INDEX idx_work_experiences_user_id ON work_experiences (user_id);
CREATE INDEX idx_work_experiences_company_id ON work_experiences (company_id)
  WHERE company_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 5. Education (multiple per user)
-- -----------------------------------------------------------------------------

CREATE TABLE education (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL,
  institution     text NOT NULL,
  degree          text,
  field_of_study  text,
  start_date      date NOT NULL,
  end_date        date,
  grade           text,
  description     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_education_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT chk_education_dates
    CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX idx_education_user_id ON education (user_id);

-- -----------------------------------------------------------------------------
-- 6. Skills (master list) + user_skills (many-to-many with proficiency)
-- -----------------------------------------------------------------------------

CREATE TABLE skills (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_skills_name UNIQUE (name)
);

CREATE INDEX idx_skills_name ON skills (name text_pattern_ops);

CREATE TABLE user_skills (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL,
  skill_id          uuid NOT NULL,
  proficiency_level proficiency_level NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_skills_user_skill UNIQUE (user_id, skill_id),
  CONSTRAINT fk_user_skills_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_user_skills_skill
    FOREIGN KEY (skill_id) REFERENCES skills (id) ON DELETE CASCADE
);

CREATE INDEX idx_user_skills_user_id ON user_skills (user_id);
CREATE INDEX idx_user_skills_skill_id ON user_skills (skill_id);
-- Critical: find candidates by skill (partial for active proficiency if needed)
CREATE INDEX idx_user_skills_skill_proficiency ON user_skills (skill_id, proficiency_level);

COMMENT ON TABLE user_skills IS 'Many-to-many user–skill with proficiency. Index supports “find candidates by skill”.';

-- -----------------------------------------------------------------------------
-- 7. Certifications
-- -----------------------------------------------------------------------------

CREATE TABLE certifications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL,
  name         text NOT NULL,
  issuer       text,
  credential_url text,
  issued_date  date,
  expiry_date  date,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_certifications_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT chk_certifications_dates
    CHECK (expiry_date IS NULL OR issued_date IS NULL OR expiry_date >= issued_date)
);

CREATE INDEX idx_certifications_user_id ON certifications (user_id);

-- -----------------------------------------------------------------------------
-- 8. Projects (portfolio)
-- -----------------------------------------------------------------------------

CREATE TABLE projects (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL,
  title        text NOT NULL,
  description  text,
  url          text,
  start_date   date,
  end_date     date,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_projects_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT chk_projects_dates
    CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

CREATE INDEX idx_projects_user_id ON projects (user_id);

-- -----------------------------------------------------------------------------
-- 9. Languages (with proficiency)
-- -----------------------------------------------------------------------------

CREATE TABLE languages (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL,
  language_name     text NOT NULL,
  proficiency_level proficiency_level NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_languages_user_lang UNIQUE (user_id, language_name),
  CONSTRAINT fk_languages_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_languages_user_id ON languages (user_id);

-- -----------------------------------------------------------------------------
-- 10. Resumes (file URLs only; multiple per user)
-- -----------------------------------------------------------------------------

CREATE TABLE resumes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL,
  name         text NOT NULL,
  file_url     text NOT NULL,
  is_primary   boolean NOT NULL DEFAULT false,
  uploaded_at  timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_resumes_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_resumes_user_id ON resumes (user_id);
CREATE INDEX idx_resumes_user_primary ON resumes (user_id, is_primary)
  WHERE is_primary = true;

COMMENT ON TABLE resumes IS 'Only URLs; files stored in object storage.';

-- -----------------------------------------------------------------------------
-- 11. Jobs (posted by companies)
-- -----------------------------------------------------------------------------

CREATE TABLE jobs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       uuid NOT NULL,
  title            text NOT NULL,
  description      text NOT NULL,
  job_type         job_type NOT NULL,
  employment_type  employment_type NOT NULL,
  location         text,
  location_country text,               -- ISO 3166-1 alpha-2
  is_remote        boolean NOT NULL DEFAULT false,
  salary_min       numeric(14, 2),    -- Exact decimal for money; 14 digits supports very large amounts
  salary_max       numeric(14, 2),
  salary_currency  text DEFAULT 'USD' CHECK (char_length(salary_currency) = 3),
  salary_visible   boolean NOT NULL DEFAULT false,
  metadata         jsonb,            -- Flexible: benefits, requirements; GIN index below
  status           text NOT NULL DEFAULT 'ACTIVE',
  posted_at        timestamptz NOT NULL DEFAULT now(),
  expires_at       timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_jobs_company
    FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE,
  CONSTRAINT chk_jobs_country
    CHECK (location_country IS NULL OR char_length(location_country) = 2),
  CONSTRAINT chk_jobs_salary
    CHECK (salary_min IS NULL OR salary_max IS NULL OR salary_min <= salary_max),
  CONSTRAINT chk_jobs_salary_positive
    CHECK (salary_min IS NULL OR salary_min >= 0),
  CONSTRAINT chk_jobs_salary_max_positive
    CHECK (salary_max IS NULL OR salary_max >= 0)
);

CREATE INDEX idx_jobs_company_id ON jobs (company_id);
CREATE INDEX idx_jobs_posted_at ON jobs (posted_at DESC);
CREATE INDEX idx_jobs_location_country ON jobs (location_country)
  WHERE location_country IS NOT NULL;
CREATE INDEX idx_jobs_job_type ON jobs (job_type);
CREATE INDEX idx_jobs_employment_type ON jobs (employment_type);
CREATE INDEX idx_jobs_is_remote ON jobs (is_remote)
  WHERE is_remote = true;
CREATE INDEX idx_jobs_status ON jobs (status)
  WHERE status = 'ACTIVE';
CREATE INDEX idx_jobs_title_trgm ON jobs (title text_pattern_ops);
-- GIN for containment (@>) and key existence (?). Use jsonb_path_ops for containment-only (smaller index).
CREATE INDEX idx_jobs_metadata_gin ON jobs USING gin (metadata)
  WHERE metadata IS NOT NULL;

COMMENT ON TABLE jobs IS 'Listings by company. Indexes support filter by location, type, remote.';

-- Optional at very large scale: BRIN on time-ordered columns (minimal storage, good for range scans).
-- CREATE INDEX idx_jobs_posted_at_brin ON jobs USING brin (posted_at);

-- -----------------------------------------------------------------------------
-- 12. Job applications (with resume selection and cover letter)
-- -----------------------------------------------------------------------------

CREATE TABLE job_applications (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL,
  job_id            uuid NOT NULL,
  resume_id         uuid NOT NULL,
  cover_letter_text text,
  application_status application_status NOT NULL DEFAULT 'DRAFT',
  ai_match_score    numeric(5, 4),     -- 0.0000–1.0000 for future AI matching
  applied_at        timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_job_applications_user_job UNIQUE (user_id, job_id),
  CONSTRAINT fk_job_applications_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_job_applications_job
    FOREIGN KEY (job_id) REFERENCES jobs (id) ON DELETE CASCADE,
  CONSTRAINT fk_job_applications_resume
    FOREIGN KEY (resume_id) REFERENCES resumes (id) ON DELETE RESTRICT,
  CONSTRAINT chk_job_applications_resume_owner
    CHECK (true),  -- Enforce in app: resume must belong to user_id
  CONSTRAINT chk_job_applications_ai_score
    CHECK (ai_match_score IS NULL OR (ai_match_score >= 0 AND ai_match_score <= 1))
);

CREATE INDEX idx_job_applications_user_id ON job_applications (user_id);
CREATE INDEX idx_job_applications_job_id ON job_applications (job_id);
CREATE INDEX idx_job_applications_status ON job_applications (application_status);
CREATE INDEX idx_job_applications_applied_at ON job_applications (applied_at DESC)
  WHERE applied_at IS NOT NULL;
CREATE INDEX idx_job_applications_ai_score ON job_applications (job_id, ai_match_score DESC NULLS LAST)
  WHERE ai_match_score IS NOT NULL;

COMMENT ON TABLE job_applications IS 'One application per user per job; resume and optional cover letter. ai_match_score for future ranking.';

-- Optional at scale: BRIN on applied_at; fillfactor for status-update-heavy workload.
-- CREATE INDEX idx_job_applications_applied_at_brin ON job_applications USING brin (applied_at) WHERE applied_at IS NOT NULL;
-- ALTER TABLE job_applications SET (fillfactor = 90);

-- -----------------------------------------------------------------------------
-- 13. Saved jobs (user bookmarks)
-- -----------------------------------------------------------------------------

CREATE TABLE saved_jobs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL,
  job_id     uuid NOT NULL,
  saved_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_saved_jobs_user_job UNIQUE (user_id, job_id),
  CONSTRAINT fk_saved_jobs_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_saved_jobs_job
    FOREIGN KEY (job_id) REFERENCES jobs (id) ON DELETE CASCADE
);

CREATE INDEX idx_saved_jobs_user_id ON saved_jobs (user_id);
CREATE INDEX idx_saved_jobs_job_id ON saved_jobs (job_id);

-- -----------------------------------------------------------------------------
-- updated_at triggers (reusable)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply to all tables that have updated_at
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'users', 'user_profiles', 'companies', 'work_experiences', 'education',
      'certifications', 'projects', 'jobs', 'job_applications'
    ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER tr_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE PROCEDURE set_updated_at()',
      t, t
    );
  END LOOP;
END;
$$;

-- -----------------------------------------------------------------------------
-- Optional: enforce resume belongs to applicant (trigger)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION check_job_application_resume_owner()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM resumes r
    WHERE r.id = NEW.resume_id AND r.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Resume must belong to the applicant';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_job_applications_resume_owner
  BEFORE INSERT OR UPDATE OF resume_id, user_id ON job_applications
  FOR EACH ROW EXECUTE PROCEDURE check_job_application_resume_owner();

-- -----------------------------------------------------------------------------
-- Design notes (aligned with pg-aiguide / design-postgres-tables for scale)
-- -----------------------------------------------------------------------------
-- • Primary keys: UUID (gen_random_uuid()) for global uniqueness; fine for large, distributed user bases.
-- • Strings: TEXT everywhere; no varchar(n)/char(n). Length limits enforced via CHECK (char_length(col) = n).
-- • Fixed-length codes: location_country (2), salary_currency (3) are text + CHECK to avoid char(n) padding and storage cost.
-- • Money: numeric(14,2) for salary (exact decimal; 14 digits supports very large amounts at scale).
-- • Emails: citext for case-insensitive UNIQUE and lookups; alternative is text + UNIQUE(LOWER(email)) + expression index.
-- • ENUMs: application_status, employment_type, job_type, proficiency_level for domain constraints and index-friendly comparisons.
-- • JSONB: only jobs.metadata; use GIN (default or jsonb_path_ops for containment-only). Keep relations in tables.
-- • No file storage: only URLs (resumes.file_url, profile_image_url, logo_url). Large text uses TOAST automatically.
-- • Resume ownership: trigger ensures job_applications.resume_id belongs to applicant.
-- • Indexes: B-tree on all FK columns (PostgreSQL does not auto-index FKs). Partial indexes for hot subsets (status, is_remote).
-- • At very large scale (100M+ rows): consider BRIN on posted_at / applied_at for append-mostly, time-ordered tables.
-- • Update-heavy tables (e.g. job_applications status): consider fillfactor < 100 to reduce HOT update bloat.
-- • Full-text / fuzzy search: add pg_trgm and GIN(col gin_trgm_ops) for LIKE/similarity; or tsvector + to_tsvector for FTS.
-- • RLS: enable on users, job_applications, saved_jobs and define policies for multi-tenant or row-level security.

-- =============================================================================
-- End of schema
-- =============================================================================
