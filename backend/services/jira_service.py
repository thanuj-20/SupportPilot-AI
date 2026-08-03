"""
Simulated Jira Integration Service
Stores Jira-style ticket records in MongoDB collection 'jira_tickets'.
No external API — architecture allows future replacement with real Jira Cloud.
"""
import logging
from datetime import datetime, timezone
from database.connection import get_db

logger = logging.getLogger(__name__)

_counter_cache: dict = {}


async def _next_jira_id() -> str:
    db  = get_db()
    col = db["jira_counter"]
    doc = await col.find_one_and_update(
        {"_id": "jira_seq"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,
    )
    seq = doc["seq"]
    year = datetime.now(timezone.utc).year
    return f"JIRA-{year}-{seq:03d}"


async def create_jira_ticket(
    ticket_id: str,
    subject: str,
    diagnosis: dict,
    escalation: dict,
) -> dict:
    jira_id = await _next_jira_id()

    doc = {
        "jira_id":           jira_id,
        "ticket_id":         ticket_id,
        "title":             subject[:200],
        "category":          diagnosis["category"],
        "priority":          diagnosis["priority"],
        "severity":          diagnosis["severity"],
        "status":            "Open",
        "assigned_team":     escalation["assigned_team"],
        "escalation_status": escalation["decision"],
        "resolution_status": escalation["resolution_status"],
        "created_at":        datetime.now(timezone.utc).isoformat(),
        "updated_at":        datetime.now(timezone.utc).isoformat(),
    }

    db = get_db()
    await db["jira_tickets"].insert_one(doc)
    doc.pop("_id", None)
    logger.info(f"[Jira] Created {jira_id} for ticket {ticket_id}")
    return doc


async def get_jira_tickets(skip: int = 0, limit: int = 50) -> list:
    db = get_db()
    cursor = (
        db["jira_tickets"]
        .find({}, {"_id": 0})
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
    )
    return [doc async for doc in cursor]


async def get_jira_stats() -> dict:
    db  = get_db()
    col = db["jira_tickets"]
    total      = await col.count_documents({})
    open_c     = await col.count_documents({"status": "Open"})
    escalated  = await col.count_documents({"escalation_status": "Escalate"})
    resolved   = await col.count_documents({"resolution_status": "Auto-Resolved"})
    return {
        "total": total,
        "open": open_c,
        "escalated": escalated,
        "auto_resolved": resolved,
    }
