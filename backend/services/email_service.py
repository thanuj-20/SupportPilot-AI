"""
Email Automation Service
Stores email records in MongoDB and sends real emails via SMTP.
"""
import logging
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timezone
from dotenv import load_dotenv
from database.connection import get_db

load_dotenv()
logger = logging.getLogger(__name__)

SUPPORT_RECIPIENT = "thanuj757@gmail.com"


def _build_user_body_resolved(
    ticket_id: str,
    subject: str,
    diagnosis: dict,
    resolution: dict,
    escalation: dict,
) -> str:
    """Email sent to the user when the ticket is auto-resolved."""
    steps = resolution.get("solution_steps", [])
    steps_text = "\n".join(f"  {i+1}. {s}" for i, s in enumerate(steps)) if steps else "  No steps available."
    prevention = resolution.get("prevention_tips", [])
    prev_text  = "\n".join(f"  • {p}" for p in prevention) if prevention else "  N/A"

    return f"""Dear Customer,

Great news! Your support ticket has been resolved by our AI system.

─────────────────────────────────────────
TICKET DETAILS
─────────────────────────────────────────
Ticket ID   : {ticket_id}
Subject     : {subject}
Category    : {diagnosis['category']}
Priority    : {diagnosis['priority'].upper()}
Status      : ✅ RESOLVED

─────────────────────────────────────────
ISSUE IDENTIFIED
─────────────────────────────────────────
{resolution.get('issue', 'N/A')}

Possible Cause: {resolution.get('possible_cause', 'N/A')}

─────────────────────────────────────────
RECOMMENDED SOLUTION
─────────────────────────────────────────
{steps_text}

─────────────────────────────────────────
PREVENTION TIPS
─────────────────────────────────────────
{prev_text}

─────────────────────────────────────────
If this solution did not resolve your issue, please reply to this
email or submit a new ticket and our support team will assist you.

Thank you for using SupportPilot.

Best regards,
SupportPilot AI System
"""


def _build_user_body_processing(
    ticket_id: str,
    subject: str,
    diagnosis: dict,
    escalation: dict,
) -> str:
    """Email sent to the user when the ticket is escalated."""
    return f"""Dear Customer,

Thank you for contacting us. Your support ticket has been received
and is currently being reviewed by our {escalation['assigned_team']} team.

─────────────────────────────────────────
TICKET DETAILS
─────────────────────────────────────────
Ticket ID   : {ticket_id}
Subject     : {subject}
Category    : {diagnosis['category']}
Priority    : {diagnosis['priority'].upper()}
Status      : 🔄 IN PROGRESS
Assigned To : {escalation['assigned_team']}

─────────────────────────────────────────
WHAT HAPPENS NEXT
─────────────────────────────────────────
Our team will review your ticket and get back to you shortly.
For urgent issues, please contact support directly.

You can track your ticket status using Ticket ID: {ticket_id}

─────────────────────────────────────────
Thank you for your patience.

Best regards,
SupportPilot AI System
"""


def _build_internal_body(
    ticket_id: str,
    subject: str,
    diagnosis: dict,
    resolution: dict,
    escalation: dict,
) -> str:
    """Internal notification email for the support team."""
    steps = resolution.get("solution_steps", [])
    steps_text = "\n".join(f"  {i+1}. {s}" for i, s in enumerate(steps)) if steps else "  No steps available."
    prevention = resolution.get("prevention_tips", [])
    prev_text  = "\n".join(f"  • {p}" for p in prevention) if prevention else "  N/A"

    return f"""Dear Support Team,

A new support ticket has been processed by the SupportPilot AI system.

─────────────────────────────────────────
TICKET DETAILS
─────────────────────────────────────────
Ticket ID   : {ticket_id}
Subject     : {subject}
Category    : {diagnosis['category']}
Priority    : {diagnosis['priority'].upper()}
Severity    : {diagnosis['severity']}
Assigned To : {escalation['assigned_team']}

─────────────────────────────────────────
AI DIAGNOSIS
─────────────────────────────────────────
Issue Identified : {resolution.get('issue', 'N/A')}
Possible Cause   : {resolution.get('possible_cause', 'N/A')}
Confidence       : {resolution['confidence_label']} ({round(resolution['confidence_score']*100)}%)

─────────────────────────────────────────
RECOMMENDED SOLUTION
─────────────────────────────────────────
{steps_text}

─────────────────────────────────────────
PREVENTION TIPS
─────────────────────────────────────────
{prev_text}

─────────────────────────────────────────
RESOLUTION STATUS
─────────────────────────────────────────
Decision          : {escalation['decision']}
Resolution Status : {escalation['resolution_status']}
Reason            : {escalation['reason']}

─────────────────────────────────────────
This is an automated notification from SupportPilot AI.

Best regards,
SupportPilot AI System
"""


