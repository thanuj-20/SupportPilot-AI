#!/usr/bin/env bash
set -e

echo "==> Python version check:"
python --version

echo "==> Step 1: Upgrade pip"
pip install --no-cache-dir --upgrade pip

echo "==> Step 2: Install CPU-only PyTorch first (prevents CUDA pull by sentence-transformers)"
pip install --no-cache-dir \
    "torch==2.2.2+cpu" \
    "torchaudio==2.2.2+cpu" \
    --index-url https://download.pytorch.org/whl/cpu

echo "==> Step 3: Verify torch is CPU-only"
python -c "import torch; assert not torch.cuda.is_available(), 'CUDA found!'; print('torch', torch.__version__, '— CPU only OK')"

echo "==> Step 4: Install remaining dependencies"
pip install --no-cache-dir -r requirements.txt

echo "==> Step 5: Verify all key imports"
python -c "
import fastapi, uvicorn, motor, pymongo
import sklearn, joblib, pandas, numpy
import sentence_transformers, faiss
import torch
print('fastapi', fastapi.__version__)
print('sentence_transformers', sentence_transformers.__version__)
print('torch', torch.__version__)
print('faiss OK')
print('sklearn', sklearn.__version__)
print('All imports OK')
"

echo "==> Step 6: Check ML models (skip training if committed artifacts exist)"
if [ -f "ml/saved_models/category_model.pkl" ] && [ -f "ml/saved_models/priority_model.pkl" ]; then
    echo "==> ML models found — skipping training."
else
    echo "==> ML models not found — training now..."
    python train_offline.py
fi

echo "==> Step 7: Check FAISS index (skip indexing if committed index exists)"
if [ -f "knowledge/faiss_store/index.faiss" ] && [ -f "knowledge/faiss_store/metadata.pkl" ]; then
    echo "==> FAISS index found — skipping indexing."
else
    echo "==> FAISS index not found — building now..."
    python index_knowledge.py
fi

echo "==> Build complete."
