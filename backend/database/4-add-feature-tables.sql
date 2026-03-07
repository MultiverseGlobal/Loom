-- STEP 4: Add Feature Tables
-- Run this to add support for API Keys, Extensions, and Feature Requests

-- ============================================
-- API Keys
-- ============================================

CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL, -- Matches Clerk/Auth user ID type
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);

-- basic RLS for API keys
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own api keys" 
ON api_keys FOR SELECT 
USING (user_id = requesting_user_id());

CREATE POLICY "Users can create own api keys" 
ON api_keys FOR INSERT 
WITH CHECK (user_id = requesting_user_id());

CREATE POLICY "Users can delete own api keys" 
ON api_keys FOR DELETE 
USING (user_id = requesting_user_id());

-- ============================================
-- Extensions
-- ============================================

CREATE TABLE IF NOT EXISTS extensions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    version TEXT NOT NULL DEFAULT '1.0.0',
    author TEXT NOT NULL DEFAULT 'Loom AI',
    icon_url TEXT,
    is_official BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed some extensions
INSERT INTO extensions (name, description, author, icon_url, is_official) VALUES
('VS Code Sync', 'Official extension to sync changes directly to VS Code.', 'Loom AI', 'vscode', true),
('GitHub Integration', 'Automatically push code to GitHub repositories.', 'Loom AI', 'github', true),
('React Native Support', 'Add support for React Native project generation.', 'Community', 'react', false),
('Tailwind Optimizer', 'Automatically sorts and cleans Tailwind classes.', 'Community', 'wind', false);


CREATE TABLE IF NOT EXISTS user_extensions (
    user_id TEXT NOT NULL,
    extension_id UUID NOT NULL REFERENCES extensions(id) ON DELETE CASCADE,
    installed_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, extension_id)
);

ALTER TABLE user_extensions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view installed extensions" 
ON user_extensions FOR SELECT 
USING (user_id = requesting_user_id());

CREATE POLICY "Users can install extensions" 
ON user_extensions FOR INSERT 
WITH CHECK (user_id = requesting_user_id());

CREATE POLICY "Users can uninstall extensions" 
ON user_extensions FOR DELETE 
USING (user_id = requesting_user_id());

-- Allow everyone to view extensions list
ALTER TABLE extensions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view extensions" ON extensions FOR SELECT USING (true);

-- ============================================
-- Feature Requests / Feedback
-- ============================================

CREATE TABLE IF NOT EXISTS feature_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'planned', 'in_progress', 'completed')),
    votes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE feature_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view requests" 
ON feature_requests FOR SELECT USING (true);

CREATE POLICY "Users can create requests" 
ON feature_requests FOR INSERT 
WITH CHECK (user_id = requesting_user_id());

-- ============================================
-- Triggers
-- ============================================

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON api_keys
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();
