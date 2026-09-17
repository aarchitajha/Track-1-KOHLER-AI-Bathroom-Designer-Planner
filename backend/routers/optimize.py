from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional
from backend.services.optimizer import generate_optimized_bundles

router = APIRouter(prefix="/api/optimize", tags=["Optimize"])

class OptimizeRequest(BaseModel):
    length_ft: float = Field(..., gt=4.0, le=40.0, description="Room length in feet")
    width_ft: float = Field(..., gt=4.0, le=40.0, description="Room width in feet")
    budget_inr: int = Field(..., ge=15000, le=5000000, description="Total budget in INR")
    theme: str = Field("Minimalist Modern", description="Aesthetic theme: Minimalist Modern, Classic Luxury, Japanese Zen")
    include_bathtub: bool = Field(False, description="Whether to include a bathtub if space allows")
    water_pressure: str = Field("medium", description="Water pressure: low, medium, high")
    electrical_rough_in: bool = Field(True, description="Whether 230V electrical rough-in is available")
    green_certification: str = Field("none", description="Target green building standard: none, leed, griha")
    max_flow_rate_lpm: Optional[float] = Field(None, description="Optional custom flow rate limit in LPM")
    sketch_layout: Optional[List[Dict[str, Any]]] = Field(
        None,
        description="Optional fixture zones inferred from an uploaded sketch (normalized nx/nz)"
    )

@router.post("")
def optimize_bathroom(payload: OptimizeRequest):
    """
    Computes 3 optimized bundles with 3D placements and water metrics (FR-3, FR-4).
    Enforces MEP rough-in, water pressure, and green building certification limits.
    """
    try:
        bundles_data = generate_optimized_bundles(
            length_ft=payload.length_ft,
            width_ft=payload.width_ft,
            budget_inr=payload.budget_inr,
            theme=payload.theme,
            include_bathtub=payload.include_bathtub,
            water_pressure=payload.water_pressure,
            electrical_rough_in=payload.electrical_rough_in,
            green_certification=payload.green_certification,
            max_flow_rate_lpm=payload.max_flow_rate_lpm,
            sketch_layout=payload.sketch_layout,
        )
        return bundles_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
