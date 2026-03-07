# Frontend Environment Variables

Create a `.env.local` file in the frontend directory with the following variables:

## Clerk Authentication

Get these from your Clerk Dashboard (https://dashboard.clerk.com):

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY
CLERK_SECRET_KEY=sk_test_YOUR_SECRET_KEY
```

**How to get Clerk keys:**
1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Navigate to "API Keys"
4. Copy your Publishable Key and Secret Key

## Supabase Database

Get these from your Supabase Dashboard (https://supabase.com/dashboard):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**How to get Supabase keys:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to Settings → API
4. Copy:
   - **URL** (Project URL)
   - **anon public** key (under Project API keys)

⚠️ **Important:** Use the `anon` key, NOT the `service_role` key!

## Optional: Clerk URL Customization

```env
# These are optional - Clerk uses sensible defaults
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

## Complete Example

Your `.env.local` should look like this:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_abc123...
CLERK_SECRET_KEY=sk_test_xyz789...

# Supabase Database  
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optional Clerk URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

## Verification

After setting up your `.env.local`:

1. Restart your development server
2. Navigate to `/test-supabase` to verify the integration
3. Check that all environment variables are loaded correctly

## Security Notes

- ✅ `.env.local` is git-ignored by default
- ✅ Never commit real API keys to version control
- ✅ The `anon` key is safe to use in the browser (it's public)
- ⚠️ The `service_role` key should ONLY be used in backend/server code
- ✅ Clerk's publishable key is safe for client-side use
- ⚠️ Clerk's secret key should ONLY be used in server-side code
