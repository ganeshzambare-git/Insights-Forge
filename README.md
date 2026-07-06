# 🌌 Insights Forge 

> **Multi-tenant AI Decision Intelligence Platform** catering to **Retail, Service, Education, and Agriculture** sectors. Designed to turn raw operational data into interactive analytics, geospatial maps, and AI-powered recommendations.

---

## 🚀 Technology Stack

### Backend
- **Core Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.13)
- **Database ORM**: SQLAlchemy 2.0 (PostgreSQL / Neon)
- **Task Queue & Caching**: Celery + Redis
- **LLM Engine**: Gemini 2.5 Flash

### Frontend
- **Framework**: [React 19](https://react.dev/) + [Vite](https://vite.dev/)
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Data Visualization**: ECharts + Leaflet (Geomapping)
- **Styling**: TailwindCSS / Vanilla CSS

---

## 📂 Project Architecture

```bash
IsightFordge_v1/
├── backend/            # FastAPI REST API & Celery Workloads
│   └── backend/
│       ├── app/
│       │   ├── api/    # Routes (v1)
│       │   ├── core/   # Security, Configuration & Errors
│       │   ├── models/ # SQLAlchemy Tables (UUID keys, soft-delete)
│       │   ├── tasks/  # Celery Ingestion Tasks
│       │   └── schemas/# Pydantic Validation Schemas
│       └── scripts/    # DB seeding & testing utilities
├── frontend/           # React SPA Client
│   ├── src/
│   │   ├── features/   # Feature Slices (Dashboard, Reasoning, Simulation, Reports)
│   │   ├── services/   # Axios API Clients
│   │   └── store/      # Zustand Stores
├── scraper/            # Market intelligence web crawler
├── chatbot/            # Apex AI chatbot implementation
└── scraper-reference/  # Analytical DAGs & Spark reference pipelines
```

---

## ⚙️ Local Development Setup

### 1. Backend Service
1. Navigate to the backend directory:
   ```bash
   cd backend/backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv .venv
   # Windows:
   .\.venv\Scripts\Activate.ps1
   # macOS/Linux:
   source .venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy the environment variables template and customize it:
   ```bash
   cp .env.example .env
   ```
   > [!NOTE]
   > For local development, set `AUTH_REQUIRE_EMAIL_VERIFICATION=false` in `.env` to bypass registration verification links.
5. Start the local development server:
   ```bash
   .venv\Scripts\uvicorn.exe app.main:app --reload --host 127.0.0.1 --port 8000
   ```
   *Health Check*: `GET http://127.0.0.1:8000/api/v1/health` → `{"status": "ok"}`

---

### 2. Frontend App
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Set up the development API URL in `.env`:
   ```env
   VITE_API_URL=http://localhost:8000/api/v1
   ```
4. Run the frontend dev server:
   ```bash
   npm run dev
   ```
   *URL*: Open `http://localhost:5173/` in your browser.

---

## 🌟 Key Application Features

1. **Multi-Tenant Isolation**: Out-of-the-box organization and workspace partitioning. Data is strictly isolated dynamically by `workspace_id` in all operations.
2. **Robust File Ingestion**: Streamlined CSV, JSON, and Excel (.xlsx via `openpyxl`) import flow. Large uploads are asynchronously queued via background threads or Celery.
3. **AI Reasoning Analysis**: Dynamic industry-contextual insights powered by Gemini 2.5 Flash, visualised using evidence-linked relationship graphs.
4. **Dynamic Visualizations**: Integrated interactive charts (Avg Sales, Trends) powered by ECharts, coupled with geospatial maps.
5. **Interactive Simulations**: Parameterized risk analysis forecasting models with simulated scenario adjustments.
