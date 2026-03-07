-- Switch from Stripe to Polar.sh
-- Run this in Supabase SQL Editor

-- 1. Add Polar fields
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS polar_customer_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS polar_subscription_id TEXT;

-- 2. Drop Stripe fields (if they exist)
ALTER TABLE public.users 
DROP COLUMN IF EXISTS stripe_customer_id,
DROP COLUMN IF EXISTS stripe_subscription_id;

-- 3. Create index for Polar lookups
CREATE INDEX IF NOT EXISTS idx_users_polar_customer_id ON public.users(polar_customer_id);

-- Verification
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name LIKE 'polar_%';
