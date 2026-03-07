-- Migration: Switch from Polar.sh to Lemon Squeezy

-- 1. Remove Polar columns
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'polar_customer_id') THEN
        ALTER TABLE public.users DROP COLUMN polar_customer_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'polar_subscription_id') THEN
        ALTER TABLE public.users DROP COLUMN polar_subscription_id;
    END IF;
END $$;

-- 2. Add Lemon Squeezy columns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'lemonsqueezy_customer_id') THEN
        ALTER TABLE public.users ADD COLUMN lemonsqueezy_customer_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'lemonsqueezy_subscription_id') THEN
        ALTER TABLE public.users ADD COLUMN lemonsqueezy_subscription_id TEXT;
    END IF;
END $$;

-- 3. Reset subscription status for safety (optional, but good practice when switching providers)
UPDATE public.users 
SET subscription_status = 'inactive', tier = 'free' 
WHERE subscription_status IS NOT NULL;
