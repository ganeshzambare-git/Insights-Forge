# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

**Insights Forge** (aka PAX 2.0 / DecisIQ) — a multi-tenant AI Decision Intelligence Platform for four sectors: **Retail, Service, Education, Agriculture**. It turns raw operational data into dashboards, geospatial maps, and AI-driven recommendations.

This is a **monorepo of four independent sub-projects**, each with its own runtime, dependencies, and (for the two main ones) its own detailed `CLAUDE.md`. This root file is only the map — read the sub-project's own `CLAUDE.md` before working inside it.

| Dir | What | Own docs |
|-----|------|----------|
| `backend/backend/` | FastAPI REST API (the product backend). All 23 frozen contract endpoints, auth, RBAC, tenancy, ingestion. | **`backend/backend/CLAUDE.md`** + `backend/brain/` |
| `frontend/` | React 19 + Vite SPA client that consumes the backend over `/api/v1`. | **`frontend/CLAUDE.md`** |
| `scraper/backend/` | Standalone government-data ETL pipeline (scrape → validate → transform → load → serve). Separate FastAPI app. | `scraper/backend/README.md` |
| `chatbot/Apex-AI-main/` | "Apex AI" chatbot — separate FastAPI + Streamlit app using Ollama/LangChain/LangGraph/ChromaDB. | its own README |

`scraper-reference/` holds analytical DAG / Spark reference pipelines; treat as read-only reference, not a running service.

> Note the **doubled paths**: the real backend is `backend/backend/`, not `backend/`. Commands for it run from `backend/backend/`.

## Not a git repository

There is no `.git` here. Do not assume git history, branches, or `git` commands are available.

## Agent onboarding (important)

`AGENTS.md` at the root declares a **project-memory system** — a `brain/` directory of session-persistent notes (`master-memory.md`, `architecture.md`, `patterns.md`, `decisions.md`, `mistakes.md`, `feature-map.md`, `dependency-graph.md`) meant to encode current intent, approved patterns, and known bugs.

> **Reality check:** as of this writing the `brain/` directory does **not exist** in this checkout (`backend/brain/` is empty and there is no root `brain/`), so none of those files are present. Treat AGENTS.md's "read brain/ first" instruction as aspirational until the files actually appear. The authoritative, present-in-repo guidance is: this file, `AGENTS.md` itself, and the two sub-project `CLAUDE.md` files (`backend/backend/CLAUDE.md`, `frontend/CLAUDE.md`). AGENTS.md also lists the repo location as `IsightFordge_v1/IsightFordge_v1/`, which does not match this checkout — ignore that path.

## Cross-cutting rules (from AGENTS.md — never break)

1. **No async SQLAlchemy** — Celery needs sync; use `Session`, not `AsyncSession`.
2. **No hard deletes** — always soft delete (`is_deleted=True`).
3. **UUID primary keys** on every table.
4. **No passlib** — use the `bcrypt` library directly (`app/core/security.py`); passlib breaks with bcrypt ≥4.
5. **Tenant isolation** — every backend query filters by `workspace_id` / `organization_id`.
6. **Frozen contract** — API paths/shapes are frozen; the frontend is integrated against them. Additive-only changes. The contract files (`contract_reference.json.json`, `openapi.json`) live in `backend/backend/` and `frontend/` (copies), **not** at the repo root.
7. **Backend errors** — raise `AppError`/`HTTPException` → `{"error": {"code", "message"}}` (`app/core/errors.py`), never a bare error.
8. **Frontend feature slices** — new features use `features/<name>/api|hooks|components|pages/`; clients map snake_case DTOs → camelCase domain types before returning; TanStack Query keys always include `[tenantId, sectorId, ...]`.

## Commands

