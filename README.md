# ContraBot - Production Architecture

ContraBot is an AI-powered contraception counseling platform for East Africa. It provides WHO MEC-grounded recommendations through USSD, WhatsApp, a user-facing web app, and a CHW dashboard.

## Architecture

```text
channels/ussd.py, channels/whatsapp.py -> channels/intake.py (shared flow)
                                             |
engine/safety_screen.py -> engine/scorer.py -> engine/recommender.py (+ RAG)
                                             |
services/knowledge.py (ChromaDB)   services/facilities.py (PostgreSQL)
services/session.py (Redis)
```

## Apps

| App | Location | Purpose | Local URL |
| --- | --- | --- | --- |
| Backend API | `app/` | FastAPI API, USSD, WhatsApp, recommendation engine | `http://localhost:8000` |
| Web app | `web/` | User-facing landing, chat, compare, facilities | `http://localhost:5173` |
| CHW dashboard | `chw/` | CHW consult workflow and outcomes analytics | `http://localhost:5174` |

`frontend/` is the earlier React prototype. Use `web/` and `chw/` for the production-facing apps.

## Data Sources

| Source | Location | Collection |
| --- | --- | --- |
| WHO Medical Eligibility Criteria | `data/chromadb/WHO_MEC.pdf` | `who_mec` |
| APHRC regional evidence | `data/aphrc/` | `aphrc` |
| Kenya/Uganda facilities | `data/facilities/*.csv` | PostgreSQL `facilities` |

Run `python ingest.py` after adding or changing APHRC records, WHO material, or ChromaDB-backed content.

## Quick Start

### 1. Infrastructure

```bash
docker compose up -d redis postgres
```

### 2. Backend

```bash
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python ingest.py
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Fill the provider keys in `.env` before using live AI responses. If no LLM key is configured, the engine tests still use deterministic fallback behavior.

### 3. Web App

```bash
cd web
copy .env.example .env
npm install
npm run dev
```

Set `VITE_USE_MOCK=true` in `web/.env` to demo without the backend.

### 4. CHW Dashboard

```bash
cd chw
copy .env.example .env
npm install
npm run dev
```

`chw/.env.example` defaults to mock mode so the dashboard can be demonstrated quickly.

## API Endpoints

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | Health check |
| POST | `/recommend` | Full engine pipeline for a profile JSON |
| POST | `/chat` | Free-form chat with RAG context |
| GET | `/facilities?district=` | Nearest clinics |
| POST | `/outcomes` | CHW outcome logging |
| GET | `/analytics/outcomes` | Aggregated outcomes |
| GET | `/methods/compare` | Method comparison table |
| POST/GET | `/ussd` | Africa's Talking USSD |
| GET/POST | `/whatsapp` or `/webhook` | Meta WhatsApp |

The same product API is also mounted under `/api` for the Vite frontends.

## Environment Variables

See `.env.example` for:

- `GROQ_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_API_KEY`
- `AT_API_KEY`, `AT_USERNAME`
- `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`
- `REDIS_URL`, `DATABASE_URL`
- `CORS_ORIGINS`

## Testing And Builds

```bash
pytest tests -v
cd web && npm run build
cd ../chw && npm run build
```

The Python suite covers engine safety behavior and WhatsApp webhook handling. The web and CHW builds verify the production frontend bundles.

## Deployment

1. Connect the repository to Railway, Render, or another Python host.
2. Set environment variables from `.env.example`.
3. Add Redis and PostgreSQL add-ons, or use `docker-compose.yml`.
4. Use `uvicorn app.main:app --host 0.0.0.0 --port $PORT` as the backend start command.
5. Deploy `web/` and `chw/` to Vercel/Netlify with `VITE_API_URL=https://your-api-host`.

## Manual Launch Checklist

- [ ] Africa's Talking sandbox callback points to `https://your-api-host/ussd`
- [ ] Meta WhatsApp sandbox webhook points to `https://your-api-host/webhook`
- [ ] Real facility exports have been imported into `data/facilities/`
- [ ] APHRC data has been ingested with `python ingest.py`
- [ ] Production `.env` values are configured for API, Redis, PostgreSQL, and CORS
