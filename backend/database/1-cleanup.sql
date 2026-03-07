-- STEP 1: Complete Cleanup
-- Run this FIRST to remove all existing tables

-- Drop all tables (CASCADE removes all dependencies)
DROP TABLE IF EXISTS exports CASCADE;
DROP TABLE IF EXISTS deltas CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS requesting_user_id() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Verify cleanup
SELECT 
    'Cleanup complete! No tables should be listed below:' as message,
    table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('projects', 'jobs', 'deltas', 'exports', 'users', 'sessions');
