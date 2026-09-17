from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel
from typing import Dict, Any
from backend.services.pdf_export import generate_pdf_quote

router = APIRouter(prefix="/api/export", tags=["Export"])

class ExportQuoteRequest(BaseModel):
    bundle: Dict[str, Any]
    room_specs: Dict[str, Any]

@router.post("")
def export_quote_pdf(payload: ExportQuoteRequest):
    """
    Generates downloadable PDF quote with itemized pricing & water-savings badge (FR-15).
    """
    try:
        pdf_bytes = generate_pdf_quote(payload.bundle, payload.room_specs)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=Kohler_Bathroom_Design_Quote.pdf"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
