-- KOHLER AI Bathroom Designer - PostgreSQL Schema
-- Specified in PRD §7.3

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS products (
    sku             TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    area            TEXT NOT NULL,
    category        TEXT NOT NULL,
    sub_type        TEXT NOT NULL,
    price_inr       INTEGER NOT NULL,
    mrp_inr         INTEGER,
    discount_pct    INTEGER DEFAULT 0,
    finish          TEXT DEFAULT 'White',
    dimensions_json JSONB,
    style_tags      TEXT[],
    flow_rate_lpm   FLOAT,
    source_url      TEXT,
    image_url       TEXT,
    verified        BOOLEAN DEFAULT FALSE,
    embedding_vector VECTOR(1536),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_sub_type ON products(sub_type);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price_inr);
CREATE INDEX IF NOT EXISTS idx_products_verified ON products(verified);
