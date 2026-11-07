from pymongo import MongoClient, ASCENDING
from app.core.config import settings

class Database:
    client: MongoClient = None
    db = None

    def connect(self):
        self.client = MongoClient(settings.MONGODB_URI, serverSelectionTimeoutMS=2500, connectTimeoutMS=2500)
        self.db = self.client[settings.MONGODB_DATABASE]
        try:
            self.client.admin.command("ping")
            self.db["datasets"].create_index([("id", ASCENDING)], unique=True)
            self.db["transactions"].create_index([("dataset_id", ASCENDING), ("transaction_id", ASCENDING)])
            self.db["analyses"].create_index([("id", ASCENDING)], unique=True)
            self.db["analyses"].create_index([("dataset_id", ASCENDING), ("creation_timestamp", ASCENDING)])
            self.db["itemsets"].create_index([("analysis_id", ASCENDING)])
            self.db["rules"].create_index([("analysis_id", ASCENDING)])
        except Exception:
            self.db = None
            self.client.close()
            self.client = None

    def disconnect(self):
        if self.client:
            self.client.close()
            print("Disconnected from MongoDB")

db = Database()

def get_db():
    if db.db is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=503, detail="MongoDB is unavailable. Start MongoDB and restart the API.")
    return db.db
