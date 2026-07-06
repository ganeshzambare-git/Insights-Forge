# Insights Forge Backend

Production backend for the Insights Forge AI Business Intelligence Platform.

## Tech Stack

- FastAPI
- SQLAlchemy 2.0
- PostgreSQL (Neon)
- Alembic
- Pydantic Settings
- JWT Authentication
- Redis
- Celery

## Setup

```bash
python -m venv .venv

# Windows
.venv\Scripts\activate

pip install -r requirements.txt
```

Create a `.env` file using `.env.example`.

Run the application:

```bash
uvicorn app.main:app --reload
```

Swagger:

```
http://127.0.0.1:8000/docs
```

## Running the full stack (required for file ingestion)

Dataset ingestion runs asynchronously on **Celery**, which needs **Redis** as the
broker. All three processes must be running for an upload to progress past
`PENDING`. Open three terminals from `backend/backend/` (venv activated):

```bash
# 1. Redis (broker + result backend). REDIS_URL in .env must point at it.
redis-server
# or via Docker:  docker run -p 6379:6379 redis:7

# 2. Celery worker — consumes the ingestion queue and processes uploads.
celery -A app.core.celery_app.celery_app worker --loglevel=info
# On Windows use the solo pool:  ... worker --loglevel=info --pool=solo

# 3. FastAPI backend.
uvicorn app.main:app --reload
```

Upload flow: `POST /api/v1/ingestion/stream` saves the file and returns `202` with
the dataset in `PENDING`. The Celery worker then parses it (CSV / JSON / `.xlsx`),
bulk-inserts rows into `records`, and flips the dataset to `COMPLETED`. A file that
parses to **zero rows** is marked `FAILED` (never `COMPLETED`), with the reason in
the dataset `description`. If no Redis/worker is reachable, the API falls back to an
in-process background thread so the upload still completes in local dev.

## Database

Generate migration:

```bash
alembic revision --autogenerate -m "message"
```

Apply migration:

```bash
alembic upgrade head
```