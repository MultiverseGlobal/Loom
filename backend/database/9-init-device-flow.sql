-- ============================================
-- Device Flow & Extensions
-- ============================================

-- 1. Pairing Sessions (Short-lived)
CREATE TABLE IF NOT EXISTS public.pairing_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- The "pairing code" in the URL
    device_id TEXT, -- Persistent ID from the extension if available
    machine_info JSONB, -- OS, Hostname, etc.
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'authorized', 'rejected', 'expired')),
    user_id TEXT, -- Populated upon authorization. TEXT to support Clerk IDs if needed
    extension_token TEXT, -- Generated upon authorization
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Extensions (Long-lived connections)
CREATE TABLE IF NOT EXISTS public.extensions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL, -- Owner. TEXT to support Clerk IDs.
    token TEXT NOT NULL UNIQUE, -- The API Key used by the extension
    machine_info JSONB,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pairing_sessions_status ON public.pairing_sessions(status);
CREATE INDEX IF NOT EXISTS idx_extensions_user_id ON public.extensions(user_id);
CREATE INDEX IF NOT EXISTS idx_extensions_token ON public.extensions(token);

-- RLS
ALTER TABLE public.pairing_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extensions ENABLE ROW LEVEL SECURITY;

-- Policies

-- Pairing Sessions are primarily managed by the Service Role (Admin Client)
-- But if we want logged-in users to potentially "view" the session they are authorizing:
CREATE POLICY "Users can view pairing sessions" 
ON public.pairing_sessions FOR SELECT 
USING (true); 
-- logic: User visits /connect?token=XYZ. They need to fetch the session to see "Hostname: MyLaptop".
-- Security: UUID is the secret. If you know the UUID, you can view the metadata. 
-- The sensitive part is authorizing it, which requires being logged in.

-- Extensions: Users can view their own extensions
CREATE POLICY "Users can view own extensions" 
ON public.extensions FOR SELECT 
USING (user_id = requesting_user_id());

-- Service Role has full access (Admin Client uses service role key)
-- (Implicit in Supabase if using service_role key, but explicit policies don't hurt if we need granular control later)

-- Triggers for updated_at
CREATE TRIGGER set_updated_at_pairing_sessions
BEFORE UPDATE ON public.pairing_sessions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_extensions
BEFORE UPDATE ON public.extensions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();
