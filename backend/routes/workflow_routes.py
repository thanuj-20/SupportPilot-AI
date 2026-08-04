"""
Workflow API Routes
POST /api/workflow/run        — run full pipeline synchronously, return complete result
GET  /api/workflow/stats      — monitoring stats  (BEFORE /{workflow_id})
GET  /api/workflow/history    — paginated history (BEFORE /{workflow_id})
GET  /api/workflow/{id}       — single result from MongoDB
GET  /api/jira/tickets
GET  /api/jira/stats
GET  /api/emails
GET  /api/emails/stats
GET  /api/integrations/status

NOTE: Workflow execution is synchronous. There is no /status polling endpoint.
The POST /run response contains the complete result including workflow_id.
"""
import asyncio
import re
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, field_validator

from agents.orchestrator import run_workflow
from services.jira_service  import create_jira_ticket, get_jira_tickets, get_jira_stats
from services.email_service import create_email, get_emails, get_email_stats, get_email_by_ticket
from services.escalation_service import save_escalation
from database.connection import get_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["Workflow"])

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


class WorkflowRequest(BaseModel):
    subject: str
    body: str
    ticket_id: str | None = None
    user_email: str | None = None

    @field_validator("user_email")
    @classmethod
    def validate_email(cls, v):
        if v and not EMAIL_RE.match(v.strip()):
            raise ValueError("Invalid email format")
        return v.strip() if v else None


@router.post("/workflow/run")
async def run_workflow_endpoint(req: WorkflowRequest):
    """Run full 4-agent pipeline synchronously, return complete result."""
    ticket_id = req.ticket_id or str(uuid.uuid4())
    logger.info(f"[Workflow] Created workflow: {ticket_id}")

    try:
        result = await asyncio.to_thread(run_workflow, ticket_id, req.subject, req.body)
    except Exception as exc:
        logger.exception(f"[Workflow] Failed: {ticket_id} {exc}")
        raise HTTPException(status_code=500, detail=str(exc))

    if result["status"] == "failed":
        logger.error(f"[Workflow] Failed: {ticket_id} {result.get('error')}")
        raise HTTPException(status_code=500, detail=result.get("error", "Workflow failed"))

    workflow_id = result["workflow_id"]
    diagnosis   = result["diagnosis"]
    resolution  = result["resolution"]
    escalation  = result["escalation"]

    logger.info(f"[Workflow] Current agent: escalation")
    logger.info(f"[Workflow] Completed: {workflow_id}")

    db  = get_db()
    now = datetime.now(timezone.utc).isoformat()

    jira  = await create_jira_ticket(ticket_id, req.subject, diagnosis, escalation)
    email = await create_email(ticket_id, req.subject, diagnosis, resolution, escalation,
                               user_email=req.user_email)
    await save_escalation(ticket_id, req.subject, diagnosis, resolution, escalation,
                          workflow_id=workflow_id)

    await db["ticket_resolutions"].update_one(
        {"ticket_id": ticket_id},
        {"$set": {
            "ticket_id": ticket_id, "workflow_id": workflow_id, "subject": req.subject,
            "category": diagnosis["category"], "priority": diagnosis["priority"],
            "severity": diagnosis["severity"],
            "issue": resolution["issue"], "possible_cause": resolution["possible_cause"],
            "solution_steps": resolution["solution_steps"],
            "prevention_tips": resolution["prevention_tips"],
            "confidence_label": resolution["confidence_label"],
            "confidence_score": resolution["confidence_score"],
            "source_documents": resolution["source_documents"],
            "decision": escalation["decision"], "assigned_team": escalation["assigned_team"],
            "total_duration_ms": result.get("total_duration_ms", 0),
            "updated_at": now,
        },
        "$setOnInsert": {"created_at": now}},
        upsert=True,
    )

    run_doc = {**result, "jira_id": jira["jira_id"], "email_sent": True}
    if "chunks" in run_doc.get("retrieval", {}):
        run_doc["retrieval"] = {k: v for k, v in run_doc["retrieval"].items() if k != "chunks"}
    await db["workflow_runs"].update_one(
        {"workflow_id": workflow_id},
        {"$set": run_doc},
        upsert=True,
    )

    return {
        **result,
        "jira":  jira,
        "email": {k: v for k, v in email.items() if k != "body"},
    }

