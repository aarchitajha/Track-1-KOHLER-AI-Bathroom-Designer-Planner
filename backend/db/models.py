from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, JSON, Text, LargeBinary
from sqlalchemy.orm import declarative_base
from datetime import datetime

Base = declarative_base()

class Product(Base):
    __tablename__ = "products"

    sku = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    area = Column(String, nullable=False, index=True)
    category = Column(String, nullable=False, index=True)
    sub_type = Column(String, nullable=False, index=True)
    price_inr = Column(Integer, nullable=False, index=True)
    mrp_inr = Column(Integer, nullable=True)
    discount_pct = Column(Integer, default=0)
    finish = Column(String, default="White")
    dimensions_json = Column(JSON, nullable=True)
    style_tags = Column(JSON, nullable=True)
    flow_rate_lpm = Column(Float, nullable=True)
    source_url = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    verified = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "sku": self.sku,
            "name": self.name,
            "area": self.area,
            "category": self.category,
            "sub_type": self.sub_type,
            "price_inr": self.price_inr,
            "mrp_inr": self.mrp_inr,
            "discount_pct": self.discount_pct,
            "finish": self.finish,
            "dimensions_json": self.dimensions_json or {},
            "style_tags": self.style_tags or [],
            "flow_rate_lpm": self.flow_rate_lpm,
            "source_url": self.source_url,
            "image_url": self.image_url,
            "verified": self.verified,
        }


class SketchHistory(Base):
    __tablename__ = "sketch_history"

    id = Column(String, primary_key=True, index=True)
    session_id = Column(String, nullable=False, index=True)
    filename = Column(String, nullable=False)
    content_type = Column(String, nullable=False)
    image_data = Column(LargeBinary, nullable=False)
    proposal_json = Column(JSON, nullable=False)
    bundle_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
