# Testing Clerk + Supabase Integration

Follow these steps to test that your Clerk-Supabase integration is working:

## 1. Verify Clerk Configuration in Supabase

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** → **Providers**
4. Verify that **Clerk** is listed and enabled
5. Check that the Clerk Domain is configured correctly

## 2. Run the Database Schema

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Open the file: `backend/database/schema-clerk-native.sql`
4. Copy and paste the entire contents
5. Click **Run** to execute

This will create:
- ✅ `requesting_user_id()` function to get Clerk user ID from JWT
- ✅ Tables: `projects`, `jobs`, `deltas`, `exports`
- ✅ RLS policies that filter by Clerk user ID
- ✅ Indexes for performance

## 3. Add Environment Variables

Create or update `.env.local` in the frontend directory:

```env
# Clerk (should already be set)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Supabase (ADD THESE)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**To get Supabase keys:**
1. Go to Supabase Dashboard → **Settings** → **API**
2. Copy **URL** (Project URL)
3. Copy **anon public** key (NOT the service_role key!)

## 4. Run the Frontend

```bash
cd frontend
npm install  # Install @supabase/supabase-js if not already done
npm run dev
```

## 5. Test the Integration

1. Navigate to: `http://localhost:3000/test-supabase`
2. Sign in with Clerk (if not already signed in)
3. The test page will automatically run integration tests

**What the tests check:**
- ✅ Clerk user information is loaded
- ✅ Supabase connection works
- ✅ Can query the `projects` table
- ✅ `requesting_user_id()` function returns correct Clerk user ID
- ✅ JWT claims match Clerk user ID

## 6. Expected Results

### ✅ Success Scenario

If everything is configured correctly, you should see:

```
Clerk User Information
✓ ID: user_xxx...
✓ Email: your@email.com
✓ Name: Your Name

Integration Tests
✅ Connection Test - Success
✅ Query Test - Successfully queried projects table
✅ User ID Function Test - JWT user ID matches Clerk ID
```

### ℹ️ Partial Success (Expected)

On first run, you might see:

```
✅ Connection Test - Success
ℹ️ Query Test - Table doesn't exist yet or query failed
   (This is expected if you haven't created the projects table yet)
ℹ️ User ID Function Test - Function not created yet
   (Run the SQL from schema-clerk-native.sql)
```

**This is normal!** Just run the SQL schema in step 2.

### ❌ Failure Scenarios

**Error: "No token provided" or "Unauthorized"**
- Check that Clerk is properly configured in Supabase
- Verify NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is set
- Make sure you're signed in

**Error: "Invalid JWT"**
- Verify Clerk Domain in Supabase matches your Clerk app
- Check that Clerk-Supabase integration is enabled in Clerk Dashboard

**Error: "Connection failed"**
- Verify NEXT_PUBLIC_SUPABASE_URL is correct
- Check NEXT_PUBLIC_SUPABASE_ANON_KEY is set

## 7. Test Creating Data

Once the tests pass, try creating a project:

```typescript
// In any component
const supabase = useSupabaseClient();

const createProject = async () => {
  const { data, error } = await supabase
    .from('projects')
    .insert({
      name: 'My Test Project',
      framework: 'nextjs',
      status: 'ready',
    })
    .select()
    .single();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Created project:', data);
    // user_id will be automatically set to your Clerk user ID!
  }
};
```

## 8. Verify RLS is Working

RLS (Row Level Security) ensures users can only see their own data.

**Test it:**
1. Sign in as User A
2. Create a project
3. Sign out and sign in as User B
4. Try to query projects
5. You should **not** see User A's project! ✅

This proves RLS is working correctly.

## 9. Check Supabase Dashboard

1. Go to Supabase Dashboard → **Table Editor**
2. Click on `projects` table
3. You should see your test projects
4. Notice the `user_id` column contains Clerk user IDs (like `user_2abc...`)

## Troubleshooting

### Token Issues

If you get JWT/token errors, check:

1. **Is Clerk-Supabase integration enabled?**
   - Clerk Dashboard → Integrations → Supabase

2. **Is the Clerk Domain correct in Supabase?**
   - Should be something like `https://your-app.clerk.accounts.dev`

3. **Are you using the correct template?**
   - Frontend code should use: `getToken({ template: 'supabase' })`

### RLS Issues

If you can see other users' data:

1. **Are RLS policies enabled?**
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public';
   ```
   Should show `rowsecurity = true`

2. **Is `requesting_user_id()` working?**
   ```sql
   SELECT requesting_user_id();
   ```
   Should return your Clerk user ID when called with authenticated JWT

### Connection Issues

If Supabase won't connect:

1. Check environment variables are loaded (restart dev server)
2. Verify CORS settings in Supabase (should allow localhost:3000)
3. Check browser console for errors

## Success Checklist

- ✅ Clerk is configured as third-party auth in Supabase
- ✅ Database schema is created (tables, RLS, functions)
- ✅ Environment variables are set correctly
- ✅ Test page shows all green checkmarks
- ✅ Can create and query projects
- ✅ RLS prevents seeing other users' data
- ✅ `user_id` is automatically set to Clerk user ID

## Next Steps

Once everything is working:

1. ✅ Remove the webhook-based user sync (now unnecessary)
2. ✅ Update existing components to use `useSupabaseClient()`
3. ✅ Implement features using Supabase realtime
4. ✅ Add more tables as needed (with RLS policies)

---

**Need Help?**

If tests are failing, check:
- Browser console for errors
- Supabase logs (Dashboard → Logs)
- Clerk Dashboard → Logs
- Network tab to see the actual JWT being sent
