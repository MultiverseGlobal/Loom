-- Migration: 5-add-origin-tracking.sql

-- 1. Add richer metadata to projects
ALTER TABLE projects 
ADD COLUMN origin_meta JSONB DEFAULT '{}'::jsonb; 
-- e.g. { "lovable_version": "2.0", "export_id": "xyz" }

-- 2. Create table to track "Interpretation" of files (NOT the content)
CREATE TABLE file_origins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    
    -- Where did this file come from?
    origin_source VARCHAR(50) NOT NULL, -- 'ai_generated', 'human_authored', 'mixed', 'scaffold'
    origin_tool VARCHAR(50), -- 'loveable', 'cursor', 'manual'
    
    -- Drift Detection
    initial_hash VARCHAR(64), -- Hash when first imported/generated
    current_status VARCHAR(50) DEFAULT 'synced', -- 'synced', 'drifted', 'conflict', 'detached'
    
    -- Metadata constraints
    risk_score INT DEFAULT 0, -- 0-100 likelihood of breaking
    detected_smells JSONB DEFAULT '[]'::jsonb, -- e.g. ["hardcoded_secret", "weird_import"]
    
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(project_id, file_path)
);

-- Index for fast lookups during IDE sync
CREATE INDEX idx_file_origins_lookup ON file_origins(project_id, file_path);
