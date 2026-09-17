from fastapi import APIRouter
from typing import Dict, Any
from backend.models import ChatMessage
from backend.services.assistant_service import process_assistant_query

router = APIRouter(prefix="/api/assistant", tags=["AI Assistant"])

@router.post("/chat")
def chat_with_assistant(payload: ChatMessage) -> Dict[str, Any]:
    reply = process_assistant_query(payload.message)
    return {
        "role": "bot",
        "reply": reply
    }
