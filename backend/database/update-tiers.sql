-- Update Users table to reflect new Paid Tiers
-- Run this in Supabase SQL Editor AFTER the previous add-credits.sql

-- 1. Remove default 'free' if set (we won't delete the column, just change default or values)
ALTER TABLE public.users 
ALTER COLUMN tier SET DEFAULT 'starter';

-- 2. Update any existing 'free' users to 'starter' (as a grace period or trial)
UPDATE public.users SET tier = 'starter' WHERE tier = 'free';

-- 3. Add a check constraint to ensure only valid tiers are used
-- Note: You might need to drop the constraint first if you need to update it later
ALTER TABLE public.users 
ADD CONSTRAINT users_tier_check 
CHECK (tier IN ('starter', 'pro', 'creator', 'team'));

-- 4. Add Subscription Status column (to track if they actually paid)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'incomplete';
-- Valid values: incomplete, active, past_due, canceled

-- Verification
SELECT * FROM public.users LIMIT 5;
