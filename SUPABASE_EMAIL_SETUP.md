# Quick Setup: Configure Supabase Email Redirect

After creating the auth callback route, you need to configure Supabase to allow the redirect URL.

## Step 1: Add Redirect URL in Supabase Dashboard

1. Go to **Supabase Dashboard** → Your Project
2. Navigate to **Authentication** → **URL Configuration**
3. Under **Redirect URLs**, add:
   ```
   http://localhost:3000/auth/callback
   ```
4. Click **Save**

## Step 2: (Optional) Disable Email Confirmation for Development

If you want to skip email confirmation during development:

1. Go to **Authentication** → **Providers** → **Email**
2. Under **Email Auth**, toggle off **"Confirm email"**
3. Click **Save**

**Note**: Re-enable email confirmation before going to production!

## What This Does

- **With email confirmation enabled**: Users get a "Check your email" message → Click link → Redirected to `/dashboard`
- **With email confirmation disabled**: Users are logged in immediately → Redirected to `/dashboard`

The app now handles both scenarios correctly!
