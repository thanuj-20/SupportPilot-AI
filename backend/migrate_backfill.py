"""
One-time migration: backfill escalation records from existing workflow_runs.

For each workflow_run where escalation.decision == "Escalate" and no
escalation record exists for that ticket_id, create the missing record
using data already stored in the workflow_run document.

Safe to run multiple times — uses upsert on ticket_id.
Run: python migrate_backfill.py
"""
import asyncio, os, sys
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault("OPENSSL_CONF", os.path.join(os.path.dirname(__file__), "openssl.cnf"))
from dotenv import load_dotenv
load_dotenv()
from database.connection import connect_db, get_db
from datetime import datetime, timezone


async def backfill():
    await connect_db()
    db = get_db()

    wf_col  = db["workflow_runs"]
    esc_col = db["escalations"]
    res_col = db["ticket_resolutions"]

    # ── 1. Backfill escalations ───────────────────────────────────────────────
    print("\n[1] Backfilling escalations from workflow_runs...")
    cursor = wf_col.find({"escalation.decision": "Escalate"})
    created = skipped = 0

    async for wf in cursor:
        tid = wf.get("ticket_id")
        if not tid:
            continue

        # Check if escalation already exists
        existing = await esc_col.find_one({"ticket_id": tid})
        if existing:
            skipped += 1
            continue

        esc  = wf.get("escalation", {})
        diag = wf.get("diagnosis", {})
        reso = wf.get("resolution", {})
        now  = wf.get("completed_at") or datetime.now(timezone.utc).isoformat()

        # Only create if we have enough data
        if not esc.get("assigned_team"):
            print(f"  SKIP {tid[:8]} — missing assigned_team in escalation")
            skipped += 1
            continue

        doc = {
            "ticket_id":        tid,
            "workflow_id":      wf.get("workflow_id"),
            "subject":          wf.get("subject", "")[:200],
            "category":         diag.get("category", esc.get("category", "Unknown")),
            "priority":         diag.get("priority", "medium"),
            "severity":         diag.get("severity", "Medium"),
            "confidence":       reso.get("confidence_label", "Low"),
            "confidence_score": reso.get("confidence_score", 0.0),
            "reason":           esc.get("reason", "Escalated by agent"),
            "assigned_team":    esc.get("assigned_team"),
            "updated_at":       now,
        }

        await esc_col.update_one(
            {"ticket_id": tid},
            {
                "$set":         doc,
                "$setOnInsert": {"status": "Escalated", "created_at": now},
            },
            upsert=True,
        )
        created += 1
        print(f"  CREATED escalation for ticket {tid[:8]} — team={doc['assigned_team']}")

    print(f"  Escalations: {created} created, {skipped} skipped (already existed or missing data)")

    # ── 2. Backfill ticket_resolutions ────────────────────────────────────────
    print("\n[2] Backfilling ticket_resolutions from workflow_runs...")
    cursor = wf_col.find({"status": "completed"})
    res_created = res_skipped = 0

    async for wf in cursor:
        tid = wf.get("ticket_id")
        if not tid:
            continue

        existing = await res_col.find_one({"ticket_id": tid})
        if existing:
            res_skipped += 1
            continue

        esc  = wf.get("escalation", {})
        diag = wf.get("diagnosis", {})
        reso = wf.get("resolution", {})
        now  = wf.get("completed_at") or datetime.now(timezone.utc).isoformat()

        doc = {
            "ticket_id":        tid,
            "workflow_id":      wf.get("workflow_id"),
            "subject":          wf.get("subject", ""),
            "category":         diag.get("category", ""),
            "priority":         diag.get("priority", ""),
            "severity":         diag.get("severity", ""),
            "issue":            reso.get("issue", ""),
            "possible_cause":   reso.get("possible_cause", ""),
            "solution_steps":   reso.get("solution_steps", []),
            "prevention_tips":  reso.get("prevention_tips", []),
            "confidence_label": reso.get("confidence_label", ""),
            "confidence_score": reso.get("confidence_score", 0.0),
            "source_documents": reso.get("source_documents", []),
            "decision":         esc.get("decision", ""),
            "assigned_team":    esc.get("assigned_team", ""),
            "total_duration_ms": wf.get("total_duration_ms", 0),
            "created_at":       now,
            "updated_at":       now,
        }

        await res_col.update_one(
            {"ticket_id": tid},
            {"$set": doc},
            upsert=True,
        )
        res_created += 1
        print(f"  CREATED resolution for ticket {tid[:8]}")

    print(f"  Resolutions: {res_created} created, {res_skipped} skipped")

    # ── 3. Final counts ───────────────────────────────────────────────────────
    print("\n[3] Final collection counts:")
    for col_name in ["workflow_runs", "escalations", "jira_tickets", "emails", "ticket_resolutions"]:
        n = await db[col_name].count_documents({})
        print(f"  {col_name}: {n}")

    print("\nMigration complete.")


asyncio.run(backfill())
