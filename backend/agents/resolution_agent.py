"""
Resolution Agent
Responsibility: use retrieved chunks + existing RAG generator to produce
a structured troubleshooting response. Single responsibility.
"""
import logging
from datetime import datetime, timezone
from knowledge.rag_generator import generate_response

logger = logging.getLogger(__name__)

# Map RAG confidence label → numeric score for escalation logic
CONFIDENCE_SCORE = {"High": 0.88, "Medium": 0.60, "Low": 0.30}


def run(diagnosis: dict, retrieval: dict) -> dict:
    """
    Input : diagnosis dict, retrieval dict
    Output: resolution dict with issue, cause, steps, prevention, confidence
    """
    query  = retrieval["query"]
    chunks = retrieval["chunks"]

    rag = generate_response(query, chunks)

    # Numeric confidence for escalation agent
    conf_label  = rag.get("confidence", "Low")
    conf_score  = CONFIDENCE_SCORE.get(conf_label, 0.30)

    result = {
        "agent":            "ResolutionAgent",
        "ticket_id":        diagnosis["ticket_id"],
        "issue":            rag.get("issue", "Unknown Issue"),
        "possible_cause":   rag.get("cause", "Unknown"),
        "solution_steps":   rag.get("steps", []),
        "prevention_tips":  rag.get("prevention", []),
        "confidence_label": conf_label,
        "confidence_score": conf_score,
        "source_documents": rag.get("sources", []),
        "no_context":       rag.get("no_context", True),
        "timestamp":        datetime.now(timezone.utc).isoformat(),
        "status":           "completed",
    }
    logger.info(f"[ResolutionAgent] {diagnosis['ticket_id']} → confidence={conf_label}")
    return result
