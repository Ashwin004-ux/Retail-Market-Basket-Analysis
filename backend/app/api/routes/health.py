from fastapi import APIRouter
from app.core.database import db

router = APIRouter()

@router.get("/health")
def check_health():
    try:
        if db.client is None:
            raise RuntimeError("not connected")
        db.client.admin.command("ping")
        return {"status": "ok", "database": "connected"}
    except Exception:
        return {"status": "degraded", "database": "unavailable", "message": "API is running but MongoDB is unavailable."}
