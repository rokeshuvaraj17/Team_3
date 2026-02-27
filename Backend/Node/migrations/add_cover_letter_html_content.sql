-- Add html_content to cover_letters for editable content (like resumes).
ALTER TABLE public.cover_letters
  ADD COLUMN IF NOT EXISTS html_content text;

COMMENT ON COLUMN public.cover_letters.html_content IS 'Optional HTML body for in-app editing; when set, used for view/edit and export.';
