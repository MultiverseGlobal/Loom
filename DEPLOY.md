# Deployment Guide for Shift AI

This guide will help you deploy the application online so you don't need to run it locally.

## Project Structure
- **Frontend** (Next.js): Deployed to **Vercel**
- **Backend** (Fastify): Deployed to **Render** (or Railway/Heroku)
- **Database**: **Supabase** (Already online)

---

## Part 1: Backend Deployment (Render)

We will deploy the backend first so we have the API URL for the frontend.

1.  **Create a `Dockerfile` in `backend/gateway`**
    (I have created this file for you: `backend/gateway/Dockerfile`)
2.  **Push your code to GitHub**
    - Create a new repository on GitHub.
    - Push your local code to it.
3.  **Deploy on Render.com**
    - Sign up/Login to [Render](https://render.com).
    - Click **New +** -> **Web Service**.
    - Connect your GitHub repository.
    - **Root Directory**: `backend/gateway`
    - **Build Command**: `npm install && npm run build`
    - **Start Command**: `npm run start`
    - **Environment Variables**:
        - `SUPABASE_URL`: (Copy from your .env)
        - `SUPABASE_SERVICE_ROLE_KEY`: (Copy from your .env)
        - `PORT`: `10000` (Render sets this, or you can set it)
        - `CORS_ORIGIN`: `https://your-vercel-app.vercel.app` (You will update this later)

    *Note: Render has a free tier that spins down after inactivity. For 24/7 uptime, upgrade to the cheapest paid plan.*

---

---

## Part 2: Analyzer Deployment (Render)

The Analyzer is a Python service that needs its own hosting.

1.  **Deploy on Render.com**
    - Click **New +** -> **Web Service**.
    - Connect your GitHub repository.
    - **Root Directory**: `backend/analyzer`
    - **Runtime**: `Docker` (Render will automatically detect the Dockerfile)
    - **Environment Variables**:
        - `OPENAI_API_KEY`: (Copy from your .env)
        - `GEMINI_API_KEY`: (Copy from your .env)
        - `ANTHROPIC_API_KEY`: (Copy from your .env)
        - `PORT`: `8000`

---

## Part 3: Frontend Deployment (Vercel)

1.  **Deploy on Vercel**
    - Sign up/Login to [Vercel](https://vercel.com).
    - Click **Add New** -> **Project**.
    - Import your GitHub repository.
    - **Root Directory**: `frontend`
    - **Framework Preset**: Next.js
    - **Environment Variables**:
        - `NEXT_PUBLIC_SUPABASE_URL`: (Copy from .env.local)
        - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: (Copy from .env.local)
        - `NEXT_PUBLIC_API_URL`: **(The URL from Render Gateway, e.g. `https://shift-gateway.onrender.com`)**

---

## Part 4: Final Linkage

1.  **Link Gateway to Analyzer**
    - Go back to your **Backend (Gateway)** on Render.
    - Add/Update the following environment variable:
        - `ANALYZER_URL`: **(The URL from Render Analyzer, e.g. `https://shift-analyzer.onrender.com`)**

2.  **Update Backend CORS**
    - Go to **Backend (Gateway)** -> **Environment**.
    - Add/Update `CORS_ORIGIN`: `https://shiftai-three.vercel.app` (or your actual Vercel URL).

---

## Part 5: Verify

1.  Open your Vercel URL.
2.  Login with Supabase Auth.
3.  Check if Dashboard loads.
4.  Try creating a project and running an analysis.
