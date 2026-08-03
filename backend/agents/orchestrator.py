"""
Multi-Agent Orchestrator
Coordinates: DiagnosisAgent → RetrievalAgent → ResolutionAgent → EscalationAgent
Returns a complete workflow result with per-agent outputs and execution log.
"""
import logging
import uuid
from datetime import datetime, timezone

from agents import diagnosis_agent, retrieval_agent, resolution_agent, escalation_agent

logger = logging.getLogger(__name__)


def run_workflow(ticket_id: str, subject: str, body: str) -> dict:
    """
    Execute the full 4-agent pipeline for a ticket.
    Returns a workflow result dict consumed by the route layer.
    """
    workflow_id = str(uuid.uuid4())
    started_at  = datetime.now(timezone.utc).isoformat()
    logs        = []

    def _log(agent: str, msg: str):
        entry = {
            "agent":     agent,
            "message":   msg,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        logs.append(entry)
        logger.info(f"[Orchestrator] [{agent}] {msg}")

    try:
        # ── Step 1: Diagnosis ─────────────────────────────────────────────
        _log("DiagnosisAgent", "Starting diagnosis…")
        t0 = datetime.now(timezone.utc)
        diagnosis = diagnosis_agent.run(ticket_id, subject, body)
        t1 = datetime.now(timezone.utc)
        diagnosis["duration_ms"] = round((t1 - t0).total_seconds() * 1000)
        _log("DiagnosisAgent",
             f"Completed in {diagnosis['duration_ms']}ms — {diagnosis['category']} / {diagnosis['priority']} / {diagnosis['severity']}")

        # ── Step 2: Retrieval ─────────────────────────────────────────────
        _log("RetrievalAgent", "Searching knowledge base…")
        t0 = datetime.now(timezone.utc)
        retrieval = retrieval_agent.run(diagnosis, subject, body)
        t1 = datetime.now(timezone.utc)
        retrieval["duration_ms"] = round((t1 - t0).total_seconds() * 1000)
        _log("RetrievalAgent", f"Retrieved {len(retrieval['chunks'])} chunks in {retrieval['duration_ms']}ms")

        # ── Step 3: Resolution ────────────────────────────────────────────
        _log("ResolutionAgent", "Generating resolution…")
        t0 = datetime.now(timezone.utc)
        resolution = resolution_agent.run(diagnosis, retrieval)
        t1 = datetime.now(timezone.utc)
        resolution["duration_ms"] = round((t1 - t0).total_seconds() * 1000)
        _log("ResolutionAgent",
             f"Completed in {resolution['duration_ms']}ms — confidence={resolution['confidence_label']}, "
             f"steps={len(resolution['solution_steps'])}")

        # ── Step 4: Escalation ────────────────────────────────────────────
        _log("EscalationAgent", "Evaluating escalation…")
        t0 = datetime.now(timezone.utc)
        escalation = escalation_agent.run(diagnosis, resolution)
        t1 = datetime.now(timezone.utc)
        escalation["duration_ms"] = round((t1 - t0).total_seconds() * 1000)
        _log("EscalationAgent",
             f"Decision={escalation['decision']} → {escalation['assigned_team']} in {escalation['duration_ms']}ms")

        t_end = datetime.now(timezone.utc)
        total_ms = round((t_end - datetime.fromisoformat(started_at)).total_seconds() * 1000)
        return {
            "workflow_id":    workflow_id,
            "ticket_id":      ticket_id,
            "started_at":     started_at,
            "completed_at":   t_end.isoformat(),
            "total_duration_ms": total_ms,
            "status":         "completed",
            "diagnosis":      diagnosis,
            "retrieval":      retrieval,
            "resolution":     resolution,
            "escalation":     escalation,
            "logs":           logs,
        }

    except Exception as exc:
        _log("Orchestrator", f"ERROR: {exc}")
        logger.exception("[Orchestrator] Workflow failed")
        return {
            "workflow_id":  workflow_id,
            "ticket_id":    ticket_id,
            "started_at":   started_at,
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "status":       "failed",
            "error":        str(exc),
            "logs":         logs,
        }
