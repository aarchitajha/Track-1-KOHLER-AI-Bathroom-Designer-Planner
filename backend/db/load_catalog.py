"""
Kohler Catalog Database Loader.
Reads kohler_catalog.json, enriches with 3D bounding dimensions, flow rates, and style tags,
and loads into PostgreSQL / SQLite database.
"""

import json
import re
import os
from pathlib import Path
from backend.db.session import init_db, SessionLocal
from backend.db.models import Product

CATALOG_PATH = Path(__file__).resolve().parent.parent.parent / "kohler_catalog.json"

# Category 3D footprint defaults (in feet and inches) for 3D placement & collision detection
CATEGORY_DIMENSIONS = {
    "Washbasins": {
        "width_ft": 2.0,
        "depth_ft": 1.5,
        "height_ft": 0.6,
        "clearance_front_in": 21,
        "clearance_sides_in": 4,
        "wall_mounted": False
    },
    "Faucets": {
        "width_ft": 0.5,
        "depth_ft": 0.6,
        "height_ft": 0.8,
        "clearance_front_in": 0,
        "clearance_sides_in": 0,
        "wall_mounted": False
    },
    "Toilets": {
        "width_ft": 1.5,
        "depth_ft": 2.4,
        "height_ft": 2.6,
        "clearance_front_in": 24, # PRD FR-11: 24" clearance in front
        "clearance_sides_in": 15,
        "wall_mounted": False
    },
    "Bathtubs": {
        "width_ft": 5.5,
        "depth_ft": 2.8,
        "height_ft": 2.0,
        "clearance_front_in": 24,
        "clearance_sides_in": 6,
        "wall_mounted": False
    },
    "Showers": {
        "width_ft": 1.0,
        "depth_ft": 1.0,
        "height_ft": 0.5,
        "clearance_front_in": 30,
        "clearance_sides_in": 15,
        "wall_mounted": True
    },
    "Mirrors & Cabinets": {
        "width_ft": 2.2,
        "depth_ft": 0.3,
        "height_ft": 2.8,
        "clearance_front_in": 20,
        "clearance_sides_in": 0,
        "wall_mounted": True
    },
    "Bathroom Vanity": {
        "width_ft": 3.0,
        "depth_ft": 1.8,
        "height_ft": 2.8,
        "clearance_front_in": 24,
        "clearance_sides_in": 4,
        "wall_mounted": False
    }
}

def extract_flow_rate(name):
    """Extract LPM (litres per minute) flow rate for water savings calculator (FR-9)."""
    match = re.search(r"(\d+(?:\.\d+)?)\s*(?:lpm|lpf)", name, re.IGNORECASE)
    if match:
        return float(match.group(1))
    return None

def compute_style_tags(name, category, finish):
    """Assign style tags aligned with PRD aesthetic themes: Minimalist Modern, Classic Luxury, Japanese Zen."""
    tags = []
    text = f"{name} {category} {finish}".lower()
    
    # Minimalist Modern
    if any(k in text for k in ["modern", "edge", "span", "composed", "hidden drain", "wall-mount", "sleek", "rectang", "thin", "white", "black"]):
        tags.append("Minimalist Modern")
        
    # Classic Luxury
    if any(k in text for k in ["artifact", "kelston", "finial", "widespread", "memoirs", "riverbath", "whirlpool", "gold", "bronze", "abrazo", "luxury"]):
        tags.append("Classic Luxury")
        
    # Japanese Zen
    if any(k in text for k in ["zen", "oval", "conical", "innate", "smart", "round", "steam", "rain", "rainhead", "organic", "cashmere", "indigo", "vive"]):
        tags.append("Japanese Zen")
        
    # Default tag if none matched
    if not tags:
        tags.append("Minimalist Modern")
        
    return tags

def load_catalog(json_file=CATALOG_PATH):
    init_db()
    db = SessionLocal()

    if not os.path.exists(json_file):
        print(f"Error: Catalog file not found at {json_file}")
        return

    with open(json_file, "r", encoding="utf-8") as f:
        products_data = json.load(f)

    loaded_count = 0
    skipped_count = 0

    print(f"Loading products from {json_file} into database...")
    for item in products_data:
        sku = item.get("sku")
        if not sku or not item.get("verified"):
            skipped_count += 1
            continue

        cat = item.get("category", "Fixtures")
        dims = CATEGORY_DIMENSIONS.get(cat, {
            "width_ft": 2.0, "depth_ft": 2.0, "height_ft": 2.0, "clearance_front_in": 20
        }).copy()

        # Update with parsed physical dimensions if present in name (e.g. 55 cm, 180 cm)
        cm_match = re.search(r"(\d+(?:\.\d+)?)\s*cm", item.get("name", ""))
        if cm_match:
            cm_val = float(cm_match.group(1))
            dims["width_ft"] = round(cm_val / 30.48, 2)

        flow_rate = extract_flow_rate(item.get("name", ""))
        styles = compute_style_tags(item.get("name", ""), cat, item.get("finish", "White"))

        prod = Product(
            sku=sku,
            name=item.get("name"),
            area=item.get("area", "Basin Area"),
            category=cat,
            sub_type=item.get("sub_type", "General"),
            price_inr=item.get("price_inr", 0),
            mrp_inr=item.get("mrp_inr"),
            discount_pct=item.get("discount_pct", 0),
            finish=item.get("finish", "White"),
            dimensions_json=dims,
            style_tags=styles,
            flow_rate_lpm=flow_rate,
            source_url=item.get("source_url"),
            image_url=item.get("image_url"),
            verified=item.get("verified", True)
        )

        db.merge(prod)
        loaded_count += 1

    db.commit()
    db.close()

    print(f"Database sync complete!")
    print(f"  * Loaded / Updated: {loaded_count} verified products")
    print(f"  * Skipped: {skipped_count} unverified / invalid products")

if __name__ == "__main__":
    load_catalog()
