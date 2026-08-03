# SupportPilot AI — Milestone 4

## Architecture

```
SupportPilot-AI/
├── backend/                   # FastAPI + scikit-learn + Motor (async MongoDB)
│   ├── agents/                # DiagnosisAgent, RetrievalAgent, ResolutionAgent, EscalationAgent, Orchestrator
│   ├── database/              # Motor async MongoDB client
│   ├── knowledge/             # FAISS index, RAG generator, chunker, embedder
│   ├── ml/                    # TF-IDF + LogisticRegression, preprocessor, trainer
│   ├── models/                # Pydantic schemas
│   ├── routes/                # ticket_routes, knowledge_routes, workflow_routes, escalation_routes
│   ├── services/              # ticket_service, jira_service, email_service, escalation_service
│   ├── utils/                 # dataset_loader
│   ├── main.py
│   ├── train_offline.py
│   └── requirements.txt
├── frontend/                  # React + Tailwind CSS v4 + Recharts
│   └── src/
│       ├── components/        # Navbar, StatCard, TicketsTable, ArticleModal, etc.
│       ├── pages/             # Dashboard, Tickets, Predict, KnowledgeBase, WorkflowPage,
│       │                      # JiraPage, EmailPage, IntegrationsPage, EscalationPage, WorkflowMonitorPage
│       └── services/api.js
├── knowledge_base/            # Markdown articles for FAISS/RAG
└── tickets/                   # Dataset CSV/XLSX (auto-detected)
```

---

## Environment Variables

### backend/.env
```
MONGO_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/?appName=Cluster0
DB_NAME=supportpilot

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_gmail@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=SupportPilot <your_gmail@gmail.com>
```

### frontend/.env (optional)
```
VITE_API_URL=http://localhost:8000/api
```

---

## Setup

### 1. Backend
```bash
cd backend
pip install -r requirements.txt
```

Train models (first run):
```bash
python train_offline.py
# or via API:
curl -X POST http://localhost:8000/api/train
```

Start server:
```bash
uvicorn main:app --reload --port 8000
```

### 2. Frontend
```bash
cd frontend
npm install
npm start        # dev — http://localhost:3000
npm run build    # production build → frontend/dist/
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/train` | Load dataset, train ML models |
| GET | `/api/tickets` | Paginated ticket list |
| GET | `/api/tickets/{id}` | Single ticket |
| POST | `/api/predict` | Predict category, priority, severity |
| GET | `/api/dashboard` | Full dashboard stats |
| POST | `/api/knowledge/search` | FAISS semantic search |
| POST | `/api/knowledge/ask` | RAG response |
| POST | `/api/workflow/run` | Run 4-agent pipeline |
| GET | `/api/workflow/history` | Workflow run history |
| GET | `/api/workflow/stats` | Workflow monitoring stats |
| GET | `/api/escalations` | Filtered escalation records |
| GET | `/api/escalations/stats` | Escalation summary stats |
| PATCH | `/api/escalations/{id}/status` | Update escalation status |
| GET | `/api/jira/tickets` | Jira simulation records |
| GET | `/api/emails` | Email records |
| GET | `/api/integrations/status` | Integration health |
| GET | `/health` | Health check |

---

## MongoDB Collections

| Collection | Description |
|------------|-------------|
| `tickets` | All support tickets |
| `workflow_runs` | Multi-agent pipeline execution records |
| `escalations` | Escalated ticket records with status tracking |
| `jira_tickets` | Simulated Jira records |
| `emails` | Email notification records |
| `jira_counter` | Auto-increment sequence for Jira IDs |

---

## ML Models

- **Category model**: TF-IDF (bigrams) + Logistic Regression
- **Priority model**: TF-IDF (bigrams) + Logistic Regression
- **Knowledge Base**: FAISS + sentence-transformers (all-MiniLM-L6-v2)
- Models saved to `backend/ml/saved_models/`
- FAISS index saved to `backend/knowledge/faiss_store/`

---

## Multi-Agent Pipeline

```
DiagnosisAgent → RetrievalAgent → ResolutionAgent → EscalationAgent
     ↓                ↓                 ↓                  ↓
Category/Priority  FAISS Search    RAG Response      Auto-Resolve
Severity           Top-K chunks    Solution Steps    or Escalate
Confidence                         Prevention Tips   → Jira + Email
```

---

## Production Deployment

### Backend (gunicorn + uvicorn workers)
```bash
gunicorn main:app -w 2 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### Frontend
```bash
npm run build
# Serve dist/ with nginx or any static host
```

### CORS
Set `allow_origins` in `main.py` to your production frontend URL instead of `"*"`.

### Security Checklist
- Never commit `.env` files — covered by `.gitignore`
- Rotate MongoDB credentials if ever exposed
- Use Gmail App Passwords, not account passwords
- Set `DEBUG=False` equivalent (remove `--reload` from uvicorn in production)

---

## Notes
- Dataset column names are auto-detected — works with `.csv` and `.xlsx`
- Template placeholders in dataset descriptions limit ML accuracy — this is a dataset characteristic
- All Jira and Email integrations are simulated locally in MongoDB
- FAISS index is built once on startup and reused — no repeated loading
