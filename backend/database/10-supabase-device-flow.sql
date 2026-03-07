-- ============================================
-- Loom Extension Device Flow Tables
-- Compatible with Supabase Auth (UUID user_ids)
-- ============================================

-- Helper function to get current user ID from JWT
CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim.sub', true), ''),
    (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid;
$$ LANGUAGE SQL STABLE;

-- ============================================
-- 1. Pairing Sessions Table
-- Short-lived sessions for device flow pairing
-- ============================================

CREATE TABLE IF NOT EXISTS public.pairing_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT NOT NULL,
    machine_info JSONB,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'authorized', 'rejected', 'expired')),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    extension_token TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. Extensions Table
-- Long-lived extension connections
-- ============================================

CREATE TABLE IF NOT EXISTS public.extensions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    machine_info JSONB,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_pairing_sessions_status ON public.pairing_sessions(status);
CREATE INDEX IF NOT EXISTS idx_pairing_sessions_expires_at ON public.pairing_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_extensions_user_id ON public.extensions(user_id);
CREATE INDEX IF NOT EXISTS idx_extensions_token ON public.extensions(token);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

ALTER TABLE public.pairing_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extensions ENABLE ROW LEVEL SECURITY;

-- Pairing Sessions: Anyone can SELECT (needed to view session details on /connect page)
-- The UUID itself acts as the secret
DROP POLICY IF EXISTS "Anyone can view pairing sessions" ON public.pairing_sessions;
CREATE POLICY "Anyone can view pairing sessions" 
ON public.pairing_sessions FOR SELECT 
USING (true);

-- Extensions: Users can view their own extensions
DROP POLICY IF EXISTS "Users can view own extensions" ON public.extensions;
CREATE POLICY "Users can view own extensions" 
ON public.extensions FOR SELECT 
USING (user_id = auth.uid());

-- ============================================
-- Triggers for updated_at
-- ============================================

-- Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS set_updated_at_pairing_sessions ON public.pairing_sessions;
CREATE TRIGGER set_updated_at_pairing_sessions
BEFORE UPDATE ON public.pairing_sessions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_extensions ON public.extensions;
CREATE TRIGGER set_updated_at_extensions
BEFORE UPDATE ON public.extensions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Verification
-- ============================================

SELECT 
    '✅ Migration complete!' as status,
    COUNT(*) FILTER (WHERE table_name = 'pairing_sessions') as pairing_sessions_created,
    COUNT(*) FILTER (WHERE table_name = 'extensions') as extensions_created
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('pairing_sessions', 'extensions');
