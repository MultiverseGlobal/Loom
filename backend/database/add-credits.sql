-- Add credits and tier columns to users table
-- Run this in Supabase SQL Editor

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'free';

-- Index for faster lookups if needed (though PK lookup is fast enough)
-- CREATE INDEX IF NOT EXISTS idx_users_tier ON public.users(tier);

-- Verification
SELECT * FROM public.users LIMIT 1;
