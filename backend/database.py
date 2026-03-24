from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


def v2_col(name: str):
    return db[f"fitsiomax_v2_{name}"]


def v3_col(name: str):
    return db[f"fitsiomax_v3_{name}"]
