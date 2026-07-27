"""Utility: auto-detect dataset file from the tickets/ folder."""
import os
import pandas as pd
import logging

logger = logging.getLogger(__name__)

TICKETS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "tickets")


def find_dataset() -> str:
    """Return path to first .xlsx or .csv file found in tickets/ folder."""
    for fname in os.listdir(TICKETS_DIR):
        if fname.endswith(".xlsx") or fname.endswith(".csv"):
            path = os.path.abspath(os.path.join(TICKETS_DIR, fname))
            logger.info(f"[Dataset] Found: {path}")
            return path
    raise FileNotFoundError(f"No .xlsx or .csv file found in {TICKETS_DIR}")


def load_dataset() -> pd.DataFrame:
    path = find_dataset()
    if path.endswith(".xlsx"):
        return pd.read_excel(path)
    return pd.read_csv(path)
