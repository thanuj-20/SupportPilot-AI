# SupportPilot – AI Ticket Resolution Agent (Milestone 1)

## Stack
- **Backend**: FastAPI + scikit-learn + Motor (async MongoDB)
- **Database**: MongoDB Atlas
- **Frontend**: React + Tailwind CSS v4 + Recharts

---

## Project Structure

```
Springboard/
├── tickets/                  # Dataset folder (CSV or XLSX auto-detected)
├── backend/
│   ├── main.py               # FastAPI app entry point
│   ├── train_offline.py      # Standalone training script
│   ├── .env                  # MongoDB URI (not committed)
│   ├── requirements.txt
│   ├── database/
│   │   └── connection.py     # Motor async MongoDB client
│   ├── ml/
│   │   ├── preprocessor.py   # Cleaning, encoding, train/test split
│   │   ├── trainer.py        # TF-IDF + LogisticRegression, metrics, save/load
│   │   └── saved_models/     # category_model.pkl, priority_model.pkl, metrics.json
│   ├── models/
│   │   └── schemas.py        # Pydantic request/response models
│   ├── routes/
│   │   └── ticket_routes.py  # All API endpoints
│   ├── services/
│   │   └── ticket_service.py # Business logic layer
│   └── utils/
│       └── dataset_loader.py # Auto-detect & load dataset
└── frontend/
    ├── src/
    │   ├── components/       # Navbar, StatCard, TicketsTable
    │   ├── pages/            # Dashboard, Tickets, Predict
    │   └── services/api.js   # Axios API calls
    └── postcss.config.js
```

---

## Setup Instructions

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
```

Create `.env` (already present):
```
MONGO_URI=mongodb+srv://<user>:<password>@cluster0.ofzudky.mongodb.net/?appName=Cluster0
DB_NAME=supportpilot
```

Start the API server:
```bash
uvicorn main:app --reload --port 8000
```

### 2. Train Models

Either via the API (POST request):
```bash
curl -X POST http://localhost:8000/api/train
```

Or run the offline script:
```bash
python train_offline.py
```

### 3. Frontend

```bash
cd frontend
npm install
npm start        # dev server on http://localhost:3000
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/train` | Load dataset, train models, store in MongoDB |
| GET | `/api/tickets?skip=0&limit=100` | Paginated ticket list |
| GET | `/api/tickets/{id}` | Single ticket by ID |
| POST | `/api/predict/category` | Predict ticket category |
| POST | `/api/predict/priority` | Predict ticket priority |
| GET | `/api/dashboard` | Dashboard statistics + model metrics |
| GET | `/health` | Health check |

### Predict Request Body
```json
{
  "subject": "Hardware issue",
  "description": "My device stopped working after the update."
}
```

---

## Dashboard Features
- Total / Open / Closed ticket counts
- Category & Priority model accuracy, precision, recall, F1
- Bar chart: Tickets by Category
- Pie chart: Priority Distribution
- Pie chart: Solved vs Unsolved
- Line chart: Monthly Ticket Trend
- Recent Tickets table with pagination

---

## Notes
- Dataset columns are **auto-detected** — works with both `.csv` and `.xlsx` files placed in the `tickets/` folder.
- Models use **TF-IDF (bigrams) + Logistic Regression** — no LLMs or embeddings.
- The dataset descriptions contain template placeholders (`{product_purchased}`) making them nearly identical across categories, which limits text-classification accuracy. This is a dataset characteristic, not a code issue.
