-- STEP 2: Create Fresh Schema
-- Run this AFTER running 1-cleanup.sql

-- ============================================
-- Helper Function
-- ============================================

CREATE FUNCTION requesting_user_id()
RETURNS TEXT AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '')::text;
$$ LANGUAGE SQL STABLE;

-- ============================================
-- Tables (user_id is TEXT for Clerk IDs)
-- ============================================

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL DEFAULT requesting_user_id(),
    name TEXT NOT NULL,
    framework TEXT NOT NULL DEFAULT 'nextjs',
    status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('processing', 'ready', 'failed')),
    source_type TEXT,
    metadata JSONB DEFAULT '{}',
    github_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    result JSONB,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE deltas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    changes JSONB NOT NULL,
    applied BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('zip', 'github')),
    url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Indexes
-- ============================================

CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_jobs_project_id ON jobs(project_id);
CREATE INDEX idx_deltas_project_id ON deltas(project_id);
CREATE INDEX idx_exports_project_id ON exports(project_id);

-- ============================================
-- Enable RLS
-- ============================================

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE deltas ENABLE ROW LEVEL SECURITY;
ALTER TABLE exports ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies - Projects
-- ============================================

CREATE POLICY "Users can view own projects" 
ON projects FOR SELECT 
USING (user_id = requesting_user_id());

CREATE POLICY "Users can create projects" 
ON projects FOR INSERT 
WITH CHECK (user_id = requesting_user_id());

CREATE POLICY "Users can update own projects" 
ON projects FOR UPDATE 
USING (user_id = requesting_user_id());

CREATE POLICY "Users can delete own projects" 
ON projects FOR DELETE 
USING (user_id = requesting_user_id());

-- ============================================
-- RLS Policies - Jobs
-- ============================================

CREATE POLICY "Users can view jobs for own projects" 
ON jobs FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = jobs.project_id 
        AND projects.user_id = requesting_user_id()
    )
);

CREATE POLICY "Users can create jobs for own projects" 
ON jobs FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = jobs.project_id 
        AND projects.user_id = requesting_user_id()
    )
);

CREATE POLICY "Users can update jobs for own projects" 
ON jobs FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = jobs.project_id 
        AND projects.user_id = requesting_user_id()
    )
);

CREATE POLICY "Users can delete jobs for own projects" 
ON jobs FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = jobs.project_id 
        AND projects.user_id = requesting_user_id()
    )
);

-- ============================================
-- RLS Policies - Deltas
-- ============================================

CREATE POLICY "Users can view deltas for own projects" 
ON deltas FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = deltas.project_id 
        AND projects.user_id = requesting_user_id()
    )
);

CREATE POLICY "Users can create deltas for own projects" 
ON deltas FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = deltas.project_id 
        AND projects.user_id = requesting_user_id()
    )
);

CREATE POLICY "Users can update deltas for own projects" 
ON deltas FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = deltas.project_id 
        AND projects.user_id = requesting_user_id()
    )
);

CREATE POLICY "Users can delete deltas for own projects" 
ON deltas FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = deltas.project_id 
        AND projects.user_id = requesting_user_id()
    )
);

-- ============================================
-- RLS Policies - Exports
-- ============================================

CREATE POLICY "Users can view exports for own projects" 
ON exports FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = exports.project_id 
        AND projects.user_id = requesting_user_id()
    )
);

CREATE POLICY "Users can create exports for own projects" 
ON exports FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = exports.project_id 
        AND projects.user_id = requesting_user_id()
    )
);

CREATE POLICY "Users can delete exports for own projects" 
ON exports FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = exports.project_id 
        AND projects.user_id = requesting_user_id()
    )
);

-- ============================================
-- Update Triggers
-- ============================================

CREATE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON jobs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Verification
-- ============================================

SELECT 
    '✅ SUCCESS! Schema created with Clerk user IDs (TEXT)' as status,
    COUNT(*) as tables_created
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('projects', 'jobs', 'deltas', 'exports');

-- Verify user_id column type
SELECT 
    table_name,
    column_name,
    data_type,
    '✅ Correct (should be TEXT)' as verification
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'projects'
AND column_name = 'user_id';
