# Backend Environment Variables

Create a `.env` file in the `backend/gateway` directory with the following variables:

```env
# Server
PORT=4000

# Supabase Database & Auth
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Services
REDIS_URL=redis://localhost:6379
ANALYZER_URL=http://localhost:5000

# CORS
CORS_ORIGIN=http://localhost:3000

# Optional
GITHUB_API_KEY=ghp_your_github_token_here
```

## How to get the keys:

### Supabase Keys:
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to "Settings" → "API"
4. Copy the **URL** (your project URL)
5. Copy the **anon key** (for authentication middleware)
6. Copy the **service_role key** (for backend admin tasks)
   - ⚠️ **IMPORTANT**: Use the `service_role` key where requested, but `anon` key for auth verification
   - The service role key bypasses Row Level Security (RLS)

## Running the Schema:

After setting up your Supabase project, run the schema:

```bash
# Option 1: Using Supabase Dashboard
1. Go to Supabase Dashboard → SQL Editor
2. Copy the contents of backend/database/supabase-auth-migration.sql
3. Paste and run

# Option 2: Using psql (if you have it installed)
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres" < backend/database/supabase-auth-migration.sql
```
