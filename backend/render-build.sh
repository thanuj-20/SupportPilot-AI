#!/usr/bin/env bash
set -e

echo "==> Installing dependencies (CPU-only PyTorch)..."
pip install --no-cache-dir -r requirements.txt

echo "==> Checking ML models..."
if [ -f "ml/saved_models/category_model.pkl" ] && [ -f "ml/saved_models/priority_model.pkl" ]; then
    echo "==> ML models found — skipping training."
else
    echo "==> ML models not found — training now..."
    python train_offline.py
fi

echo "==> Checking FAISS index..."
if [ -f "knowledge/faiss_store/index.faiss" ] && [ -f "knowledge/faiss_store/metadata.pkl" ]; then
    echo "==> FAISS index found — skipping indexing."
else
    echo "==> FAISS index not found — building now..."
    python index_knowledge.py
fi

echo "==> Build complete."
