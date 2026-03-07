-- Clerk + Supabase Native Integration Schema
-- This schema uses Clerk user IDs (TEXT) instead of internal UUID users table

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get the current Clerk user ID from JWT
CREATE OR REPLACE FUNCTION requesting_user_id()
RETURNS TEXT AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '')::text;
$$ LANGUAGE SQL STABLE;

-- ============================================
-- TABLES
-- ============================================

-- Projects table with Clerk user ID reference
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL DEFAULT requesting_user_id(), -- Clerk user ID
    name TEXT NOT NULL,
    framework TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('processing', 'ready', 'failed')),
    source_type TEXT,
    metadata JSONB DEFAULT '{}',
    github_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Jobs table
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    progress INTEGER DEFAULT 0,
    result JSONB,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Deltas table
CREATE TABLE IF NOT EXISTS deltas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    changes JSONB NOT NULL,
    applied BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Exports table
CREATE TABLE IF NOT EXISTS exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('zip', 'github')),
    url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_jobs_project_id ON jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_deltas_project_id ON deltas(project_id);
CREATE INDEX IF NOT EXISTS idx_exports_project_id ON exports(project_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE deltas ENABLE ROW LEVEL SECURITY;
ALTER TABLE exports ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES - PROJECTS
-- ============================================

-- Users can view their own projects
CREATE POLICY "Users can view own projects" 
ON projects 
FOR SELECT 
USING (user_id = requesting_user_id());

-- Users can insert projects (user_id auto-set by DEFAULT)
CREATE POLICY "Users can create projects" 
ON projects 
FOR INSERT 
WITH CHECK (user_id = requesting_user_id());

-- Users can update their own projects
CREATE POLICY "Users can update own projects" 
ON projects 
FOR UPDATE 
USING (user_id = requesting_user_id());

-- Users can delete their own projects
CREATE POLICY "Users can delete own projects" 
ON projects 
FOR DELETE 
USING (user_id = requesting_user_id());

-- ============================================
-- RLS POLICIES - JOBS
-- ============================================

-- Users can view jobs for their projects
CREATE POLICY "Users can view jobs for own projects" 
ON jobs 
FOR SELECT 
USING (
    project_id IN (
        SELECT id FROM projects WHERE user_id = requesting_user_id()
    )
);

-- Users can insert jobs for their projects
CREATE POLICY "Users can create jobs for own projects" 
ON jobs 
FOR INSERT 
WITH CHECK (
    project_id IN (
        SELECT id FROM projects WHERE user_id = requesting_user_id()
    )
);

-- Users can update jobs for their projects
CREATE POLICY "Users can update jobs for own projects" 
ON jobs 
FOR UPDATE 
USING (
    project_id IN (
        SELECT id FROM projects WHERE user_id = requesting_user_id()
    )
);

-- Users can delete jobs for their projects
CREATE POLICY "Users can delete jobs for own projects" 
ON jobs 
FOR DELETE 
USING (
    project_id IN (
        SELECT id FROM projects WHERE user_id = requesting_user_id()
    )
);

-- ============================================
-- RLS POLICIES - DELTAS
-- ============================================

CREATE POLICY "Users can view deltas for own projects" 
ON deltas 
FOR SELECT 
USING (
    project_id IN (
        SELECT id FROM projects WHERE user_id = requesting_user_id()
    )
);

CREATE POLICY "Users can create deltas for own projects" 
ON deltas 
FOR INSERT 
WITH CHECK (
    project_id IN (
        SELECT id FROM projects WHERE user_id = requesting_user_id()
    )
);

CREATE POLICY "Users can update deltas for own projects" 
ON deltas 
FOR UPDATE 
USING (
    project_id IN (
        SELECT id FROM projects WHERE user_id = requesting_user_id()
    )
);

CREATE POLICY "Users can delete deltas for own projects" 
ON deltas 
FOR DELETE 
USING (
    project_id IN (
        SELECT id FROM projects WHERE user_id = requesting_user_id()
    )
);

-- ============================================
-- RLS POLICIES - EXPORTS
-- ============================================

CREATE POLICY "Users can view exports for own projects" 
ON exports 
FOR SELECT 
USING (
    project_id IN (
        SELECT id FROM projects WHERE user_id = requesting_user_id()
    )
);

CREATE POLICY "Users can create exports for own projects" 
ON exports 
FOR INSERT 
WITH CHECK (
    project_id IN (
        SELECT id FROM projects WHERE user_id = requesting_user_id()
    )
);

CREATE POLICY "Users can delete exports for own projects" 
ON exports 
FOR DELETE 
USING (
    project_id IN (
        SELECT id FROM projects WHERE user_id = requesting_user_id()
    )
);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_projects_updated_at 
BEFORE UPDATE ON projects
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at 
BEFORE UPDATE ON jobs
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- OPTIONAL: User Profiles Cache (for webhooks)
-- If you want to cache Clerk user data in Supabase
-- ============================================

/*
CREATE TABLE IF NOT EXISTS user_profiles (
    clerk_user_id TEXT PRIMARY KEY,
    email TEXT,
    name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key to projects (optional, for referential integrity)
ALTER TABLE projects
ADD CONSTRAINT fk_user_profile
FOREIGN KEY (user_id) 
REFERENCES user_profiles(clerk_user_id)
ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can only view their own profile
CREATE POLICY "Users can view own profile" 
ON user_profiles 
FOR SELECT 
USING (clerk_user_id = requesting_user_id());
*/
