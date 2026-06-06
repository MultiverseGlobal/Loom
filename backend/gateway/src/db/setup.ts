import { db } from "./client.js";
import { createTablesSql } from "./schema.js";

export async function ensureDatabase() {
  await db.unsafe(createTablesSql);

  // Migration: Ensure columns exist (idempotent)
  await db.unsafe(`
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS source_platform TEXT;
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS source_url TEXT;
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS origin_meta JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ready';
    
    ALTER TABLE analyses ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_analyses_project_id ON analyses(project_id);

    CREATE TABLE IF NOT EXISTS activity_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      metadata JSONB DEFAULT '{}'::jsonb,
      ip_address TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );

    -- Enable Row Level Security (RLS) and configure policies for all tables safely
    DO $$
    BEGIN
        -- users
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
            ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
            DROP POLICY IF EXISTS "Users can manage own user profile" ON public.users;
            CREATE POLICY "Users can manage own user profile" ON public.users FOR ALL USING (auth.uid() = id);
        END IF;

        -- projects
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'projects') THEN
            ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
            DROP POLICY IF EXISTS "Users can manage own projects" ON public.projects;
            CREATE POLICY "Users can manage own projects" ON public.projects FOR ALL USING (auth.uid() = user_id);
        END IF;

        -- project_deltas
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'project_deltas') THEN
            ALTER TABLE public.project_deltas ENABLE ROW LEVEL SECURITY;
            DROP POLICY IF EXISTS "Users can manage own project deltas" ON public.project_deltas;
            CREATE POLICY "Users can manage own project deltas" ON public.project_deltas FOR ALL USING (auth.uid() = user_id);
        END IF;

        -- analyses
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'analyses') THEN
            ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
            DROP POLICY IF EXISTS "Users can manage own analyses" ON public.analyses;
            CREATE POLICY "Users can manage own analyses" ON public.analyses FOR ALL USING (auth.uid() = user_id);
        END IF;

        -- import_tasks
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'import_tasks') THEN
            ALTER TABLE public.import_tasks ENABLE ROW LEVEL SECURITY;
            DROP POLICY IF EXISTS "Users can manage own import tasks" ON public.import_tasks;
            CREATE POLICY "Users can manage own import tasks" ON public.import_tasks FOR ALL USING (auth.uid() = user_id);
        END IF;

        -- patches
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'patches') THEN
            ALTER TABLE public.patches ENABLE ROW LEVEL SECURITY;
            DROP POLICY IF EXISTS "Users can manage own patches" ON public.patches;
            CREATE POLICY "Users can manage own patches" ON public.patches FOR ALL USING (auth.uid() = user_id);
        END IF;

        -- job_failures
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'job_failures') THEN
            ALTER TABLE public.job_failures ENABLE ROW LEVEL SECURITY;
            DROP POLICY IF EXISTS "Users can manage own job failures" ON public.job_failures;
            CREATE POLICY "Users can manage own job failures" ON public.job_failures FOR ALL USING (auth.uid() = user_id);
        END IF;

        -- stream_subscriptions
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'stream_subscriptions') THEN
            ALTER TABLE public.stream_subscriptions ENABLE ROW LEVEL SECURITY;
            DROP POLICY IF EXISTS "Users can manage own stream subscriptions" ON public.stream_subscriptions;
            CREATE POLICY "Users can manage own stream subscriptions" ON public.stream_subscriptions FOR ALL USING (auth.uid() = user_id);
        END IF;

        -- extensions
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'extensions') THEN
            ALTER TABLE public.extensions ENABLE ROW LEVEL SECURITY;
            DROP POLICY IF EXISTS "Users can manage own extensions" ON public.extensions;
            CREATE POLICY "Users can manage own extensions" ON public.extensions FOR ALL USING (auth.uid() = user_id);
        END IF;

        -- pairing_sessions
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pairing_sessions') THEN
            ALTER TABLE public.pairing_sessions ENABLE ROW LEVEL SECURITY;
            DROP POLICY IF EXISTS "Users can manage own pairing sessions" ON public.pairing_sessions;
            CREATE POLICY "Users can manage own pairing sessions" ON public.pairing_sessions FOR ALL USING (auth.uid() = user_id);
        END IF;

        -- github_accounts
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'github_accounts') THEN
            ALTER TABLE public.github_accounts ENABLE ROW LEVEL SECURITY;
            DROP POLICY IF EXISTS "Users can manage own github accounts" ON public.github_accounts;
            CREATE POLICY "Users can manage own github accounts" ON public.github_accounts FOR ALL USING (auth.uid() = user_id);
        END IF;

        -- integrations
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'integrations') THEN
            ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
            DROP POLICY IF EXISTS "Users can manage own integrations" ON public.integrations;
            CREATE POLICY "Users can manage own integrations" ON public.integrations FOR ALL USING (auth.uid() = user_id);
        END IF;

        -- project_integrations
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'project_integrations') THEN
            ALTER TABLE public.project_integrations ENABLE ROW LEVEL SECURITY;
            DROP POLICY IF EXISTS "Users can manage own project integrations" ON public.project_integrations;
            CREATE POLICY "Users can manage own project integrations" ON public.project_integrations FOR ALL USING (EXISTS (SELECT 1 FROM public.projects WHERE public.projects.id = project_integrations.project_id AND public.projects.user_id = auth.uid()));
        END IF;

        -- project_github_links
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'project_github_links') THEN
            ALTER TABLE public.project_github_links ENABLE ROW LEVEL SECURITY;
            DROP POLICY IF EXISTS "Users can manage own project github links" ON public.project_github_links;
            CREATE POLICY "Users can manage own project github links" ON public.project_github_links FOR ALL USING (EXISTS (SELECT 1 FROM public.projects WHERE public.projects.id = project_github_links.project_id AND public.projects.user_id = auth.uid()));
        END IF;

        -- project_files
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'project_files') THEN
            ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;
            DROP POLICY IF EXISTS "Users can manage own project files" ON public.project_files;
            CREATE POLICY "Users can manage own project files" ON public.project_files FOR ALL USING (EXISTS (SELECT 1 FROM public.projects WHERE public.projects.id = project_files.project_id AND public.projects.user_id = auth.uid()));
        END IF;

        -- activity_logs
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'activity_logs') THEN
            ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
            DROP POLICY IF EXISTS "Users can manage own activity logs" ON public.activity_logs;
            CREATE POLICY "Users can manage own activity logs" ON public.activity_logs FOR ALL USING (auth.uid() = user_id);
        END IF;

        -- commands
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'commands') THEN
            ALTER TABLE public.commands ENABLE ROW LEVEL SECURITY;
            DROP POLICY IF EXISTS "Users can manage own commands" ON public.commands;
            CREATE POLICY "Users can manage own commands" ON public.commands FOR ALL USING (auth.uid() = user_id);
        END IF;
    END $$;
  `);
}

