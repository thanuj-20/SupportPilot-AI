"""
Preprocessing pipeline — auto-detects columns from any IT support dataset.
Maps: Body→text_input, Department→category, Priority→priority
Generates Severity from Priority if not present.
"""
import re
import logging
import pandas as pd
from sklearn.model_selection import train_test_split

logger = logging.getLogger(__name__)

# Priority → Severity mapping
PRIORITY_SEVERITY = {
    "critical": "Critical",
    "high":     "High",
    "medium":   "Medium",
    "low":      "Low",
}

# Flexible column detection: canonical_name → list of possible raw names
COL_CANDIDATES = {
    "text_input":  ["Body", "body", "Description", "description", "Ticket Description",
                    "Ticket Body", "Message", "Content", "text"],
    "ticket_type": ["Department", "department", "Category", "category", "Ticket Type",
                    "Type", "Issue Type", "team"],
    "priority":    ["Priority", "priority", "Ticket Priority", "urgency"],
    "severity":    ["Severity", "severity"],
    "subject":     ["Subject", "subject", "Title", "title", "Ticket Subject"],
    "status":      ["Status", "status", "Ticket Status"],
    "ticket_id":   ["Ticket ID", "ticket_id", "id", "ID", "Unnamed: 0"],
}

# Columns to always drop
DROP_COLS = {"Unnamed: 0", "Tags", "tags"}


def _find_col(df: pd.DataFrame, key: str):
    for c in COL_CANDIDATES[key]:
        if c in df.columns:
            return c
    return None


def clean_text(text) -> str:
    if not isinstance(text, str):
        return ""
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s.,!?'-]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def generate_severity(priority: str) -> str:
    return PRIORITY_SEVERITY.get(str(priority).strip().lower(), "Medium")


def preprocess(df: pd.DataFrame) -> dict:
    # Drop junk columns
    df = df.drop(columns=[c for c in DROP_COLS if c in df.columns], errors="ignore")

    logger.info(f"[Preprocess] Detected columns: {df.columns.tolist()}")
    print(f"[Preprocess] Detected columns: {df.columns.tolist()}")

    # Resolve required columns
    text_col  = _find_col(df, "text_input")
    cat_col   = _find_col(df, "ticket_type")
    pri_col   = _find_col(df, "priority")
    sev_col   = _find_col(df, "severity")
    subj_col  = _find_col(df, "subject")
    stat_col  = _find_col(df, "status")

    missing = [k for k, v in {"text_input": text_col, "ticket_type": cat_col, "priority": pri_col}.items() if v is None]
    if missing:
        raise ValueError(f"[Preprocess] Required columns not found: {missing}. Available: {df.columns.tolist()}")

    # Build standardised DataFrame
    clean = pd.DataFrame()
    clean["text_input"]  = df[text_col].apply(clean_text)
    clean["ticket_type"] = df[cat_col].astype(str).str.strip()
    clean["priority"]    = df[pri_col].astype(str).str.strip().str.lower()
    clean["subject"]     = df[subj_col].astype(str).str.strip() if subj_col else ""
    clean["status"]      = df[stat_col].astype(str).str.strip() if stat_col else "Open"

    # Generate severity
    if sev_col:
        clean["severity"] = df[sev_col].astype(str).str.strip()
    else:
        clean["severity"] = clean["priority"].apply(generate_severity)
        logger.info("[Preprocess] Severity column not found — generated from Priority.")

    # Drop duplicates and nulls
    before = len(clean)
    clean = clean.drop_duplicates()
    clean = clean.dropna(subset=["text_input", "ticket_type", "priority"])
    clean = clean[clean["text_input"].str.len() > 5]
    logger.info(f"[Preprocess] Dropped {before - len(clean)} rows. Final shape: {clean.shape}")
    print(f"[Preprocess] Categories: {clean['ticket_type'].unique().tolist()}")
    print(f"[Preprocess] Priorities: {clean['priority'].unique().tolist()}")
    print(f"[Preprocess] Severities: {clean['severity'].unique().tolist()}")

    X = clean["text_input"]
    y_cat = clean["ticket_type"]
    y_pri = clean["priority"]

    X_train_cat, X_test_cat, y_train_cat, y_test_cat = train_test_split(
        X, y_cat, test_size=0.2, random_state=42, stratify=y_cat
    )
    X_train_pri, X_test_pri, y_train_pri, y_test_pri = train_test_split(
        X, y_pri, test_size=0.2, random_state=42, stratify=y_pri
    )

    return {
        "clean_df": clean,
        "X_train_cat": X_train_cat, "X_test_cat": X_test_cat,
        "y_train_cat": y_train_cat, "y_test_cat": y_test_cat,
        "X_train_pri": X_train_pri, "X_test_pri": X_test_pri,
        "y_train_pri": y_train_pri, "y_test_pri": y_test_pri,
    }
