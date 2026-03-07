# Loom AI Backend

The backend is split into two cooperating services:

1. **Gateway (Node.js + Fastify + TypeScript)** – handles HTTP traffic, authentication, file uploads, job orchestration, and wraps third-party APIs (GitHub, Stripe, Clerk/Auth0).
2. **Analyzer (Python + FastAPI)** – performs heavy static/code intelligence tasks (tree-sitter/Babel parsing, dependency inference) inside sandboxed workers.

Shared responsibilities:

- **Queues/Workers:** BullMQ (Redis) for asynchronous reconstruction/export jobs.
- **Storage:** S3-compatible bucket for raw uploads & exports; PostgreSQL for metadata; Redis both for queues and short-lived cache.
- **Contracts:** JSON over HTTP for external clients, gRPC/REST between Gateway ↔ Analyzer (initial MVP uses REST with a future upgrade path to gRPC).

## Service responsibilities

| Service   | Key Endpoints / Jobs                                   |
|-----------|--------------------------------------------------------|
| Gateway   | `/api/ingest`, `/api/reconstruct`, `/api/exports`, `/api/deltas`, `/api/health` |
| Analyzer  | `/analyzer/structure`, `/analyzer/dependencies`, `/analyzer/deltas` |

## Local development

```
backend/
  gateway/
    package.json
    src/
      server.ts
      routes/
        health.ts
        ingest.ts
        jobs.ts
      services/
        storage.ts
        queue.ts
        analyzerClient.ts
  analyzer/
    pyproject.toml
    app/
      main.py
      routers/
        structure.py
        dependencies.py
```

1. `cd backend && docker compose up -d` to boot Postgres, Redis, and MinIO.
2. Copy `env.sample` → `.env` inside `gateway/` and adjust credentials.
3. From `backend/gateway`: `pnpm install && pnpm dev` (Fastify on `:4000`).
4. From `backend/analyzer`: `uv pip install -e .[dev] && uvicorn app.main:app --reload --port 5000`.
5. Frontend calls `http://localhost:4000/api/*`, which in turn fans out to queues, Postgres, MinIO, and analyzer workers.

Security guardrails remain the same: inputs are sanitized, stored encrypted, and never executed.

