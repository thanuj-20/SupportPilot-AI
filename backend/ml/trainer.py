"""
Train TF-IDF + LogisticRegression pipelines for category and priority prediction.
"""
import os
import json
import logging
import joblib
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, confusion_matrix, classification_report,
)

logger = logging.getLogger(__name__)

MODELS_DIR = os.path.join(os.path.dirname(__file__), "saved_models")
os.makedirs(MODELS_DIR, exist_ok=True)


def _build_pipeline() -> Pipeline:
    return Pipeline([
        ("tfidf", TfidfVectorizer(
            max_features=20000,
            ngram_range=(1, 2),
            sublinear_tf=True,
            min_df=2,
        )),
        ("clf", LogisticRegression(
            max_iter=1000,
            class_weight="balanced",
            random_state=42,
            C=5.0,
        )),
    ])


def _evaluate(model, X_test, y_test, label: str) -> dict:
    y_pred = model.predict(X_test)
    metrics = {
        "accuracy":  round(accuracy_score(y_test, y_pred), 4),
        "precision": round(precision_score(y_test, y_pred, average="weighted", zero_division=0), 4),
        "recall":    round(recall_score(y_test, y_pred, average="weighted", zero_division=0), 4),
        "f1":        round(f1_score(y_test, y_pred, average="weighted", zero_division=0), 4),
        "confusion_matrix": confusion_matrix(y_test, y_pred).tolist(),
        "classes": model.classes_.tolist(),
        "classification_report": classification_report(y_test, y_pred, zero_division=0),
    }
    logger.info(f"[{label}] Accuracy={metrics['accuracy']}  F1={metrics['f1']}")
    print(f"\n[{label}] Accuracy={metrics['accuracy']}  F1={metrics['f1']}")
    print(metrics["classification_report"])
    return metrics


def train_models(splits: dict) -> dict:
    cat_model = _build_pipeline()
    cat_model.fit(splits["X_train_cat"], splits["y_train_cat"])
    cat_metrics = _evaluate(cat_model, splits["X_test_cat"], splits["y_test_cat"], "CategoryModel")
    joblib.dump(cat_model, os.path.join(MODELS_DIR, "category_model.pkl"))

    pri_model = _build_pipeline()
    pri_model.fit(splits["X_train_pri"], splits["y_train_pri"])
    pri_metrics = _evaluate(pri_model, splits["X_test_pri"], splits["y_test_pri"], "PriorityModel")
    joblib.dump(pri_model, os.path.join(MODELS_DIR, "priority_model.pkl"))

    all_metrics = {"category": cat_metrics, "priority": pri_metrics}
    with open(os.path.join(MODELS_DIR, "metrics.json"), "w") as f:
        json.dump(all_metrics, f, indent=2)

    logger.info("[Trainer] Models saved.")
    return all_metrics


def load_model(name: str):
    path = os.path.join(MODELS_DIR, f"{name}_model.pkl")
    if not os.path.exists(path):
        raise FileNotFoundError(f"Model not found: {path}. Run POST /api/train first.")
    return joblib.load(path)


def load_metrics() -> dict:
    path = os.path.join(MODELS_DIR, "metrics.json")
    if not os.path.exists(path):
        return {}
    with open(path) as f:
        return json.load(f)
