"""Service layer: ingestion, predictions, ticket CRUD, dashboard stats."""
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

import pandas as pd

from database.connection import get_db
from utils.dataset_loader import load_dataset
from ml.preprocessor import preprocess, generate_severity, clean_text
from ml.trainer import train_models, load_model, load_metrics

logger = logging.getLogger(__name__)


# ── Training & Ingestion ──────────────────────────────────────────────────────

async def ingest_and_train() -> dict:
    df_raw = load_dataset()
    splits = preprocess(df_raw)
    metrics = train_models(splits)
    await store_tickets_bulk(splits["clean_df"])
    return metrics


async def store_tickets_bulk(df: pd.DataFrame):
    db = get_db()
    col = db["tickets"]
    await col.drop()

    records = []
    for _, row in df.iterrows():
        records.append({
            "ticket_id":  str(uuid.uuid4()),
            "subject":    str(row.get("subject", ""))[:200],
            "body":       str(row.get("text_input", "")),
            "category":   str(row.get("ticket_type", "")),
            "priority":   str(row.get("priority", "")),
            "severity":   str(row.get("severity", "")),
            "status":     str(row.get("status", "Open")),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    if records:
        await col.insert_many(records)
    logger.info(f"[DB] Stored {len(records)} tickets.")


# ── Single Ticket Submission ──────────────────────────────────────────────────

async def submit_ticket(subject: str, body: str) -> dict:
    prediction = _run_prediction(subject, body)
    doc = {
        "ticket_id":  str(uuid.uuid4()),
        "subject":    subject[:200],
        "body":       clean_text(body),
        "category":   prediction["category"],
        "priority":   prediction["priority"],
        "severity":   prediction["severity"],
        "status":     "Open",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    db = get_db()
    await db["tickets"].insert_one(doc)
    doc.pop("_id", None)
    return {**doc, **prediction}


# ── Predictions ───────────────────────────────────────────────────────────────

def _run_prediction(subject: str, body: str) -> dict:
    text = clean_text(f"{subject} {body}".strip())
    cat_model = load_model("category")
    pri_model = load_model("priority")

    cat_proba = cat_model.predict_proba([text])[0]
    pri_proba = pri_model.predict_proba([text])[0]

    cat_idx = cat_proba.argmax()
    pri_idx = pri_proba.argmax()

    priority = cat_model.classes_[cat_idx]  # reuse variable below
    priority = pri_model.classes_[pri_idx]

    return {
        "category":            cat_model.classes_[cat_idx],
        "priority":            priority,
        "severity":            generate_severity(priority),
        "category_confidence": round(float(cat_proba[cat_idx]), 4),
        "priority_confidence": round(float(pri_proba[pri_idx]), 4),
    }


def predict_ticket(subject: str, body: str) -> dict:
    return _run_prediction(subject, body)


# ── Ticket Queries ────────────────────────────────────────────────────────────

async def get_all_tickets(skip: int = 0, limit: int = 100) -> list:
    db = get_db()
    cursor = db["tickets"].find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
    return [doc async for doc in cursor]


async def get_ticket_by_id(ticket_id: str) -> Optional[dict]:
    db = get_db()
    return await db["tickets"].find_one({"ticket_id": ticket_id}, {"_id": 0})


# ── Dashboard ─────────────────────────────────────────────────────────────────

async def get_dashboard_stats() -> dict:
    db = get_db()
    col = db["tickets"]

    total  = await col.count_documents({})
    open_c = await col.count_documents({"status": {"$in": ["Open", "Pending"]}})
    closed = await col.count_documents({"status": "Closed"})

    async def _dist(field):
        pipeline = [{"$group": {"_id": f"${field}", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}]
        return {d["_id"]: d["count"] async for d in col.aggregate(pipeline)}

    # Monthly trend
    trend_pipeline = [
        {"$match": {"created_at": {"$exists": True, "$ne": ""}}},
        {"$group": {"_id": {"$substr": ["$created_at", 0, 7]}, "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}},
    ]
    monthly_trend = [{"month": d["_id"], "count": d["count"]} async for d in col.aggregate(trend_pipeline)]

    # Workflow-based stats from workflow_runs
    wf_col        = db["workflow_runs"]
    auto_resolved = await wf_col.count_documents({"escalation.decision": "Auto-Resolve"})
    escalated     = await wf_col.count_documents({"escalation.decision": "Escalate"})
    wf_total      = await wf_col.count_documents({})

    resolution_rate = round(auto_resolved / wf_total * 100, 1) if wf_total else 0
    escalation_rate = round(escalated     / wf_total * 100, 1) if wf_total else 0

    metrics = load_metrics()

    return {
        "total":                   total,
        "open":                    open_c,
        "closed":                  closed,
        "auto_resolved":           auto_resolved,
        "escalated":               escalated,
        "resolution_rate":         resolution_rate,
        "escalation_rate":         escalation_rate,
        "category_distribution":   await _dist("category"),
        "priority_distribution":   await _dist("priority"),
        "severity_distribution":   await _dist("severity"),
        "monthly_trend":           monthly_trend,
        "model_metrics":           metrics,
    }
