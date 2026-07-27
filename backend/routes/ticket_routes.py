"""FastAPI routes."""
from fastapi import APIRouter, HTTPException, Query
from models.schemas import TicketSubmit, PredictRequest
from services.ticket_service import (
    ingest_and_train, get_all_tickets, get_ticket_by_id,
    submit_ticket, predict_ticket, get_dashboard_stats,
)

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
