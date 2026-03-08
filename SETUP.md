# Shift AI - Setup Guide

## Prerequisites

- **Node.js** 20+ and npm/pnpm
- **Python** 3.11+ with `uv` or `pip`
- **Docker Desktop** (for Postgres, Redis, MinIO)

## Quick Start

### 1. Start Infrastructure Services

```bash
cd backend
docker compose up -d
```

This starts:
- PostgreSQL on port 5432
- Redis on port 6379
- MinIO (S3-compatible) on ports 9000 (API) and 9001 (Console)

### 2. Configure Backend Gateway

```bash
cd backend/gateway
cp env.sample .env
# Edit .env if needed (defaults should work for local dev)
pnpm install
pnpm dev
```

The gateway will:
- Auto-create database tables on startup
- Run on `http://localhost:4000`
- Connect to Redis, Postgres, and Analyzer service

### 3. Start Analyzer Service

In a new terminal:

```bash
cd backend/analyzer
# Using uv (recommended)
uv pip install -e .[dev]
uvicorn app.main:app --reload --port 5000

# OR using pip
pip install -e .[dev]
uvicorn app.main:app --reload --port 5000
```

Analyzer runs on `http://localhost:5000`

### 4. Start Frontend

In another terminal:

```bash
cd frontend
pnpm install
pnpm dev
```

Frontend runs on `http://localhost:3000`

### 5. Start Queue Workers (Optional)

To process background jobs, run workers:

```bash
cd backend/gateway
RUN_WORKER=true pnpm dev
```

Or in a separate terminal:
```bash
cd backend/gateway
RUN_WORKER=true node dist/server.js
```

## What Works Right Now

✅ **Backend APIs:**
- `/api/health` - Health check
- `/api/projects` - Project management
- `/api/ingest` - Code ingestion (queues jobs)
- `/api/jobs/:id` - Job status
- `/api/deltas` - Delta tracking
- `/api/patches` - Patch generation
- `/api/refactor` - Refactoring suggestions
- `/api/exports` - Export management
- `/api/stream/ws` - WebSocket streaming
- `/api/healing` - Self-healing pipeline

✅ **Analyzer APIs:**
- `/analyzer/structure` - Project structure analysis
- `/analyzer/dependencies` - Dependency inference
- `/analyzer/refactor` - Refactoring suggestions

✅ **Frontend:**
- All MVP pages rendered
- Static data (needs API integration)

## What Still Needs Work

⚠️ **Frontend-Backend Integration:**
- Frontend currently uses static mock data
- Need to add API client and connect to real endpoints
- File upload handlers need implementation

⚠️ **Storage Service:**
- MinIO bucket creation (auto or manual)
- File upload/download implementation
- S3 client integration

⚠️ **Real Job Processing:**
- Workers have placeholder logic
- Need actual file parsing, analyzer calls, storage writes
- Export artifact generation

⚠️ **Authentication:**
- Auth middleware stubs
- Need Clerk/Auth0 integration
- User session management

## Testing the Platform

### 1. Test Health Endpoints

```bash
curl http://localhost:4000/api/health
curl http://localhost:5000/health
```

### 2. Create a Project

```bash
curl -X POST http://localhost:4000/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Project", "framework": "nextjs"}'
```

### 3. Queue an Ingest Job

```bash
curl -X POST http://localhost:4000/api/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "projectName": "Test Project",
    "sourceType": "clipboard",
    "metadata": {"frameworkHint": "nextjs"}
  }'
```

### 4. Check Job Status

```bash
# Use the jobId from the ingest response
curl http://localhost:4000/api/jobs/{jobId}
```

### 5. Test WebSocket Stream

```bash
# First create a subscription
curl -X POST http://localhost:4000/api/stream/subscribe \
  -H "Content-Type: application/json" \
  -d '{"projectId": "your-project-id", "clientType": "ide"}'

# Then connect via WebSocket (use wscat or browser)
# wscat -c "ws://localhost:4000/api/stream/ws?token=your-token"
```

## Environment Variables

### Gateway (.env)
- `PORT` - Gateway port (default: 4000)
- `REDIS_URL` - Redis connection (default: redis://localhost:6379)
- `DATABASE_URL` - Postgres connection
- `ANALYZER_URL` - Analyzer service URL (default: http://localhost:5000)
- `CORS_ORIGIN` - Frontend origin (default: http://localhost:3000)
- `GITHUB_API_KEY` - Optional, for GitHub integration

### Analyzer
- Uses defaults, can add `.env` if needed

## Troubleshooting

**Database connection errors:**
- Ensure Docker Compose is running
- Check `DATABASE_URL` matches docker-compose.yml settings

**Redis connection errors:**
- Verify Redis container is up: `docker ps`
- Check `REDIS_URL` in gateway .env

**Analyzer not responding:**
- Check analyzer logs
- Verify port 5000 is available
- Ensure Python dependencies installed

**Frontend can't connect:**
- Check CORS_ORIGIN in gateway .env
- Verify gateway is running on port 4000
- Check browser console for errors

## Next Steps to Make It Fully Functional

1. **Wire Frontend to Backend:**
   - Create API client service
   - Replace static data with real API calls
   - Add file upload components

2. **Implement Storage:**
   - MinIO bucket setup
   - File upload/download handlers
   - Signed URL generation

3. **Complete Workers:**
   - Real file parsing
   - Analyzer service integration
   - Export artifact generation

4. **Add Authentication:**
   - Clerk/Auth0 setup
   - Protected routes
   - User context

