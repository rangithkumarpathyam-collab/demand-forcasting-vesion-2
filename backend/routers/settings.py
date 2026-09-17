from fastapi import APIRouter
from typing import Dict, Any
from backend.database import get_db
from backend.models import SettingsUpdate

router = APIRouter(prefix="/api/settings", tags=["Settings"])

@router.get("")
def get_settings() -> Dict[str, str]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT key, value FROM settings")
    rows = cursor.fetchall()
    conn.close()
    return {r["key"]: r["value"] for r in rows}

@router.post("")
def update_settings(payload: SettingsUpdate) -> Dict[str, Any]:
    conn = get_db()
    cursor = conn.cursor()
    for k, v in payload.settings.items():
        cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (k, str(v)))
    conn.commit()
    conn.close()
    return {"status": "success", "updated_keys": list(payload.settings.keys())}