@router.get("/workflow/stats")
async def workflow_stats():
    db = get_db()
    col = db["workflow_runs"]
    total     = await col.count_documents({})
    completed = await col.count_documents({"status": "completed"})
    failed    = await col.count_documents({"status": "failed"})

    # Use stored total_duration_ms where available, fall back to start/end diff
    pipeline = [
        {"$match": {"status": "completed"}},
        {"$project": {
            "ms": {
                "$cond": [
                    {"$gt": ["$total_duration_ms", None]},
                    "$total_duration_ms",
                    {"$cond": [
                        {"$and": [{"$gt": ["$completed_at", None]}, {"$gt": ["$started_at", None]}]},
                        {"$subtract": [
                            {"$toLong": {"$toDate": "$completed_at"}},
                            {"$toLong": {"$toDate": "$started_at"}},
                        ]},
                        None
                    ]}
                ]
            }
        }},
        {"$match": {"ms": {"$ne": None}}},
        {"$group": {"_id": None, "avg_ms": {"$avg": "$ms"}, "max_ms": {"$max": "$ms"}}},
    ]
    timing = [d async for d in col.aggregate(pipeline)]
    avg_ms = round(timing[0]["avg_ms"]) if timing else 0
    max_ms = round(timing[0]["max_ms"]) if timing else 0

    auto_resolved = await col.count_documents({"escalation.decision": "Auto-Resolve"})
    escalated     = await col.count_documents({"escalation.decision": "Escalate"})

    return {
        "total":           total,
        "completed":       completed,
        "failed":          failed,
        "auto_resolved":   auto_resolved,
        "escalated":       escalated,
        "avg_duration_ms": avg_ms,
        "max_duration_ms": max_ms,
        "success_rate":    round(completed / total * 100, 1) if total else 0,
    }


@router.get("/workflow/history")
async def workflow_history(
    skip:  int = Query(0, ge=0),
    limit: int = Query(20, le=100),
):
    db = get_db()
    cursor = (
        db["workflow_runs"]
        .find({}, {"_id": 0})
        .sort("started_at", -1)
        .skip(skip)
        .limit(limit)
    )
    return [doc async for doc in cursor]


@router.get("/workflow/{workflow_id}")
async def get_workflow(workflow_id: str):
    db  = get_db()
    doc = await db["workflow_runs"].find_one({"workflow_id": workflow_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Workflow run not found")
    return doc


# ── Jira ──────────────────────────────────────────────────────────────────────

@router.get("/jira/tickets")
async def jira_tickets(
    skip:  int = Query(0, ge=0),
    limit: int = Query(50, le=200),
):
    return await get_jira_tickets(skip, limit)


@router.get("/jira/stats")
async def jira_stats():
    return await get_jira_stats()


# ── Email ─────────────────────────────────────────────────────────────────────

@router.get("/emails")
async def emails(
    skip:  int = Query(0, ge=0),
    limit: int = Query(50, le=200),
):
    return await get_emails(skip, limit)


@router.get("/emails/stats")
async def email_stats():
    return await get_email_stats()


@router.get("/emails/ticket/{ticket_id}")
async def email_by_ticket(ticket_id: str):
    doc = await get_email_by_ticket(ticket_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Email not found")
    return doc


# ── Integration health ────────────────────────────────────────────────────────

@router.get("/integrations/status")
async def integrations_status():
    from services.escalation_service import get_escalation_stats
    jira      = await get_jira_stats()
    email     = await get_email_stats()
    esc_stats = await get_escalation_stats()

    db = get_db()
    wf_total = await db["workflow_runs"].count_documents({})
    wf_ok    = await db["workflow_runs"].count_documents({"status": "completed"})

    return {
        "workflow": {
            "total":     wf_total,
            "completed": wf_ok,
            "failed":    wf_total - wf_ok,
            "health":    "healthy" if wf_total == 0 or wf_ok / wf_total >= 0.9 else "degraded",
        },
        "jira":        {**jira,      "health": "healthy"},
        "email":       {**email,     "health": "healthy"},
        "escalations": esc_stats,
    }