### Product backend — run from `backend/backend/`
```bash
python -m venv .venv && source .venv/bin/activate   # Python 3.13 required
pip install -r requirements.txt                     # create .env from .env.example first
uvicorn app.main:app --reload                        # Swagger at http://127.0.0.1:8000/docs
                                                     # health: GET /api/v1/health -> {"status":"ok"}
alembic revision --autogenerate -m "msg" && alembic upgrade head
pytest                                                # or: pytest tests/unit/test_x.py::test_name
black . && ruff check . && mypy app                  # line-length 88, py313
```
`.env`: `DATABASE_URL` and `SECRET_KEY` are required (no defaults). For local signup, set `AUTH_REQUIRE_EMAIL_VERIFICATION=false`. The `venv/` was relocated, so prefer `./venv/bin/python -m <tool>` if console-script shebangs are stale.

### Frontend — run from `frontend/`
```bash
npm install
npm run dev                # Vite dev server, http://localhost:5173
npm run build              # tsc -b type-check then vite build
npm test                   # vitest (one shot); npx vitest run <file> for one test
npx oxlint                 # actual linter — `npm run lint` calls eslint, which is NOT configured
```
API base URL comes from `VITE_API_URL` (defaults to `/api/v1`).

### Scraper / Chatbot
Each has its own `requirements.txt` and README; they are separate FastAPI apps and are not wired into the product backend. The chatbot launches backend+Streamlit together via `python chatbot/Apex-AI-main/run_unified.py`.

## Backend architecture (summary — full detail in `backend/backend/CLAUDE.md`)

- **Layered**: `app/api/v1/<resource>.py` routers → `app/services/*` logic → `app/schemas/*` Pydantic I/O. Routers registered in `app/api/v1/router.py`.
- **Auth/RBAC/tenancy**: JWT (15-min access carrying `sub, org_id, role, workspace_id, sector`; 7d rotating refresh in `user_sessions`). `app/api/deps.py` provides `get_current_user`, `require_roles(...)`, `ensure_sector(...)`. **Workspace == sector**: `workspaces.sector` (enum retail/service/education/agriculture) is the tenant's sector.
- **Models** (`app/models/`, one file per table, ~30): inherit `BaseModel` (UUID id, tz-aware timestamps, `is_deleted`); business entities also mix in `AuditMixin`. **Any new model must be imported in `app/db/base.py`** or Alembic misses it. PostgreSQL `Enum` (in `enums.py`), JSONB for config columns.
- **Performance gotcha**: all relationships are `lazy="selectin"`, so naive loads fire ~11 round-trips. Read/lookup queries use `.options(lazyload("*"))` and write paths avoid `db.refresh()` (`expire_on_commit=False`). Follow this in new query code.
- **Config**: centralized in `app/core/config.py` (pydantic-settings); access via the `settings` singleton, never `os.environ`. `DEBUG=True` enables noisy SQL echo — keep `False` for tests.
- **Celery/Redis + LLM (Gemini 2.5 Flash)** power ingestion (`app/tasks/`) and RAG/embedding/vector-store subsystems (`app/core/rag`, `embedding`, `vector_store`, `llm`, `memory`).

## Frontend architecture (summary — full detail in `frontend/CLAUDE.md`)

- React 19 + Vite + TS; TanStack Query (server state), Zustand (client state), react-router v7, axios, shadcn/ui, ECharts, react-hook-form + zod, MSW.
- `@/` aliases `src/`. **Feature-slice pattern** in `src/features/<name>/`. Existing: dashboard, dataset, reasoning, simulation, reports, recommendation, governance, administration (the product's WHAT/WHY/WILL/SHOULD paradigm).
- Single shared axios instance `src/services/apiClient.ts` injects JWT from `sessionStorage['insight-auth-storage']` and normalizes errors to `ApiErrorResponse`. Query keys centralized in `src/lib/queryKeys.ts` (include tenant+sector for cache isolation).
- Routing `src/app/router.tsx` uses `/:tenant_id/:sector_id/<page>`, lazy pages, `AuthGuard` (→ `/401`, `/403`). `frontend/openapi.json` is the source of truth for backend DTO shapes.
