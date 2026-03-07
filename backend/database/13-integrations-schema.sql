-- ============================================
-- INTEGRATIONS SYSTEM SCHEMA
-- ============================================
-- This migration creates a generic integrations system
-- to support GitHub, Figma, Linear, Notion, and other OAuth integrations

-- ============================================
-- Generic Integrations Table
-- ============================================
-- Stores all external integration connections (replaces/extends github_accounts)

CREATE TABLE IF NOT EXISTS integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('github', 'figma', 'linear', 'notion', 'slack')),
    provider_account_id TEXT NOT NULL, -- GitHub user ID, Figma user ID, etc.
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    scope TEXT,
    metadata JSONB DEFAULT '{}',
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    last_synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, provider, provider_account_id)
);

-- ============================================
-- Project-Integration Links Table
-- ============================================
-- Links projects to specific integration resources (repos, workspaces, etc.)

CREATE TABLE IF NOT EXISTS project_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    resource_type TEXT NOT NULL, -- 'repository', 'workspace', 'board', etc.
    resource_id TEXT NOT NULL, -- repo full_name, workspace_id, etc.
    resource_name TEXT NOT NULL, -- Display name
    sync_enabled BOOLEAN DEFAULT true,
    sync_config JSONB DEFAULT '{}', -- Provider-specific config (branch, filters, etc.)
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(project_id, integration_id, resource_id)
);

-- ============================================
-- Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_integrations_user_id ON integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_integrations_provider ON integrations(provider);
CREATE INDEX IF NOT EXISTS idx_project_integrations_project_id ON project_integrations(project_id);
CREATE INDEX IF NOT EXISTS idx_project_integrations_integration_id ON project_integrations(integration_id);

-- ============================================
-- Enable RLS
-- ============================================

ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_integrations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies - Integrations
-- ============================================

CREATE POLICY "Users can view own integrations" 
ON integrations FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can create own integrations" 
ON integrations FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own integrations" 
ON integrations FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own integrations" 
ON integrations FOR DELETE 
USING (user_id = auth.uid());

-- ============================================
-- RLS Policies - Project Integrations
-- ============================================

CREATE POLICY "Users can view project integrations for own projects" 
ON project_integrations FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = project_integrations.project_id 
        AND projects.user_id::text = auth.uid()::text
    )
);

CREATE POLICY "Users can create project integrations for own projects" 
ON project_integrations FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = project_integrations.project_id 
        AND projects.user_id::text = auth.uid()::text
    )
);

CREATE POLICY "Users can update project integrations for own projects" 
ON project_integrations FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = project_integrations.project_id 
        AND projects.user_id::text = auth.uid()::text
    )
);

CREATE POLICY "Users can delete project integrations for own projects" 
ON project_integrations FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = project_integrations.project_id 
        AND projects.user_id::text = auth.uid()::text
    )
);

-- ============================================
-- Update Triggers
-- ============================================

CREATE TRIGGER set_updated_at_integrations
BEFORE UPDATE ON integrations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_project_integrations
BEFORE UPDATE ON project_integrations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Migrate Existing GitHub Data (if tables exist)
-- ============================================
-- Migrate github_accounts to integrations table (only if table exists)

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'github_accounts') THEN
        INSERT INTO integrations (user_id, provider, provider_account_id, access_token, scope, connected_at, metadata)
        SELECT 
            user_id,
            'github' as provider,
            github_user_id as provider_account_id,
            access_token,
            scope,
            created_at as connected_at,
            jsonb_build_object('installation_id', installation_id) as metadata
        FROM github_accounts
        ON CONFLICT (user_id, provider, provider_account_id) DO NOTHING;
        
        RAISE NOTICE 'Migrated data from github_accounts table';
    ELSE
        RAISE NOTICE 'github_accounts table does not exist, skipping migration';
    END IF;
END $$;

-- Migrate project_github_links to project_integrations (only if table exists)

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_github_links') THEN
        INSERT INTO project_integrations (
            project_id, 
            integration_id, 
            resource_type, 
            resource_id, 
            resource_name,
            sync_config,
            created_at
        )
        SELECT 
            pgl.project_id,
            i.id as integration_id,
            'repository' as resource_type,
            pgl.repo_owner || '/' || pgl.repo_name as resource_id,
            pgl.repo_name as resource_name,
            jsonb_build_object(
                'branch', pgl.default_branch,
                'sync_mode', pgl.sync_mode
            ) as sync_config,
            pgl.created_at
        FROM project_github_links pgl
        JOIN projects p ON p.id = pgl.project_id
        JOIN integrations i ON i.user_id = p.user_id AND i.provider = 'github'
        ON CONFLICT (project_id, integration_id, resource_id) DO NOTHING;
        
        RAISE NOTICE 'Migrated data from project_github_links table';
    ELSE
        RAISE NOTICE 'project_github_links table does not exist, skipping migration';
    END IF;
END $$;

-- ============================================
-- Verification
-- ============================================

SELECT 
    '✅ Integrations schema created successfully' as status,
    (SELECT COUNT(*) FROM integrations) as total_integrations,
    (SELECT COUNT(*) FROM project_integrations) as total_project_links;
