"""
Escalation Service
Persists escalation records from the EscalationAgent into MongoDB.
Provides CRUD + stats for the Escalation Monitoring page.
"""
import logging
from datetime import datetime, timezone
from database.connection import get_db

logger = logging.getLogger(__name__)


async def save_escalation(
    ticket_id: str,
    subject: str,
    diagnosis: dict,
    resolution: dict,
    escalation: dict,
    workflow_id: str = None,
) -> dict:
    """Upsert an escalation record when EscalationAgent decides to escalate.
    Uses ticket_id as the unique key — safe to call multiple times."""
    if escalation["decision"] != "Escalate":
        return {}

    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "ticket_id":        ticket_id,
        "workflow_id":      workflow_id,
        "subject":          subject[:200],
        "category":         diagnosis["category"],
        "priority":         diagnosis["priority"],
        "severity":         diagnosis["severity"],
        "confidence":       resolution["confidence_label"],
        "confidence_score": resolution["confidence_score"],
        "reason":           escalation["reason"],
        "assigned_team":    escalation["assigned_team"],
        "updated_at":       now,
    }
    db = get_db()
    result = await db["escalations"].find_one_and_update(
        {"ticket_id": ticket_id},
        {
            "$set":         doc,
            "$setOnInsert": {"status": "Escalated", "created_at": now},
        },
        upsert=True,
        return_document=True,
    )
    if result:
        result.pop("_id", None)
    logger.info(f"[Escalation] Upserted escalation for ticket {ticket_id}")
    return result or doc


async def get_escalations(
    skip: int = 0,
    limit: int = 50,
    status: str = None,
    priority: str = None,
    severity: str = None,
    category: str = None,
    assigned_team: str = None,
) -> list:
    db = get_db()
    query = {}
    if status:        query["status"]        = status
    if priority:      query["priority"]      = priority
    if severity:      query["severity"]      = severity
    if category:      query["category"]      = {"$regex": category, "$options": "i"}
    if assigned_team: query["assigned_team"] = {"$regex": assigned_team, "$options": "i"}

    cursor = (
        db["escalations"]
        .find(query, {"_id": 0})
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
    )
    return [doc async for doc in cursor]


async def update_escalation_status(ticket_id: str, new_status: str) -> dict:
    valid = {"Escalated", "In Progress", "Resolved"}
    if new_status not in valid:
        raise ValueError(f"Status must be one of {valid}")

    db = get_db()
    result = await db["escalations"].find_one_and_update(
        {"ticket_id": ticket_id},
        {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}},
        return_document=True,
    )
    if result:
        result.pop("_id", None)
    return result


async def get_escalation_stats() -> dict:
    db  = get_db()
    col = db["escalations"]
    total      = await col.count_documents({})
    escalated  = await col.count_documents({"status": "Escalated"})
    in_progress = await col.count_documents({"status": "In Progress"})
    resolved   = await col.count_documents({"status": "Resolved"})
    critical   = await col.count_documents({"priority": {"$in": ["critical", "high"]}})
    return {
        "total":       total,
        "escalated":   escalated,
        "in_progress": in_progress,
        "resolved":    resolved,
        "critical":    critical,
    }
