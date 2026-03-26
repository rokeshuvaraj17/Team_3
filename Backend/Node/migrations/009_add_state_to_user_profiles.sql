-- Add state column to user_profiles (run if table already exists without this column)
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS state text;
