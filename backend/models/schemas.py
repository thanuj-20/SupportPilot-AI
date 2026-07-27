"""Pydantic models for API request/response."""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class TicketSubmit(BaseModel):
    subject: str
    body: str


class PredictRequest(BaseModel):
    subject: Optional[str] = ""
    body: str


class PredictResponse(BaseModel):
    category: str
    priority: str
    severity: str
    category_confidence: float
    priority_confidence: float


class TicketOut(BaseModel):
    ticket_id: str
    subject: str
    body: str
    category: str
    priority: str
    severity: str
    status: str
    created_at: Optional[str] = None
