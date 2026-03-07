# .env.local Template for Loom AI

# Copy this file content to create `frontend/.env.local`
# DO NOT commit .env.local to git (it's gitignored for security)

# ==================================
# SUPABASE (Required)
# ==================================
# Get these from: https://supabase.com/dashboard → Your Project → Settings → API

NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ==================================
# Instructions
# ==================================
# 1. Copy the two lines above (NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY)
# 2. Create a new file: frontend/.env.local
# 3. Paste those lines
# 4. Replace YOUR_PROJECT_ID with your actual Supabase project ID
# 5. Replace the anon key with the full key from Supabase Dashboard
# 6. Save the file
# 7. Restart your dev server: npm run dev
