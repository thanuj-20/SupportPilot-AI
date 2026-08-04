#!/usr/bin/env bash
set -e

echo "==> Python version:"
python --version

echo "==> Step 1: Installing CPU-only PyTorch (Python 3.11 compatible)..."
pip install --no-cache-dir \
    torch==2.2.2+cpu \
    torchvision==0.17.2+cpu \
    --index-url https://download.pytorch.org/whl/cpu

echo "==> Verifying torch is CPU-only..."
python -c "import torch; print('torch:', torch.__version__); print('CUDA available:', torch.cuda.is_available())"

echo "==> Step 2: Installing remaining dependencies..."
pip install --no-cache-dir -r requirements.txt

echo "==> Verifying key imports..."
python -c "
import fastapi, motor, sklearn, sentence_transformers, faiss
print('fastapi:', fastapi.__version__)
print('sentence_transformers:', sentence_transformers.__version__)
print('faiss: OK')
print('sklearn:', sklearn.__version__)
"

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
