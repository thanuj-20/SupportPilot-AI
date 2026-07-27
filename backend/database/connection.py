"""MongoDB async client using Motor."""
import os
from urllib.parse import quote_plus
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

# Build URI safely — re-encode password if it contains special chars
_raw_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "supportpilot")

# If the URI has a plaintext @ in password (common mistake), fix it.
# We store the URI with %40 in .env; pymongo needs it as-is from the raw string.
# dotenv does NOT decode percent-encoding, so %40 stays as %40 — which pymongo
# then tries to decode itself and fails. Solution: decode once then re-encode.
def _fix_uri(uri: str) -> str:
    from urllib.parse import urlparse, urlunparse, quote, unquote
    # Only fix if it's an SRV or standard mongo URI with credentials
    if "@" not in uri:
        return uri
    # Split on the last @ to separate credentials from host
    scheme_creds, rest = uri.rsplit("@", 1)
    scheme, creds = scheme_creds.split("://", 1)
    if ":" in creds:
        user, password = creds.split(":", 1)
        # Decode any existing percent-encoding then re-encode properly
        password = quote_plus(unquote(password))
        user = quote_plus(unquote(user))
        return f"{scheme}://{user}:{password}@{rest}"
    return uri


MONGO_URI = _fix_uri(_raw_uri)

client: AsyncIOMotorClient = None


async def connect_db():
    global client
    client = AsyncIOMotorClient(MONGO_URI, serverSelectionTimeoutMS=20000)
    # Ping to confirm connection
    await client.admin.command("ping")
    print(f"[DB] Connected to MongoDB: {DB_NAME}")


async def close_db():
    global client
    if client:
        client.close()


def get_db():
    return client[DB_NAME]
