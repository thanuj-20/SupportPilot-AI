"""
Escalation Agent
Responsibility: decide whether a ticket should be auto-resolved or escalated
based on confidence score, priority, and severity. Single responsibility.
"""
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# Teams assigned per category
TEAM_MAP = {
    "Technical Support":    "L2 Technical Support",
    "IT Support":           "IT Operations",
    "Billing and Payments": "Finance & Billing",
    "Customer Service":     "Customer Success",
    "Product Support":      "Product Engineering",
    "Returns and Exchanges":"Returns & Logistics",
    "Sales and Presales":   "Sales Team",
    "Service Outages":      "Infrastructure SRE",
    "Human Resources":      "HR Department",
    "General Inquiry":      "General Support",
}

HIGH_PRIORITY   = {"critical", "high"}
HIGH_SEVERITY   = {"Critical", "High"}
CONF_THRESHOLD  = 0.80   # >80% → auto-resolve


def _assign_team(category: str) -> str:
    for key, team in TEAM_MAP.items():
        if key.lower() in category.lower():
            return team
    return "General Support"


def run(diagnosis: dict, resolution: dict) -> dict:
    """
    Input : diagnosis dict, resolution dict
    Output: escalation dict with decision + assigned team
    """
    conf        = resolution["confidence_score"]
    priority    = diagnosis["priority"].lower()
    severity    = diagnosis["severity"]
    no_context  = resolution["no_context"]

    # Escalate if: low confidence OR no KB context OR high-priority ticket
    should_escalate = (
        conf < CONF_THRESHOLD
        or no_context
        or priority in HIGH_PRIORITY
        or severity in HIGH_SEVERITY
    )

    decision       = "Escalate"   if should_escalate else "Auto-Resolve"
    resolution_status = "Escalated" if should_escalate else "Auto-Resolved"
    assigned_team  = _assign_team(diagnosis["category"])

    reason_parts = []
    if conf < CONF_THRESHOLD:
        reason_parts.append(f"confidence {round(conf*100)}% < 80%")
    if no_context:
        reason_parts.append("no KB context found")
    if priority in HIGH_PRIORITY:
        reason_parts.append(f"priority={priority}")
    if severity in HIGH_SEVERITY:
        reason_parts.append(f"severity={severity}")
    if not reason_parts:
        reason_parts.append(f"confidence {round(conf*100)}% ≥ 80%")

    result = {
        "agent":             "EscalationAgent",
        "ticket_id":         diagnosis["ticket_id"],
        "decision":          decision,
        "resolution_status": resolution_status,
        "assigned_team":     assigned_team,
        "reason":            ", ".join(reason_parts),
        "confidence_score":  conf,
        "timestamp":         datetime.now(timezone.utc).isoformat(),
        "status":            "completed",
    }
    logger.info(f"[EscalationAgent] {diagnosis['ticket_id']} → {decision} ({assigned_team})")
    return result
