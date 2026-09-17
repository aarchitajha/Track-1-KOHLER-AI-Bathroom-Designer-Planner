from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from backend.services.llm import process_chat_message

router = APIRouter(prefix="/api/chat", tags=["Chat"])

class ChatRequest(BaseModel):
    session_id: str
    message: str
    active_bundle: Optional[dict] = None
    current_params: Optional[dict] = None

@router.post("")
async def chat_interaction(payload: ChatRequest):
    """
    Conversational turn with tool calling (FR-6, FR-7, FR-8).
    """
    try:
        response = await process_chat_message(
            payload.session_id,
            payload.message,
            active_bundle=payload.active_bundle,
            current_params=payload.current_params
        )
        return response
    except TimeoutError:
        raise HTTPException(
            status_code=504,
            detail="Ollama did not respond within 30 seconds. The local model may be overloaded; please try again or use a smaller model."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
