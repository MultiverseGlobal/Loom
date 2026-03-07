# Next Steps - Test Your Setup! 🚀

## ✅ What You've Done So Far:

1. ✅ Connected Clerk to Supabase (third-party auth)
2. ✅ Created database schema with Clerk user IDs
3. ✅ Set up Row Level Security (RLS) policies

## 📋 Next Steps:

### Step 1: Add Supabase Environment Variables

You need to create `.env.local` in the frontend directory with your Supabase credentials.

**Get your Supabase keys:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **URL** (Project URL)
   - **anon public** key (NOT service_role!)

**Create the file:**

Create `frontend/.env.local` with:

```env
# Clerk (you should already have these)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_key_here

# Supabase - ADD THESE NOW:
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **Important:** 
- Use the `anon` key, NOT the `service_role` key
- The anon key is safe for frontend use
- After adding, you MUST restart the dev server

---

### Step 2: Restart the Dev Server

**In your terminal:**
1. Press `Ctrl+C` to stop the current server
2. Run: `npm run dev`
3. Wait for it to start

This ensures the new environment variables are loaded.

---

### Step 3: Test the Integration

**Open in your browser:**
```
http://localhost:3000/test-supabase
```

**What should happen:**
1. If not signed in, you'll be prompted to sign in with Clerk
2. After signing in, the page will automatically run integration tests
3. You should see:

```
✅ Clerk User Information
   ID: user_2abc...
   Email: your@email.com

✅ Integration Tests
   ✅ Connection Test - Success
   ✅ Query Test - Successfully queried projects table (0 records)
   ✅ User ID Function Test - JWT user ID matches Clerk ID
```

---

### Step 4: Create Your First Project

If all tests pass, try creating a project!

**Option A: Use the browser console**

Open browser DevTools (F12) and run:

```javascript
// This will be available on the page
const { data, error } = await supabase
  .from('projects')
  .insert({
    name: 'My First Loom Project',
    framework: 'nextjs',
    status: 'ready',
  })
  .select()
  .single();

console.log('Created project:', data);
```

**Option B: Check Supabase Dashboard**

1. Go to Supabase Dashboard → **Table Editor**
2. Click on `projects` table
3. Click **Insert row**
4. Fill in:
   - name: "Test Project"
   - framework: "nextjs"
   - status: "ready"
5. Click **Insert**
6. Note that `user_id` is automatically set to your Clerk user ID!

---

## 🎯 Success Checklist

Before moving on, verify:

- [ ] `.env.local` file created with Supabase credentials
- [ ] Dev server restarted
- [ ] Can access `/test-supabase` page
- [ ] All integration tests show green checkmarks ✅
- [ ] Can create a project successfully
- [ ] Project appears in Supabase Table Editor
- [ ] `user_id` column shows your Clerk user ID (like `user_2abc...`)

---

## 🐛 Troubleshooting

### "Unauthorized" or "Invalid JWT"
- Make sure you're signed in with Clerk
- Verify Clerk is configured as third-party auth in Supabase
- Check that the Clerk Domain matches in both dashboards

### "Connection failed"
- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- Check `NEXT_PUBLIC_SUPABASE_ANON_KEY` is complete
- Make sure you restarted the dev server

### Environment variables not loading
- Check the file is named exactly `.env.local` (with the dot)
- Make sure it's in the `frontend/` directory
- Restart the dev server (this is crucial!)
- No spaces before/after the `=` sign

### Can't create projects
- Run the test page first to see which test fails
- Check browser console for errors
- Verify RLS policies are enabled in Supabase

---

## 🎉 What's Next After Testing?

Once everything works:

1. **Update your app** to use `useSupabaseClient()` in components
2. **Build features** using Supabase queries
3. **Test RLS** by signing in as different users (they shouldn't see each other's data)
4. **Add real-time** subscriptions if needed
5. **Deploy** to production with production Supabase project

---

## 📝 Quick Reference

**Test Page:**
```
http://localhost:3000/test-supabase
```

**Using Supabase in Components:**
```typescript
import { useSupabaseClient } from '@/lib/supabase-client';

function MyComponent() {
  const supabase = useSupabaseClient();
  
  // Query data (automatically filtered by RLS)
  const { data } = await supabase
    .from('projects')
    .select('*');
}
```

**Check if integration is working:**
- Browser → `/test-supabase`
- Should show all green checkmarks
- Clerk user ID should match JWT user ID

---

Need help? Check the error message in:
- Browser console (F12)
- Supabase Dashboard → Logs
- Network tab to see actual requests
