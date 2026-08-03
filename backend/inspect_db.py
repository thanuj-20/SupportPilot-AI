import asyncio, os, sys
sys.path.insert(0, os.path.dirname(__file__))
os.environ["OPENSSL_CONF"] = os.path.join(os.path.dirname(__file__), "openssl.cnf")
from dotenv import load_dotenv
load_dotenv()
from database.connection import connect_db, get_db

async def inspect():
    await connect_db()
    db = get_db()

    cols = ['workflow_runs', 'escalations', 'jira_tickets', 'emails', 'ticket_resolutions', 'tickets']
    print("=== Collection Counts ===")
    for c in cols:
        n = await db[c].count_documents({})
        print(f"  {c}: {n}")

    print("\n=== workflow_runs sample (no logs/retrieval) ===")
    wf = await db['workflow_runs'].find_one({}, {'_id': 0, 'logs': 0, 'retrieval': 0, 'diagnosis': 0, 'resolution': 0})
    if wf:
        print("  keys:", sorted(wf.keys()))
        print("  escalation.decision:", wf.get('escalation', {}).get('decision', 'MISSING'))
        print("  status:", wf.get('status'))
        print("  total_duration_ms:", wf.get('total_duration_ms'))
    else:
        print("  EMPTY")

    print("\n=== escalations sample ===")
    esc = await db['escalations'].find_one({}, {'_id': 0})
    print(" ", esc if esc else "EMPTY")

    print("\n=== jira_tickets sample ===")
    jira = await db['jira_tickets'].find_one({}, {'_id': 0, 'title': 0})
    print(" ", jira if jira else "EMPTY")

    print("\n=== emails sample ===")
    email = await db['emails'].find_one({}, {'_id': 0, 'body': 0})
    print(" ", email if email else "EMPTY")

    print("\n=== ticket_resolutions sample ===")
    res = await db['ticket_resolutions'].find_one({}, {'_id': 0})
    if res:
        print("  keys:", sorted(res.keys()))
    else:
        print("  EMPTY")

    # Check if workflow_runs have workflow_id field
    print("\n=== workflow_runs field check ===")
    wf_with_id = await db['workflow_runs'].count_documents({"workflow_id": {"$exists": True}})
    wf_with_esc = await db['workflow_runs'].count_documents({"escalation.decision": {"$exists": True}})
    print(f"  with workflow_id: {wf_with_id}")
    print(f"  with escalation.decision: {wf_with_esc}")

asyncio.run(inspect())
