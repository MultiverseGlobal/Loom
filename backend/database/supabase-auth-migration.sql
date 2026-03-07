-- Supabase Auth Migration - Database Schema Updates
-- Run this in Supabase SQL Editor

-- ============================================
-- STEP 1: Create Users Table (for profiles)
-- ============================================

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policies for users table
CREATE POLICY "Users can view own profile" 
ON public.users FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.users FOR UPDATE 
USING (auth.uid() = id);

-- ============================================
-- STEP 2: Create Trigger for Auto User Profile
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- STEP 3: Drop Old Policies First
-- ============================================

-- Drop ALL old policies that reference user_id
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

-- ============================================
-- STEP 4: Update Projects Table user_id
-- ============================================

-- Clear any existing data (since we're switching auth systems)
TRUNCATE TABLE exports CASCADE;
TRUNCATE TABLE deltas CASCADE;
TRUNCATE TABLE jobs CASCADE;
TRUNCATE TABLE projects CASCADE;

-- Change user_id from TEXT to UUID (in steps to avoid casting issues)
ALTER TABLE projects 
ALTER COLUMN user_id DROP DEFAULT;

ALTER TABLE projects 
ALTER COLUMN user_id TYPE UUID USING NULL;

ALTER TABLE projects 
ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Add foreign key constraint
ALTER TABLE projects
DROP CONSTRAINT IF EXISTS fk_projects_user;

ALTER TABLE projects
ADD CONSTRAINT fk_projects_user
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- ============================================
-- STEP 5: Create RLS Policies with auth.uid()
-- ============================================

-- Projects policies
CREATE POLICY "Users can view own projects" 
ON projects FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create projects" 
ON projects FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" 
ON projects FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" 
ON projects FOR DELETE 
USING (auth.uid() = user_id);

-- ============================================
-- STEP 6: Jobs RLS Policies
-- ============================================

CREATE POLICY "Users can view jobs for own projects" 
ON jobs FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = jobs.project_id 
        AND projects.user_id = auth.uid()
    )
);

CREATE POLICY "Users can create jobs for own projects" 
ON jobs FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = jobs.project_id 
        AND projects.user_id = auth.uid()
    )
);

CREATE POLICY "Users can update jobs for own projects" 
ON jobs FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = jobs.project_id 
        AND projects.user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete jobs for own projects" 
ON jobs FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = jobs.project_id 
        AND projects.user_id = auth.uid()
    )
);

-- ============================================
-- STEP 7: Deltas RLS Policies
-- ============================================

CREATE POLICY "Users can view deltas for own projects" 
ON deltas FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = deltas.project_id 
        AND projects.user_id = auth.uid()
    )
);

CREATE POLICY "Users can create deltas for own projects" 
ON deltas FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = deltas.project_id 
        AND projects.user_id = auth.uid()
    )
);

CREATE POLICY "Users can update deltas for own projects" 
ON deltas FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = deltas.project_id 
        AND projects.user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete deltas for own projects" 
ON deltas FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = deltas.project_id 
        AND projects.user_id = auth.uid()
    )
);

-- ============================================
-- STEP 8: Exports RLS Policies
-- ============================================

CREATE POLICY "Users can view exports for own projects" 
ON exports FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = exports.project_id 
        AND projects.user_id = auth.uid()
    )
);

CREATE POLICY "Users can create exports for own projects" 
ON exports FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = exports.project_id 
        AND projects.user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete exports for own projects" 
ON exports FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = exports.project_id 
        AND projects.user_id = auth.uid()
    )
);

-- ============================================
-- VERIFICATION
-- ============================================

-- Check users table exists
SELECT '✅ Users table created' as status
WHERE EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'users'
);

-- Check trigger exists
SELECT '✅ User creation trigger exists' as status
WHERE EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'on_auth_user_created'
);

-- Check user_id is UUID type
SELECT '✅ Projects.user_id is UUID' as status, data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'projects' 
AND column_name = 'user_id';

-- Done!
SELECT '🎉 Migration Complete! Ready for Supabase Auth' as message;
