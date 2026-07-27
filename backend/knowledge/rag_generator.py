"""
RAG Generator — converts retrieved FAISS chunks into a structured
troubleshooting response using rule-based context analysis.
No external LLM calls. Operates entirely on retrieved knowledge base content.
"""
import re
from collections import Counter

# ── Keyword maps for issue detection ─────────────────────────────────────────

ISSUE_PATTERNS = [
    (r"\bvpn\b",                          "VPN Connection Failure"),
    (r"\bnetwork|connectivity|internet\b","Network Connectivity Issue"),
    (r"\bserver.*(overheat|heat|temp)\b", "Server Overheating"),
    (r"\bcloud|saas|platform\b",          "Cloud/SaaS Platform Disruption"),
    (r"\bquickbooks|login|sign.?in\b",    "Application Login Failure"),
    (r"\bbilling|invoice|payment\b",      "Billing or Payment Issue"),
    (r"\breturn|exchange|refund\b",       "Return or Exchange Request"),
    (r"\boutage|maintenance|downtime\b",  "Service Outage or Maintenance"),
    (r"\bpassword|credential|auth\b",     "Authentication Failure"),
    (r"\bsoftware|install|update|patch\b","Software Installation or Update Issue"),
    (r"\bhardware|device|printer|fan\b",  "Hardware Malfunction"),
    (r"\bemail|outlook|mail\b",           "Email Service Issue"),
    (r"\bslow|performance|lag|freeze\b",  "Performance Degradation"),
    (r"\bsales|quote|pricing|purchase\b", "Sales or Pre-Sales Inquiry"),
    (r"\bhr|leave|payroll|employee\b",    "HR or Payroll Issue"),
]

CAUSE_PATTERNS = [
    (r"\bfirewall|block|port\b",          "Firewall rules may be blocking required ports."),
    (r"\bfirmware|outdated|version\b",    "Outdated firmware or software version."),
    (r"\bip.conflict|dhcp\b",             "IP address conflict or DHCP misconfiguration."),
    (r"\bcredential|password|auth\b",     "Authentication failure or incorrect credentials."),
    (r"\bcache|cookie|browser\b",         "Corrupted browser cache or session data."),
    (r"\bnetwork|connectivity|internet\b","Unstable or interrupted network connection."),
    (r"\bheat|temp|fan|cooling\b",        "Cooling system failure causing thermal buildup."),
    (r"\bcloud|saas|vendor\b",            "Third-party platform or vendor-side incident."),
    (r"\bconfig|setting|gateway\b",       "Misconfigured network or application settings."),
    (r"\bpayment|billing|charge\b",       "Billing system error or payment processing failure."),
]

PREVENTION_PATTERNS = [
    (r"\bvpn\b",          ["Keep VPN client software up to date.", "Use a stable internet connection before connecting to VPN."]),
    (r"\bnetwork\b",      ["Perform regular network equipment maintenance.", "Monitor network health with alerting tools."]),
    (r"\bserver|heat\b",  ["Schedule regular hardware inspections.", "Maintain proper airflow and cooling in server rooms."]),
    (r"\bpassword|auth\b",["Use a password manager and enable MFA.", "Rotate credentials periodically."]),
    (r"\bcloud|saas\b",   ["Subscribe to vendor status page notifications.", "Maintain a business continuity plan for SaaS outages."]),
    (r"\bbilling\b",      ["Set up automatic payment reminders.", "Review invoices promptly each billing cycle."]),
    (r"\bsoftware|update\b", ["Enable automatic updates where possible.", "Test updates in a staging environment before production."]),
]

DEFAULT_PREVENTION = [
    "Document recurring issues for pattern analysis.",
    "Keep all software and firmware up to date.",
]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _match(text: str, pattern: str) -> bool:
    return bool(re.search(pattern, text, re.IGNORECASE))


def _detect_issue(query: str, context: str) -> str:
    combined = f"{query} {context}"
    for pattern, label in ISSUE_PATTERNS:
        if _match(combined, pattern):
            return label
    # Fallback: capitalise query
    return query.strip().title()


def _detect_cause(query: str, context: str) -> str:
    combined = f"{query} {context}"
    for pattern, cause in CAUSE_PATTERNS:
        if _match(combined, pattern):
            return cause
    return "The root cause could not be determined from the available knowledge base."


def _extract_steps(context: str) -> list[str]:
    """Extract numbered resolution steps from retrieved text."""
    steps = re.findall(r"(?:^|\n)\s*\d+\.\s+(.+)", context)
    # Deduplicate while preserving order
    seen, unique = set(), []
    for s in steps:
        s = s.strip()
        if s and s.lower() not in seen:
            seen.add(s.lower())
            unique.append(s)
    return unique[:6]  # cap at 6 steps


def _extract_prevention(query: str, context: str) -> list[str]:
    combined = f"{query} {context}"
    for pattern, tips in PREVENTION_PATTERNS:
        if _match(combined, pattern):
            return tips
    return DEFAULT_PREVENTION


def _score_confidence(chunks: list[dict]) -> str:
    if not chunks:
        return "Low"
    top_score = chunks[0]["score"]
    if top_score >= 0.72:
        return "High"
    if top_score >= 0.50:
        return "Medium"
    return "Low"


def _unique_sources(chunks: list[dict]) -> list[str]:
    seen, sources = set(), []
    for c in chunks:
        fn = c["filename"]
        if fn not in seen:
            seen.add(fn)
            sources.append(fn)
    return sources


# ── Public API ────────────────────────────────────────────────────────────────

NO_CONTEXT_RESPONSE = {
    "issue":       "No Relevant Information Found",
    "cause":       "N/A",
    "steps":       [],
    "prevention":  [],
    "confidence":  "Low",
    "sources":     [],
    "raw_chunks":  [],
    "no_context":  True,
}


def generate_response(query: str, chunks: list[dict]) -> dict:
    """
    Given a user query and retrieved FAISS chunks, produce a structured
    troubleshooting response using only the retrieved context.
    """
    if not chunks:
        return {**NO_CONTEXT_RESPONSE}

    # Build merged context from top chunks (ranked by score, already sorted)
    context = "\n\n".join(c["text"] for c in chunks)

    issue      = _detect_issue(query, context)
    cause      = _detect_cause(query, context)
    steps      = _extract_steps(context)
    prevention = _extract_prevention(query, context)
    confidence = _score_confidence(chunks)
    sources    = _unique_sources(chunks)

    # If no actionable steps found, surface a generic fallback from context
    if not steps:
        # Try bullet points
        bullets = re.findall(r"(?:^|\n)\s*[-•]\s+(.+)", context)
        steps = [b.strip() for b in bullets[:5] if b.strip()]

    if not steps:
        return {**NO_CONTEXT_RESPONSE}

    return {
        "issue":      issue,
        "cause":      cause,
        "steps":      steps,
        "prevention": prevention,
        "confidence": confidence,
        "sources":    sources,
        "raw_chunks": chunks,
        "no_context": False,
    }
