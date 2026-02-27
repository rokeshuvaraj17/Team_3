-- Store HTML content for resumes generated in-app (for "use primary resume" reference).
ALTER TABLE public.resumes
  ADD COLUMN IF NOT EXISTS html_content text;
