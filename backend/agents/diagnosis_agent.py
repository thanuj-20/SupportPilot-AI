"""
Diagnosis Agent
Responsibility: predict Category, Priority, Severity from ticket text
using the existing ML models. Single responsibility — no side effects.
"""
import logging
from datetime import datetime, timezone
from ml.preprocessor import clean_text, generate_severity
from ml.trainer import load_model

logger = logging.getLogger(__name__)


def run(ticket_id: str, subject: str, body: str) -> dict:
    """
    Input : ticket_id, subject, body
    Output: diagnosis dict with predictions + confidence scores
    """
    text = clean_text(f"{subject} {body}".strip())

    cat_model = load_model("category")
    pri_model = load_model("priority")

    cat_proba = cat_model.predict_proba([text])[0]
    pri_proba = pri_model.predict_proba([text])[0]

    cat_idx = int(cat_proba.argmax())
    pri_idx = int(pri_proba.argmax())

    category = cat_model.classes_[cat_idx]
    priority = pri_model.classes_[pri_idx]
    severity = generate_severity(priority)

    cat_conf = round(float(cat_proba[cat_idx]), 4)
    pri_conf = round(float(pri_proba[pri_idx]), 4)

    result = {
        "agent":                "DiagnosisAgent",
        "ticket_id":            ticket_id,
        "category":             category,
        "priority":             priority,
        "severity":             severity,
        "category_confidence":  cat_conf,
        "priority_confidence":  pri_conf,
        "timestamp":            datetime.now(timezone.utc).isoformat(),
        "status":               "completed",
    }
    logger.info(f"[DiagnosisAgent] {ticket_id} → {category} / {priority} / {severity}")
    return result
