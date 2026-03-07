# How to Fix "Missing environment keys" Error

The error you're seeing means the `.env.local` file is missing or has incorrect keys.

## Quick Fix (3 Steps):

### Step 1: Get Your Clerk Keys

1. Go to: https://dashboard.clerk.com
2. Sign in (or create account if you haven't)
3. Click on your application (or create one)
4. Go to "API Keys" in the sidebar
5. You'll see two keys:
   - **Publishable key** (starts with `pk_test_`)
   - **Secret key** (starts with `sk_test_`)
6. **Keep this tab open** - you'll need to copy these!

### Step 2: Create the .env.local File

**In VS Code or any text editor:**

1. Open the `frontend` folder in your project
2. Create a NEW file called `.env.local` (exactly this name, with the dot)
3. Paste this template:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_PASTE_YOUR_KEY_HERE
CLERK_SECRET_KEY=sk_test_PASTE_YOUR_KEY_HERE
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ_YOUR_ANON_KEY_HERE
```

4. **Replace the placeholder values:**
   - Copy publishable key from Clerk → paste after `=` on line 1
   - Copy secret key from Clerk → paste after `=` on line 2
   - Copy Supabase URL → paste after `=` on line 3
   - Copy Supabase anon key → paste after `=` on line 4

5. **Save the file**

### Step 3: Restart the Server

In your terminal (where npm run dev is running):

1. Press `Ctrl+C` to stop
2. Run: `npm run dev`
3. Wait for it to start
4. Refresh your browser

---

## Important Notes:

✅ **File must be named exactly:** `.env.local` (with the dot at the start)
✅ **File must be in:** `frontend/.env.local` (not in root)
✅ **No spaces** around the `=` sign
✅ **No quotes** around the values
✅ **Must restart** server after creating/editing

---

## Example of Correct Format:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_bXkta3WxLmNvbS9kZXNo...
CLERK_SECRET_KEY=sk_test_QWJjZGVmZ2hpamtsbW5vcHFy...
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Troubleshooting:

**Still seeing the error?**

1. Check the file is named `.env.local` (not `.env.local.txt`)
2. Check it's in the `frontend` folder
3. Make sure you copied the FULL keys (they're very long!)
4. Restart the dev server
5. Hard refresh browser (Ctrl+Shift+R)

**Can't find Clerk keys?**

- Make sure you're signed into Clerk Dashboard
- Click on your application name
- Look for "API Keys" in the sidebar
- The keys should be visible there

**Need help?**

Let me know at which step you're stuck!
