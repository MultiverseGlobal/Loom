-- ============================================
-- API Keys Table
-- For Stripe-style API key authentication
-- ============================================

CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL, -- SHA-256 hash of the full key
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON public.api_keys(key_hash);

-- RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own keys" 
ON public.api_keys FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can create own keys" 
ON public.api_keys FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own keys" 
ON public.api_keys FOR DELETE 
USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER set_updated_at_api_keys
BEFORE UPDATE ON public.api_keys
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();
