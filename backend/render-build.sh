#!/usr/bin/env bash
set -e

pip install -r requirements.txt

echo "Training ML models..."
python train_offline.py

echo "Indexing knowledge base..."
python index_knowledge.py

echo "Build complete."
