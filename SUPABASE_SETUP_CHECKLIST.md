# Complete Supabase Setup Checklist

Follow these steps in order to complete your Supabase database setup:

## ✅ Step 1: Get Supabase Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (or create a new one)
3. Navigate to **Settings** → **API**
4. Copy these values:
   - **URL** (e.g., `https://abcdefgh.supabase.co`)
   - **anon public** key (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

⚠️ **Important:** Use the `anon` key, NOT the `service_role` key for the frontend!

---

## ✅ Step 2: Add Environment Variables

Create or update `frontend/.env.local`:

```env
# Clerk (already set)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Supabase - ADD THESE:
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**After adding these:**
- Save the file
- Stop the dev server (Ctrl+C)
- Restart: `npm run dev`

---

## ✅ Step 3: Verify Clerk-Supabase Connection

1. In Supabase Dashboard, go to **Authentication** → **Providers**
2. Verify **Clerk** is listed and shows as "Connected"
3. If not, you need to:
   - Go to Clerk Dashboard
   - Enable Supabase integration
   - Copy the Clerk Domain
   - Add it to Supabase as a third-party provider

---

## ✅ Step 4: Create Database Schema

1. In Supabase Dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `backend/database/schema-clerk-native.sql`
4. Paste into the SQL editor
5. Click **Run** (or press Ctrl+Enter)

**What this creates:**
- ✅ `requesting_user_id()` function (gets Clerk user ID from JWT)
- ✅ `projects` table (with `user_id` as Clerk ID)
- ✅ `jobs`, `deltas`, `exports` tables
- ✅ RLS policies (users can only see their own data)
- ✅ Indexes for performance

**Verify it worked:**
- Go to **Table Editor**
- You should see: `projects`, `jobs`, `deltas`, `exports`
- Click on `projects` → **Schema** → Check that `user_id` is type `TEXT`

---

## ✅ Step 5: Test the Integration

1. Make sure the dev server is running: `npm run dev`
2. Navigate to: `http://localhost:3000/test-supabase`
3. Sign in with Clerk (if not already signed in)

**Expected Results:**

✅ **All Green:**
```
✅ Connection Test - Success
✅ Query Test - Successfully queried projects table (0 records)
✅ User ID Function Test - JWT user ID matches Clerk ID
```

❌ **If you see errors:**

- **"Table doesn't exist"** → Run the SQL schema (Step 4)
- **"Function not found"** → Run the SQL schema (Step 4)
- **"Unauthorized"** → Check Clerk configuration in Supabase
- **"Invalid JWT"** → Verify Clerk Domain in Supabase matches
- **"Connection failed"** → Check environment variables (Step 2)

---

## ✅ Step 6: Create Your First Project

Once tests pass, try creating data:

**In the browser console or test page:**

```typescript
// This should be in a React component with useSupabaseClient()
const { data, error } = await supabase
  .from('projects')
  .insert({
    name: 'My First Project',
    framework: 'nextjs',
    status: 'ready',
  })
  .select()
  .single();

console.log('Created:', data);
// user_id will be automatically set to your Clerk user ID!
```

**Verify in Supabase:**
1. Go to Supabase Dashboard → **Table Editor** → `projects`
2. You should see your new project
3. Check the `user_id` column - it should contain your Clerk user ID (like `user_2abc...`)

---

## ✅ Step 7: Verify RLS is Working

RLS (Row Level Security) ensures users can only see their own data.

**Test it:**
1. Create a project while signed in
2. Note the user_id in the database
3. Try this query (it should only return YOUR projects):
   ```typescript
   const { data } = await supabase
     .from('projects')
     .select('*');
   ```

**If another user signs in:**
- They should NOT see your projects
- This proves RLS is working! ✅

---

## Troubleshooting Checklist

### Environment Variables Not Loading?
- [ ] Did you create `.env.local` in the `frontend` directory?
- [ ] Did you restart the dev server after adding variables?
- [ ] Check for typos in variable names (must match exactly)
- [ ] Verify no extra spaces before/after the `=` sign

### Supabase Connection Failing?
- [ ] Is the URL correct? (should start with `https://`)
- [ ] Is the anon key complete? (very long string)
- [ ] Did you copy the correct key? (anon, not service_role)
- [ ] Is your Supabase project active?

### Clerk Integration Issues?
- [ ] Is Clerk integration enabled in Clerk Dashboard?
- [ ] Did you add Clerk as a provider in Supabase?
- [ ] Does the Clerk Domain match in both dashboards?
- [ ] Are you signed in with Clerk?

### Database Schema Issues?
- [ ] Did you run the ENTIRE SQL file? (not just part of it)
- [ ] Check Supabase logs for SQL errors
- [ ] Verify tables exist in Table Editor
- [ ] Check that RLS is enabled on tables

### RLS Not Working?
```sql
-- Check if RLS is enabled:
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Should show rowsecurity = true for all tables
```

---

## Quick Start Commands

```bash
# 1. Install dependencies (if not done)
cd frontend
npm install

# 2. Add environment variables
# Edit frontend/.env.local with Supabase credentials

# 3. Restart dev server
npm run dev

# 4. Open test page
# Navigate to: http://localhost:3000/test-supabase
```

---

## Success Checklist

Before moving forward, verify:

- [ ] Supabase credentials added to `.env.local`
- [ ] Dev server restarted
- [ ] Clerk is connected in Supabase Dashboard
- [ ] Database schema created (run SQL file)
- [ ] Tables visible in Supabase Table Editor
- [ ] Test page shows all green checkmarks
- [ ] Can create a project successfully
- [ ] RLS prevents seeing other users' data

---

## Next Steps After Setup

Once everything is working:

1. **Update existing components** to use `useSupabaseClient()`
2. **Remove webhook code** (no longer needed for basic auth)
3. **Add more features** using Supabase:
   - Real-time subscriptions
   - File storage (Supabase Storage)
   - Edge Functions
4. **Deploy to production** with production Supabase project

---

## Need Help?

If you're stuck on a step:

1. Check the error message in browser console
2. Check Supabase Dashboard → **Logs**
3. Check Clerk Dashboard → **Logs**
4. Verify all environment variables are set correctly
5. Try the test page to see which step is failing

**Common Issues:**
- Most issues are from environment variables not loading
- Make sure to restart the dev server!
- Verify Clerk integration is enabled in BOTH dashboards
