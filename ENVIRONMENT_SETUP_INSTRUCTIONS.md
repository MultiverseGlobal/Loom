# Environment Setup Instructions

You need to create a `.env.local` file with your API keys to make the app work.

## Quick Clerk Setup (5 minutes - RECOMMENDED)

### Step 1: Get Clerk Keys

1. Go to: https://dashboard.clerk.com
2. Sign up (free account)
3. Click "Create Application"
4. Choose "Next.js" as framework
5. Go to "API Keys" in sidebar
6. Copy:
   - **Publishable Key** (starts with `pk_test_`)
   - **Secret Key** (starts with `sk_test_`)

### Step 2: Get Supabase Keys

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Go to Settings → API
4. Copy:
   - **URL** (like `https://abcdef.supabase.co`)
   - **anon public** key (long key, NOT service_role)

### Step 3: Create .env.local File

**In VS Code or any text editor:**

1. Create new file: `frontend/.env.local`
2. Add these lines:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
CLERK_SECRET_KEY=sk_test_YOUR_KEY_HERE
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ_YOUR_LONG_KEY_HERE
```

3. Replace `YOUR_KEY_HERE` with your actual keys
4. Save the file

### Step 4: Restart Server

```bash
# Press Ctrl+C in terminal
npm run dev
```

### Step 5: Test

Navigate to `/signup` - you should see Clerk's signup form!

---

## Option 2: Test Without Auth (Quick & Dirty)

If you just want to test the UI without authentication:

1. I can create a mock auth provider
2. You can browse the app without signing in
3. But you won't be able to test Supabase database

**Want me to set up the mock auth instead?**

---

## Recommendation

**Go with Option 1** - it only takes 5 minutes and you get:
- ✅ Real authentication working
- ✅ Ability to test Supabase integration
- ✅ Multiple users for testing RLS
- ✅ OAuth ready (Google, GitHub)

Just create a free Clerk account and copy the keys!
