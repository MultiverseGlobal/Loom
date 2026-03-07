-- Migration: 6-add-access-mode.sql

ALTER TABLE projects
ADD COLUMN access_mode VARCHAR(20) DEFAULT 'full'; -- 'full', 'analysis', 'read_only'

-- Add comment
COMMENT ON COLUMN projects.access_mode IS 'full = write access enabled, analysis = read only / safe mode';
