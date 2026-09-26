import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import certifi

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")

client = AsyncIOMotorClient(MONGO_URI, tlsCAFile=certifi.where())
db = client["lexiflow"]
# Collections
contracts_collection = db["Contracts"]
clauses_collection = db["Clauses"]
playbooks_collection = db["Playbooks"]
agent_audit_logs_collection = db["Agent_Audit_Logs"]
