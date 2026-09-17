from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from backend.db.session import get_db
from backend.db.models import Product

router = APIRouter(prefix="/api/catalog", tags=["Catalog"])

@router.get("")
def get_catalog(
    category: Optional[str] = Query(None, description="Filter by category"),
    sub_type: Optional[str] = Query(None, description="Filter by sub-type"),
    area: Optional[str] = Query(None, description="Filter by area"),
    finish: Optional[str] = Query(None, description="Filter by finish/color"),
    verified_only: bool = Query(True, description="Only return verified products"),
    db: Session = Depends(get_db)
):
    """
    Returns verified Kohler products with optional filtering.
    """
    query = db.query(Product)

    if verified_only:
        query = query.filter(Product.verified == True)
    if category:
        query = query.filter(Product.category.ilike(f"%{category}%"))
    if sub_type:
        query = query.filter(Product.sub_type.ilike(f"%{sub_type}%"))
    if area:
        query = query.filter(Product.area.ilike(f"%{area}%"))
    if finish:
        query = query.filter(Product.finish.ilike(f"%{finish}%"))

    products = query.order_by(Product.price_inr.asc()).all()
    return {
        "count": len(products),
        "products": [p.to_dict() for p in products]
    }

@router.get("/{sku}")
def get_product_by_sku(sku: str, db: Session = Depends(get_db)):
    """
    Returns single product details by SKU.
    """
    prod = db.query(Product).filter(Product.sku == sku).first()
    if not prod:
        return {"error": "Product not found", "sku": sku}
    return prod.to_dict()
