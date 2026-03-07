-- Clerk + Supabase Native Integration Schema
-- Simple version - just creates the tables and policies

-- ============================================
-- STEP 1: Create Helper Function
-- ============================================

CREATE OR REPLACE FUNCTION requesting_user_id()
RETURNS TEXT AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '')::text;
$$ LANGUAGE SQL STABLE;

-- ============================================
-- STEP 2: Create Tables
-- ============================================

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL DEFAULT requesting_user_id(),
    name TEXT NOT NULL,
    framework TEXT NOT NULL DEFAULT 'nextjs',
    status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('processing', 'ready', 'failed')),
    source_type TEXT,
    metadata JSONB DEFAULT '{}',
    github_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Jobs table
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    result JSONB,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Deltas table
CREATE TABLE IF NOT EXISTS deltas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    changes JSONB NOT NULL,
    applied BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Exports table
CREATE TABLE IF NOT EXISTS exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('zip', 'github')),
    url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STEP 3: Create Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_jobs_project_id ON jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_deltas_project_id ON deltas(project_id);
CREATE INDEX IF NOT EXISTS idx_exports_project_id ON exports(project_id);

-- ============================================
-- STEP 4: Enable RLS
-- ============================================

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE deltas ENABLE ROW LEVEL SECURITY;
ALTER TABLE exports ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 5: Create RLS Policies for Projects
-- ============================================

DO $$ 
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view own projects" ON projects;
    DROP POLICY IF EXISTS "Users can create projects" ON projects;
    DROP POLICY IF EXISTS "Users can update own projects" ON projects;
    DROP POLICY IF EXISTS "Users can delete own projects" ON projects;
END $$;

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
-- STEP 6: Create RLS Policies for Jobs
-- ============================================

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view jobs for own projects" ON jobs;
    DROP POLICY IF EXISTS "Users can create jobs for own projects" ON jobs;
    DROP POLICY IF EXISTS "Users can update jobs for own projects" ON jobs;
    DROP POLICY IF EXISTS "Users can delete jobs for own projects" ON jobs;
END $$;

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
-- STEP 7: Create RLS Policies for Deltas
-- ============================================

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view deltas for own projects" ON deltas;
    DROP POLICY IF EXISTS "Users can create deltas for own projects" ON deltas;
    DROP POLICY IF EXISTS "Users can update deltas for own projects" ON deltas;
    DROP POLICY IF EXISTS "Users can delete deltas for own projects" ON deltas;
END $$;

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
-- STEP 8: Create RLS Policies for Exports
-- ============================================

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view exports for own projects" ON exports;
    DROP POLICY IF EXISTS "Users can create exports for own projects" ON exports;
    DROP POLICY IF EXISTS "Users can delete exports for own projects" ON exports;
END $$;

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
-- STEP 9: Create Triggers
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON projects;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON jobs;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON jobs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- ============================================
-- SUCCESS!
-- ============================================

SELECT 
    'SUCCESS: All tables created!' as status,
    COUNT(*) as table_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('projects', 'jobs', 'deltas', 'exports');