def _send_smtp(to: str, subject: str, body: str) -> bool:
    """Send a plain-text email via SMTP. Returns True on success."""
    host = os.getenv("SMTP_HOST")
    port = int(os.getenv("SMTP_PORT", 587))
    user = os.getenv("SMTP_USER")
    pwd  = os.getenv("SMTP_PASS")
    frm  = os.getenv("SMTP_FROM", user)

    if not all([host, user, pwd]):
        logger.warning("[Email] SMTP not configured — skipping real send")
        return False

    try:
        msg = MIMEMultipart()
        msg["From"]    = frm
        msg["To"]      = to
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain"))

        with smtplib.SMTP(host, port) as server:
            server.starttls()
            server.login(user, pwd)
            server.sendmail(user, to, msg.as_string())
        logger.info(f"[Email] SMTP sent → {to}")
        return True
    except Exception as e:
        logger.error(f"[Email] SMTP failed: {e}")
        return False


async def create_email(
    ticket_id: str,
    subject: str,
    diagnosis: dict,
    resolution: dict,
    escalation: dict,
    user_email: str | None = None,
) -> dict:
    is_resolved = escalation["decision"] == "Auto-Resolve"
    recipient   = user_email.strip() if user_email and user_email.strip() else SUPPORT_RECIPIENT

    if user_email and user_email.strip():
        # User-facing email — content depends on resolution outcome
        if is_resolved:
            email_subject = f"[SupportPilot] ✅ Your issue has been resolved — Ticket {ticket_id[:8]}"
            body = _build_user_body_resolved(ticket_id, subject, diagnosis, resolution, escalation)
        else:
            email_subject = f"[SupportPilot] 🔄 Your ticket is being processed — Ticket {ticket_id[:8]}"
            body = _build_user_body_processing(ticket_id, subject, diagnosis, escalation)
    else:
        # Internal support-team email
        email_subject = (
            f"[SupportPilot] [{escalation['decision'].upper()}] "
            f"Ticket {ticket_id[:8]} — {diagnosis['category']}"
        )
        body = _build_internal_body(ticket_id, subject, diagnosis, resolution, escalation)

    smtp_ok = _send_smtp(recipient, email_subject, body)

    doc = {
        "ticket_id":         ticket_id,
        "subject":           email_subject,
        "recipient":         recipient,
        "user_email":        user_email or None,
        "category":          diagnosis["category"],
        "priority":          diagnosis["priority"],
        "severity":          diagnosis["severity"],
        "assigned_team":     escalation["assigned_team"],
        "resolution_status": escalation["resolution_status"],
        "escalation_status": escalation["decision"],
        "confidence":        resolution["confidence_label"],
        "body":              body,
        "status":            "Sent" if smtp_ok else "Simulated",
        "sent_at":           datetime.now(timezone.utc).isoformat(),
    }

    db = get_db()
    await db["emails"].insert_one(doc)
    doc.pop("_id", None)
    logger.info(f"[Email] {'Sent' if smtp_ok else 'Simulated'} → {recipient} for ticket {ticket_id}")
    return doc


async def get_emails(skip: int = 0, limit: int = 50) -> list:
    db = get_db()
    cursor = (
        db["emails"]
        .find({}, {"_id": 0, "body": 0})
        .sort("sent_at", -1)
        .skip(skip)
        .limit(limit)
    )
    return [doc async for doc in cursor]


async def get_email_by_ticket(ticket_id: str) -> dict | None:
    db = get_db()
    return await db["emails"].find_one({"ticket_id": ticket_id}, {"_id": 0})


async def get_email_stats() -> dict:
    db  = get_db()
    col = db["emails"]
    total    = await col.count_documents({})
    sent     = await col.count_documents({"status": "Sent"})
    escalated = await col.count_documents({"escalation_status": "Escalate"})
    resolved  = await col.count_documents({"resolution_status": "Auto-Resolved"})
    return {
        "total": total,
        "sent": sent,
        "escalated": escalated,
        "auto_resolved": resolved,
    }
