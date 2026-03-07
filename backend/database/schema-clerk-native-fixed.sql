-- Clerk + Supabase Native Integration Schema (Clean Install)
-- Run this in Supabase SQL Editor

-- ============================================
-- CLEANUP (if tables already exist)
-- ============================================

-- Drop existing policies first (if they exist)
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Users can create projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;

DROP POLICY IF EXISTS "Users can view jobs for own projects" ON jobs;
DROP POLICY IF EXISTS "Users can create jobs for own projects" ON jobs;
DROP POLICY IF EXISTS "Users can update jobs for own projects" ON jobs;
DROP POLICY IF EXISTS "Users can delete jobs for own projects" ON jobs;

DROP POLICY IF EXISTS "Users can view deltas for own projects" ON deltas;
DROP POLICY IF EXISTS "Users can create deltas for own projects" ON deltas;
DROP POLICY IF EXISTS "Users can update deltas for own projects" ON deltas;
DROP POLICY IF EXISTS "Users can delete deltas for own projects" ON deltas;

DROP POLICY IF EXISTS "Users can view exports for own projects" ON exports;
DROP POLICY IF EXISTS "Users can create exports for own projects" ON exports;
DROP POLICY IF EXISTS "Users can delete exports for own projects" ON exports;

-- Drop existing tables (if they exist)
DROP TABLE IF EXISTS exports CASCADE;
DROP TABLE IF EXISTS deltas CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop existing functions (if they exist)
DROP FUNCTION IF EXISTS requesting_user_id() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get the current Clerk user ID from JWT
CREATE OR REPLACE FUNCTION requesting_user_id()
RETURNS TEXT AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '')::text;
$$ LANGUAGE SQL STABLE;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TABLES
-- ============================================

-- Projects table with Clerk user ID reference
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL DEFAULT requesting_user_id(), -- Clerk user ID (text, not UUID)
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
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    result JSONB,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Deltas table
CREATE TABLE deltas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    changes JSONB NOT NULL,
    applied BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Exports table
CREATE TABLE exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('zip', 'github')),
    url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);

CREATE INDEX idx_jobs_project_id ON jobs(project_id);
CREATE INDEX idx_jobs_status ON jobs(status);

CREATE INDEX idx_deltas_project_id ON deltas(project_id);
CREATE INDEX idx_deltas_applied ON deltas(applied);

CREATE INDEX idx_exports_project_id ON exports(project_id);

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

CREATE POLICY "Users can view own projects" 
ON projects 
FOR SELECT 
USING (user_id = requesting_user_id());

CREATE POLICY "Users can create projects" 
ON projects 
FOR INSERT 
WITH CHECK (user_id = requesting_user_id());

CREATE POLICY "Users can update own projects" 
ON projects 
FOR UPDATE 
USING (user_id = requesting_user_id())
WITH CHECK (user_id = requesting_user_id());

CREATE POLICY "Users can delete own projects" 
ON projects 
FOR DELETE 
USING (user_id = requesting_user_id());

-- ============================================
-- RLS POLICIES - JOBS
-- ============================================

CREATE POLICY "Users can view jobs for own projects" 
ON jobs 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = jobs.project_id 
        AND projects.user_id = requesting_user_id()
    )
);

CREATE POLICY "Users can create jobs for own projects" 
ON jobs 
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = jobs.project_id 
        AND projects.user_id = requesting_user_id()
    )
);

CREATE POLICY "Users can update jobs for own projects" 
ON jobs 
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = jobs.project_id 
        AND projects.user_id = requesting_user_id()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = jobs.project_id 
        AND projects.user_id = requesting_user_id()
    )
);

CREATE POLICY "Users can delete jobs for own projects" 
ON jobs 
FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = jobs.project_id 
        AND projects.user_id = requesting_user_id()
    )
);

-- ============================================
-- RLS POLICIES - DELTAS
-- ============================================

CREATE POLICY "Users can view deltas for own projects" 
ON deltas 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = deltas.project_id 
        AND projects.user_id = requesting_user_id()
    )
);

CREATE POLICY "Users can create deltas for own projects" 
ON deltas 
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = deltas.project_id 
        AND projects.user_id = requesting_user_id()
    )
);

CREATE POLICY "Users can update deltas for own projects" 
ON deltas 
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = deltas.project_id 
        AND projects.user_id = requesting_user_id()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = deltas.project_id 
        AND projects.user_id = requesting_user_id()
    )
);

CREATE POLICY "Users can delete deltas for own projects" 
ON deltas 
FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = deltas.project_id 
        AND projects.user_id = requesting_user_id()
    )
);

-- ============================================
-- RLS POLICIES - EXPORTS
-- ============================================

CREATE POLICY "Users can view exports for own projects" 
ON exports 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = exports.project_id 
        AND projects.user_id = requesting_user_id()
    )
);

CREATE POLICY "Users can create exports for own projects" 
ON exports 
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = exports.project_id 
        AND projects.user_id = requesting_user_id()
    )
);

CREATE POLICY "Users can delete exports for own projects" 
ON exports 
FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = exports.project_id 
        AND projects.user_id = requesting_user_id()
    )
);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_projects_updated_at 
BEFORE UPDATE ON projects
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at 
BEFORE UPDATE ON jobs
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Run these to verify everything is set up correctly:

-- 1. Check that tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('projects', 'jobs', 'deltas', 'exports')
ORDER BY table_name;

-- 2. Check that RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('projects', 'jobs', 'deltas', 'exports')
ORDER BY tablename;

-- 3. Check that the requesting_user_id function works
-- (This should return NULL until you make a request with a Clerk JWT)
SELECT requesting_user_id();

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$ 
BEGIN 
    RAISE NOTICE 'Clerk + Supabase schema created successfully!';
    RAISE NOTICE 'Tables: projects, jobs, deltas, exports';
    RAISE NOTICE 'RLS: Enabled on all tables';
    RAISE NOTICE 'Next: Test at http://localhost:3000/test-supabase';
END $$;
