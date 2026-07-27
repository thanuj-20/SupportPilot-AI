import asyncio, os
os.environ["OPENSSL_CONF"] = os.path.join(os.path.dirname(__file__), "openssl.cnf")

from dotenv import load_dotenv
load_dotenv()
from motor.motor_asyncio import AsyncIOMotorClient

async def test():
    uri = "mongodb+srv://thanuj_20:Thanuj%4020@cluster0.ofzudky.mongodb.net/?appName=Cluster0"
    client = AsyncIOMotorClient(uri, serverSelectionTimeoutMS=15000)
    try:
        info = await client.server_info()
        print("Connected! MongoDB version:", info.get("version"))
    except Exception as e:
        print("FAILED:", str(e)[:300])
    finally:
        client.close()

asyncio.run(test())
