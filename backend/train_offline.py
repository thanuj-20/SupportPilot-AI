"""Standalone script: train models AND store tickets in MongoDB."""
import sys, os, asyncio
sys.path.insert(0, os.path.dirname(__file__))

import logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

from utils.dataset_loader import load_dataset
from ml.preprocessor import preprocess
from ml.trainer import train_models
from database.connection import connect_db, close_db
from services.ticket_service import store_tickets_bulk


async def main():
    df = load_dataset()
    splits = preprocess(df)
    metrics = train_models(splits)

    print("\n[DB] Connecting to MongoDB...")
    await connect_db()
    await store_tickets_bulk(splits["clean_df"])
    await close_db()

    print("\n=== Training Complete ===")
    print(f"Category Accuracy : {metrics['category']['accuracy']}")
    print(f"Priority  Accuracy: {metrics['priority']['accuracy']}")
    print(f"Tickets stored    : {len(splits['clean_df'])}")


asyncio.run(main())
