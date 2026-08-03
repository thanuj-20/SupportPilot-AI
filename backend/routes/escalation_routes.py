"""
Escalation Monitoring Routes — Milestone 4
GET   /api/escalations              — filtered list
GET   /api/escalations/stats        — summary stats  (MUST be before /{ticket_id})
PATCH /api/escalations/{id}/status  — update status
"""
import logging
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from services.escalation_service import (
    get_escalations, get_escalation_stats, update_escalation_status,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["Escalations"])


# stats BEFORE any path-param route
@router.get("/escalations/stats")
async def escalation_stats():
    return await get_escalation_stats()


@router.get("/escalations")
async def list_escalations(
    skip:          int = Query(0, ge=0),
    limit:         int = Query(50, le=200),
    status:        str = Query(None),
    priority:      str = Query(None),
    severity:      str = Query(None),
    category:      str = Query(None),
    assigned_team: str = Query(None),
):
    return await get_escalations(skip, limit, status, priority, severity, category, assigned_team)


class StatusUpdate(BaseModel):
    status: str


@router.patch("/escalations/{ticket_id}/status")
async def update_status(ticket_id: str, body: StatusUpdate):
    try:
        doc = await update_escalation_status(ticket_id, body.status)
        if not doc:
            raise HTTPException(status_code=404, detail="Escalation record not found")
        return doc
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
