# Clerk + Supabase Migration - Complete Guide

This guide explains the new authentication and database setup for Loom AI.

## Architecture Overview

- **Authentication**: Clerk (replaces Supabase Auth)
- **Database**: Supabase (replaces in-memory database)
- **User Sync**: Clerk webhooks automatically sync user data to Supabase

## Frontend Setup

### 1. Environment Variables

Create `.env.local` in the `frontend` directory:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_YOUR_KEY
CLERK_SECRET_KEY=sk_test_YOUR_KEY

# Optional: Clerk customization
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# API
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 2. Get Clerk Keys

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Create a new application
3. Navigate to **API Keys**
4. Copy your **Publishable Key** and **Secret Key**

### 3. Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:3000`

---

## Backend Setup

### 1. Environment Variables

Create `.env` in the `backend/gateway` directory:

```env
# Server
PORT=4000

# Clerk Authentication
CLERK_SECRET_KEY=sk_test_YOUR_SECRET_KEY
CLERK_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET

# Supabase Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Services
REDIS_URL=redis://localhost:6379
ANALYZER_URL=http://localhost:5000

# CORS
CORS_ORIGIN=http://localhost:3000
```

### 2. Set Up Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project
3. Go to **Settings** → **API**
4. Copy:
   - **URL** (your project URL)
   - **service_role key** (NOT the anon key!)

### 3. Create Database Schema

Run the SQL schema in Supabase:

1. Go to Supabase Dashboard → **SQL Editor**
2. Open `backend/database/schema.sql`
3. Copy and paste the entire contents
4. Click **Run**

This creates tables for:
- `users` - Synced from Clerk
- `projects` - User projects
- `jobs` - Processing jobs
- `deltas` - Code changes
- `exports` - Export artifacts

### 4. Set Up Clerk Webhooks

1. Go to [Clerk Dashboard](https://dashboard.clerk.com) → **Webhooks**
2. Click **Add Endpoint**
3. Enter your backend URL: `http://your-backend-url/api/webhooks/clerk`
   - For local development with ngrok: `https://your-ngrok-url/api/webhooks/clerk`
4. Subscribe to these events:
   - `user.created`
   - `user.updated`
   - `user.deleted`
5. Copy the **Webhook Secret** (starts with `whsec_`)

### 5. Install Missing Dependencies (if needed)

```bash
cd backend/gateway
npm install @fastify/helmet @fastify/rate-limit @fastify/sensible @fastify/multipart @fastify/websocket
```

### 6. Run Backend

```bash
cd backend/gateway
npm install
npm run dev
```

Backend runs on `http://localhost:4000`

---

## How It Works

### Authentication Flow

1. **User signs up** via Clerk on the frontend
2. **Clerk creates the user** and manages the session
3. **Clerk sends webhook** to backend (`user.created` event)
4. **Backend stores user** data in Supabase database
5. **Frontend makes API calls** with Clerk session token
6. **Backend verifies token** with Clerk and processes request

### Database Operations

- Frontend uses Supabase client for read operations (projects, jobs, etc.)
- Backend uses Supabase service role key for all database operations
- User data is automatically synced from Clerk via webhooks

### API Authentication

Protected API routes use Clerk token verification:

```typescript
// Backend route with authentication
server.register(async function protectedRoutes(fastify) {
  fastify.addHook('preHandler', requireAuth);
  
  fastify.get('/api/protected', async (request: AuthenticatedRequest, reply) => {
    // request.userId contains the Clerk user ID
    const user = await getUser(request.userId);
    return { user };
  });
});
```

---

## Testing the Setup

### 1. Test Frontend Auth

1. Navigate to `http://localhost:3000/signup`
2. Create a new account
3. Verify you're redirected after signup
4. Check that login works

### 2. Test Webhook Sync

1. Sign up a new user
2. Check Clerk Dashboard → **Users** (user should appear)
3. Check Supabase Dashboard → **Table Editor** → `users` (user should be synced)

### 3. Test API Authentication

```bash
# This should fail (no auth)
curl http://localhost:4000/api/protected

# Frontend should automatically include Clerk session token
# Open browser console and check network requests
```

---

## Troubleshooting

### Frontend Issues

**"Clerk not configured" error:**
- Ensure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` are set
- Restart the dev server after adding env vars

**Redirect loops:**
- Check middleware.ts public routes configuration
- Verify Clerk dashboard URL settings match your app

### Backend Issues

**Webhook verification fails:**
- Check `CLERK_WEBHOOK_SECRET` is correct
- Ensure webhook endpoint is accessible (use ngrok for local dev)

**Supabase connection errors:**
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Check Supabase project is active
- Ensure database schema was run successfully

**"User not found" in database:**
- Check webhooks are set up and endpoint is accessible
- Verify webhook events (`user.created`, etc.) are selected
- Check backend logs for webhook errors

---

## Migration Notes

### What Changed

**Removed:**
- Supabase Auth (@supabase/ssr, auth methods)
- Custom JWT token generation (bcryptjs, jsonwebtoken)
- In-memory database
- Manual auth routes (/api/auth/login, /api/auth/signup)

**Added:**
- Clerk authentication
- Supabase database (Postgres)
- Clerk webhook handler
- Clerk token verification middleware

### Existing Users

⚠️ **Breaking Change**: Existing users will need to re-register with Clerk. There is no automatic migration from the old auth system.

If you have important user data, you can:
1. Export users from old system
2. Manually recreate them in Clerk
3. Link the accounts by Clerk user ID

---

## Next Steps

1. **Deploy to Production:**
   - Set up production Clerk application
   - Configure production Supabase project
   - Update environment variables
   - Set up webhook endpoint (ensure it's publicly accessible)

2. **Add OAuth Providers:**
   - Go to Clerk Dashboard → **Social Connections**
   - Enable Google, GitHub, etc.
   - Clerk handles everything automatically!

3. **Customize Clerk UI:**
   - Update `appearance` prop in SignIn/SignUp components
   - Match your app's design system
   - Use Clerk's theming options

4. **Implement Protected Routes:**
   - Add `requireAuth` middleware to backend routes
   - Use Clerk's `useAuth()` hook in frontend
   - Implement role-based access control if needed
