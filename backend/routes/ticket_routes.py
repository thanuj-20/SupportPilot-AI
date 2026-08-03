"""FastAPI routes."""
from fastapi import APIRouter, HTTPException, Query
from models.schemas import TicketSubmit, PredictRequest
from services.ticket_service import (
    ingest_and_train, get_all_tickets, get_ticket_by_id,
    submit_ticket, predict_ticket, get_dashboard_stats,
)
from database.connection import get_db
from ml.trainer import load_metrics

router = APIRouter(prefix="/api", tags=["SupportPilot"])


@router.post("/train")
async def train():
    try:
        metrics = await ingest_and_train()
        return {"status": "success", "metrics": metrics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tickets", summary="Submit a new ticket")
async def create_ticket(req: TicketSubmit):
    try:
        return await submit_ticket(req.subject, req.body)
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tickets", summary="Get paginated tickets")
async def list_tickets(skip: int = Query(0, ge=0), limit: int = Query(100, le=500)):
    return await get_all_tickets(skip, limit)


@router.get("/tickets/{ticket_id}", summary="Get ticket by ID")
async def get_ticket(ticket_id: str):
    doc = await get_ticket_by_id(ticket_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return doc


@router.post("/predict", summary="Predict category, priority and severity")
async def predict(req: PredictRequest):
    try:
        return predict_ticket(req.subject or "", req.body)
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dashboard", summary="Dashboard statistics")
async def dashboard():
    return await get_dashboard_stats()


@router.get("/evaluate", summary="System evaluation metrics")
async def evaluate():
    """Returns measurable evaluation metrics from real data."""
    metrics = load_metrics()
    db = get_db()

    wf_col = db["workflow_runs"]
    res_col = db["ticket_resolutions"]

    wf_total   = await wf_col.count_documents({})
    wf_ok      = await wf_col.count_documents({"status": "completed"})
    auto_res   = await wf_col.count_documents({"escalation.decision": "Auto-Resolve"})
    escalated  = await wf_col.count_documents({"escalation.decision": "Escalate"})

    # Avg response generation time from ticket_resolutions
    timing_pipeline = [
        {"$match": {"total_duration_ms": {"$gt": 0}}},
        {"$group": {"_id": None,
                    "avg_ms": {"$avg": "$total_duration_ms"},
                    "min_ms": {"$min": "$total_duration_ms"},
                    "max_ms": {"$max": "$total_duration_ms"},
                    "count":  {"$sum": 1}}},
    ]
    timing = [d async for d in res_col.aggregate(timing_pipeline)]
    avg_ms = round(timing[0]["avg_ms"]) if timing else None
    min_ms = round(timing[0]["min_ms"]) if timing else None
    max_ms = round(timing[0]["max_ms"]) if timing else None
    res_count = timing[0]["count"] if timing else 0

    # KB retrieval: % of resolutions that had source documents
    with_sources = await res_col.count_documents({"source_documents.0": {"$exists": True}})
    kb_retrieval_rate = round(with_sources / res_count * 100, 1) if res_count else None

    # Jira success
    jira_col   = db["jira_tickets"]
    jira_total = await jira_col.count_documents({})

    # Email success
    email_col   = db["emails"]
    email_total = await email_col.count_documents({})
    email_sent  = await email_col.count_documents({"status": "Sent"})

    return {
        "classification": {
            "category_accuracy":  metrics.get("category", {}).get("accuracy"),
            "category_f1":        metrics.get("category", {}).get("f1"),
            "priority_accuracy":  metrics.get("priority", {}).get("accuracy"),
            "priority_f1":        metrics.get("priority", {}).get("f1"),
            "note": "Accuracy limited by dataset template placeholders. Values are real measured results.",
        },
        "workflow": {
            "total_runs":         wf_total,
            "successful_runs":    wf_ok,
            "success_rate_pct":   round(wf_ok / wf_total * 100, 1) if wf_total else None,
            "auto_resolved":      auto_res,
            "escalated":          escalated,
        },
        "response_generation": {
            "samples":            res_count,
            "avg_duration_ms":    avg_ms,
            "avg_duration_s":     round(avg_ms / 1000, 2) if avg_ms else None,
            "min_duration_ms":    min_ms,
            "max_duration_ms":    max_ms,
            "target_under_5s":    (avg_ms < 5000) if avg_ms else None,
        },
        "knowledge_retrieval": {
            "resolutions_with_sources": with_sources,
            "kb_retrieval_rate_pct":    kb_retrieval_rate,
        },
        "integrations": {
            "jira_tickets_created": jira_total,
            "emails_generated":     email_total,
            "emails_sent":          email_sent,
            "email_delivery_rate_pct": round(email_sent / email_total * 100, 1) if email_total else None,
        },
    }
