import base64
from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from backend.db.models import SketchHistory
from backend.db.session import SessionLocal

router = APIRouter(prefix="/api/sketch-history", tags=["Sketch History"])


class BundleUpdate(BaseModel):
    bundle: Dict[str, Any]


def _serialize(item: SketchHistory) -> dict:
    image = base64.b64encode(item.image_data).decode("ascii")
    return {
        "id": item.id,
        "session_id": item.session_id,
        "filename": item.filename,
        "content_type": item.content_type,
        "image_url": f"data:{item.content_type};base64,{image}",
        "proposal": item.proposal_json,
        "bundle": item.bundle_json,
        "created_at": item.created_at.isoformat(),
        "updated_at": item.updated_at.isoformat(),
    }


@router.get("")
def list_sketch_history(session_id: str = Query(..., min_length=1)) -> List[dict]:
    db = SessionLocal()
    try:
        items = db.query(SketchHistory).filter(
            SketchHistory.session_id == session_id
        ).order_by(SketchHistory.created_at.desc()).all()
        return [_serialize(item) for item in items]
    finally:
        db.close()


@router.put("/{history_id}/bundle")
def save_sketch_bundle(history_id: str, payload: BundleUpdate):
    db = SessionLocal()
    try:
        item = db.query(SketchHistory).filter(SketchHistory.id == history_id).first()
        if not item:
            raise HTTPException(status_code=404, detail="Sketch history entry not found")
        item.bundle_json = payload.bundle
        db.commit()
        return {"id": item.id, "bundle": item.bundle_json}
    finally:
        db.close()


@router.delete("")
def delete_all_sketch_history(session_id: str = Query(..., min_length=1)):
    db = SessionLocal()
    try:
        count = db.query(SketchHistory).filter(
            SketchHistory.session_id == session_id
        ).delete()
        db.commit()
        return {"deleted_count": count, "session_id": session_id}
    finally:
        db.close()


@router.delete("/{history_id}")
def delete_sketch_history(history_id: str, session_id: str = Query(..., min_length=1)):
    db = SessionLocal()
    try:
        item = db.query(SketchHistory).filter(
            SketchHistory.id == history_id,
            SketchHistory.session_id == session_id,
        ).first()
        if not item:
            raise HTTPException(status_code=404, detail="Sketch history entry not found")
        db.delete(item)
        db.commit()
        return {"deleted": history_id}
    finally:
        db.close()