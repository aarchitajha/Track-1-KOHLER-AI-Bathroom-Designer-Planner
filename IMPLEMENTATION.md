# KOHLER AI Bathroom Designer & Planner
## Comprehensive Implementation & Technical Architecture Report

**Competition Track:** Track 1 — AI Bathroom Designer & Planner  
**Status:** Complete & Production-Ready Build  
**Date:** September 2026

---

## 1. Project Overview

The **KOHLER AI Bathroom Designer & Planner** is an interactive, enterprise-grade spatial design assistant developed for the Kohler AI Case Study Competition. The application solves the complex multi-constraint problem of residential bathroom planning by coupling authentic Kohler India product catalog data (real SKUs, verified prices, physical dimensions, and MEP constraints) with an intelligent multi-constraint optimization engine, real-time procedural 3D visualization, 2D architectural CAD floor planning, a tool-calling conversational LLM designer agent, computer-vision sketch analysis, EPA WaterSense-equivalent sustainability metrics, official PDF quote generation with CO₂ reduction metrics, and dual-track cross-platform Augmented Reality (WebXR for Android and Apple AR Quick Look for iOS).

---

## 2. Features Implemented & Verification Status

| Feature / Module | Implementation Details | Status |
| :--- | :--- | :--- |
| **Dimension, MEP & Budget Planner** | Continuous sliders for Length (6–24 ft) & Width (5–20 ft); live floor area calculation with compact/spacious threshold classification; dynamic budget slider (₹30,000 to ₹6,00,000+); aesthetic theme selector (*Minimalist Modern*, *Classic Luxury*, *Japanese Zen*); freestanding bathtub eligibility toggle; water pressure constraint selection (*low* <1.5 Bar, *medium*, *high* 3.0+ Bar); 230V electrical rough-in toggle for intelligent toilets and lighted mirrors; green building standard selector (*none*, *leed*, *griha*). | **Fully Working** |
| **Multi-Constraint Optimization Engine** | Algorithmic bin-packing optimizer (`optimizer.py`) that evaluates verified catalog items against budget ceilings, spatial bounding boxes (≥45 sq ft required for bathtub), aesthetic style embeddings (`score_product_style()`), water pressure thresholds, electrical rough-in availability, and optional per-fixture custom LPM flow cap. Generates 3 synchronized suite tiers simultaneously: *Budget-Optimized Collection*, *Balanced Signature Suite*, *Artisan Luxury & Smart Suite*. Enforces MEP clearance rules (24″ toilet front, 16.5″ side, 30″ basin activity zone, door swing). Falls back gracefully to full catalog if constraints are ultra-restrictive. | **Fully Working** |
| **Conversational LLM Agent & Tool-Calling** | Conversational designer (`llm.py`) supporting local Ollama (`llama3.2`) and Anthropic Claude (`claude-3-5-sonnet-20241022`) with native tool/function calling: `reoptimize()`, `swap_item()`, `get_bundle_details()`. Singleton Ollama `AsyncClient` with per-session `asyncio.Semaphore(1)` concurrency locking. Ollama context window trimmed to system prompt + last 4 messages; Claude trimmed to last 6 messages. Tool trigger regex pattern gates tool injection to avoid unnecessary overhead. Never hallucinates SKUs or modifies layouts via raw text. Includes 11-category deterministic intent router for sub-millisecond responses to: greetings, arithmetic (`2+2`), water conservation queries, product spec lookups, percentage budget adjustments, absolute budget sets (supports k/lakh/lakhs units), dimension changes (`12x10`), theme switching (12 phrase variants), bathtub toggle, sketch layout clearing, and fixture swap commands. Markdown responses rendered via `react-markdown`. | **Fully Working** |
| **Realistic 3D Product Visualizer** | Built with React Three Fiber (`@react-three/fiber`), Three.js, and Drei. Procedurally generates scaled architectural room shells (tile floor textures, walls, baseboards) to real-world scale (1 Unit = 1 Foot). Loads authentic Kohler `.glb` models with PBR materials (vitreous china ceramic, polished chrome, matte black, brushed brass, mirror glass, frosted glass). Features directional sunlight with soft shadows, skylight fill, warm accent point lighting, and an auto-framing camera controller with 3 presets (*3D Orbit*, *Top Plan*, *Eye Level*). | **Fully Working** |
| **2D Architectural Floor Plan Viewer** | Scaled SVG floor plan engine (`Room2DViewer.jsx`) displaying exact wall dimensions, baseboard perimeters, fixture bounding boxes, door swing trajectories, and plumbing clearance envelopes. Interactive hover inspection, finish badges, and real-time MEP clearance validation indicators (*Pass/Warning*). | **Fully Working** |
| **Sketch / Photo to Design (Vision AI)** | Computer vision pipeline (`vision.py`) accepting multipart image upload (max 10 MB, any standard image MIME type). Three-tier inference chain: (1) Anthropic Claude Vision (`claude-3-5-sonnet-20241022`, max 700 tokens, 25s timeout) → (2) local Ollama vision model detection (checks for `llama3.2-vision`, `llava`, `minicpm-v`, `moondream`, `bakllava`) → (3) PIL aspect-ratio heuristic fallback with MD5-seeded jitter for deterministic dimension estimation. Extracts room shape (`rectangular`, `square`, `L-shaped`), `length_ft`, `width_ft`, fixture layout (`toilet`, `vanity`, `shower`, `tub`) with normalized nx/nz coordinates clamped to 0.08–0.92, wall orientation (north/south/east/west), doors, windows, and design constraints. Validates spatial clearances (minimum 2.5 ft inter-fixture distance). Always requires user confirmation before committing values. Automatically persists sketch + proposal to `SketchHistory` DB table when `session_id` is provided. | **Fully Working** |
| **Sketch Design History & Persistence** | Persistent DB-backed sketch history (`SketchHistory` SQLAlchemy model + `/api/sketch-history` router). Stores raw image bytes (LargeBinary), session ID, MIME type, proposal JSON, and associated bundle JSON per sketch. API endpoints: `GET` (list by session, sorted newest-first), `PUT /{id}/bundle` (save bundle after confirmation), `DELETE /{id}` (single delete), `DELETE` (clear all for session). History ID serialized as base64 data-URL for in-page preview display. | **Fully Working** |
| **Water Conservation & Sustainability Calculator** | EPA WaterSense-equivalent engine (`sustainability.py`). Baselines: Toilet 6.0 LPF, Showerhead 15.0 LPM, Faucet 8.3 LPM. Household assumptions: 7,300 annual flushes (20/day), 8,760 shower-minutes/year (24 min/day), 5,475 faucet-minutes/year (15 min/day). Kohler benchmarks: dual-flush toilet 3.8 LPF average, efficient showerheads 8.7–9.5 LPM, aerated faucets 4.5–6.0 LPM. Outputs: `annual_saved_litres`, `annual_saved_gallons`, `annual_saved_inr` (@ ₹45/kL municipal water cost), `co2_reduction_kg` (water pumping carbon footprint @ 0.0003 kg CO₂/L), `badge_text`, and per-fixture breakdown. Green building compliance computed per fixture: LEED v4 (Faucets ≤6.0 LPM, Showers ≤9.5 LPM, Toilets ≤4.8 LPF), GRIHA 4-Star (same thresholds + Toilets ≤4.5 LPF), EPA WaterSense (Showers ≤9.5 LPM). | **Fully Working** |
| **Official PDF Quote Export** | Server-side ReportLab PDF engine (`pdf_export.py`). Text sanitized for PostScript Helvetica (strips ₹→"INR", removes emojis, Unicode replacement chars, trademarks). Features vector icon drawings (eco leaf, water droplet, checkmark, lightning bolt) instead of Unicode emoji to avoid glyph corruption. Includes: customer metadata, room dimensions, itemized fixture tables (SKU, product name, finish, category, selling price INR, MRP INR, discount %, GST breakdown), MEP compliance statement, water conservation metrics with annual savings and CO₂ reduction. Delivered as `application/pdf` attachment `Kohler_Bathroom_Design_Quote.pdf`. | **Fully Working** |
| **Cross-Platform Augmented Reality (AR)** | Dual-track AR architecture (`ARSelectionModal.jsx`). **Android WebXR**: `navigator.xr.requestSession('immersive-ar')` with ARCore hit-testing, anchors, and real-world `.glb` asset overlays. **iOS Safari**: Apple AR Quick Look via `<a rel="ar">` HTML anchor links loading real-scale `.usdz` files. Modes: project *Full Bathroom Suite (All Fixtures combined)* or select *individual fixture* for spot placement. Automatically hides AR controls on unsupported desktop browsers. Pre-built USDZ suite files: `bathroom-suite.usdz`, `suite-luxury.usdz`, `suite-modern.usdz`, `suite-zen.usdz`. | **Fully Working** |
| **Fixture Detail Modal** | `FixtureDetailModal.jsx`: Full-screen overlay triggered by clicking any fixture in the 3D or 2D view. Displays product name, SKU, finish, category, price vs MRP, discount %, MEP technical specs (electrical requirements, water pressure tier, flow rate/flush volume, green certifications). Includes "View on Kohler India" link using `source_url` from catalog. | **Fully Working** |
| **Bundle Comparison Panel** | `BundleComparison.jsx`: Side-by-side comparison of all 3 suite tiers (Budget, Balanced, Premium) with total price, within-budget indicator, per-fixture itemized list, water savings badge, and active tier highlighting. | **Fully Working** |
| **Responsive UI & Design System** | Kohler Monochrome Design System (PRD §5): 10-step grayscale neutral palette, Inter typography (via `index.css`), 8px base spacing grid (48–64px section margins), responsive breakpoints: 360px, 480px, 768px, 1024px, 1440px. Floating expandable chat agent panel (`ChatPanel.jsx`). Session ID generated once and persisted in `localStorage` (`kohler-session-id`). AbortController support for chat request cancellation. | **Fully Working** |

---

## 3. API Endpoints (Complete Contract)

| Method | Endpoint | Purpose | Key Constraints |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Root health & endpoint listing | Returns `llm_configured`, `llm_mode` |
| `GET` | `/health` | Liveness check | Returns `llm_configured`, `llm_mode` |
| `GET` | `/api/catalog` | Browse Kohler product catalog | Filters: `category`, `sub_type`, `area`, `finish`, `verified_only` (default `true`). Ordered by price ASC. |
| `GET` | `/api/catalog/{sku}` | Single product by SKU | Returns 404-like error dict if not found |
| `POST` | `/api/optimize` | Generate 3 optimized suites | Body: `length_ft` (4–40 ft), `width_ft` (4–40 ft), `budget_inr` (15k–5M), `theme`, `include_bathtub`, `water_pressure`, `electrical_rough_in`, `green_certification`, `max_flow_rate_lpm` (optional), `sketch_layout` (optional normalized fixture array) |
| `POST` | `/api/chat` | Conversational agent turn | Body: `session_id`, `message`, `active_bundle` (optional dict), `current_params` (optional dict). Returns `reply`, `tool_called`, `tool_result`, `active_bundle`, `current_params`. 504 on Ollama timeout. |
| `POST` | `/api/export` | PDF quote download | Body: `bundle` (dict), `room_specs` (dict). Returns `application/pdf` binary. |
| `POST` | `/api/vision-dimensions` | Sketch/photo AI analysis | Multipart form: `file` (image, max 10 MB), `hint` (optional text), `session_id` (optional). Returns `DimensionProposal` with fixture layout, attribution, and `history_id`. |
| `GET` | `/api/sketch-history` | List user's sketch history | Query: `session_id` (required). Returns array sorted newest-first. |
| `PUT` | `/api/sketch-history/{id}/bundle` | Attach bundle to sketch history | Body: `{ bundle: dict }` |
| `DELETE` | `/api/sketch-history` | Clear all sketches for session | Query: `session_id` (required). Returns `deleted_count`. |
| `DELETE` | `/api/sketch-history/{id}` | Delete single sketch entry | Query: `session_id` (required for auth). |

---

## 4. Tech Stack

### Frontend
- **Framework & Tooling:** React 19 (`react` 19.2.8, `react-dom` 19.2.8), Vite 8 (`vite` 8.3.0, `@vitejs/plugin-react` 6.1.1)
- **Dev Server:** `0.0.0.0:5173` (LAN accessible), configured in `vite.config.js`
- **3D & Graphics:** Three.js (`three` 0.186.0), React Three Fiber (`@react-three/fiber` 9.7.0), Drei (`@react-three/drei` 10.7.8), Postprocessing (`@react-three/postprocessing` 3.1.1, `postprocessing` 6.39.5)
- **UI & Markdown:** Lucide React (`lucide-react` 1.45.0) — icons: `Download`, `Droplets`, `MessageCircle`, `Box`, `LayoutGrid`; `react-markdown` 10.1.0; Vanilla CSS Design Tokens (`index.css` / `App.css`)
- **Environment Variable:** `VITE_API_BASE_URL` (defaults to `http://localhost:8003`)
- **Code Quality:** Oxlint (`oxlint` 1.81.0) with config in `.oxlintrc.json`

### Backend
- **Framework:** FastAPI (`fastapi` ≥ 0.110.0), Uvicorn ASGI (`uvicorn` ≥ 0.28.0), Pydantic v2 (`pydantic` ≥ 2.6.4)
- **Language Environment:** Python 3.10+ / Python 3.13
- **HTTP & Async Client:** HTTPX (`httpx` ≥ 0.27.0), native `asyncio`
- **Document Generation:** ReportLab (`reportlab` ≥ 4.1.0)
- **LLM Clients:** `anthropic` ≥ 0.18.0, `ollama` ≥ 0.3.0
- **Database ORM:** SQLAlchemy ≥ 2.0.28, `psycopg2-binary` ≥ 2.9.9 (PostgreSQL driver, also SQLite-compatible)
- **Environment Config:** `python-dotenv` ≥ 1.0.1. Loads `backend/.env` first, then root `.env`. OS env vars always win (no override). Placeholder key detection prevents accidental use of unconfigured keys.
- **API Config:** `API_TIMEOUT_SECONDS = 30`, `CHAT_RATE_LIMIT = "20/5minutes"`
- **CORS Origins:** `localhost:5173`, `localhost:3000`, `127.0.0.1:5173`, `127.0.0.1:3000`, `*`
- **Startup Lifecycle:** FastAPI `lifespan()` context manager calls `require_llm_configured()` (fatal if no LLM found) then `warmup_llm()` (non-blocking, warms Ollama model to avoid first-request cold start). `init_db()` runs at module import level.

### LLM & Artificial Intelligence
- **Priority 1 — Anthropic Claude:** `claude-3-5-sonnet-20241022`. Activated when `ANTHROPIC_API_KEY` env var is present, starts with `sk-ant-`, and contains no placeholder fragments. API calls timeout at 30s. Claude context: last 6 messages. Tool use executed with a follow-up 2nd round-trip to generate final natural-language reply.
- **Priority 2 — Local Ollama:** Default model `llama3.2`, base URL `http://localhost:11434`, keep-alive `60m`. Singleton `AsyncClient`. Per-session `asyncio.Semaphore(1)` prevents concurrent Ollama calls per session. Timeout: 20s. Context: system prompt + last 4 messages. Tool injection gated by `TOOL_TRIGGER_PATTERN` regex. Tool result used directly without 2nd LLM round-trip.
- **Startup behavior:** Backend refuses to start if neither Anthropic API key nor local Ollama is reachable. No silent offline mode.
- **Deterministic Intent Router (11 categories):** Greetings; arithmetic (safe `eval` with AST symbol checking); water conservation specs; product spec lookups; percentage budget adjustment (`reduce/increase budget by X%`); absolute budget set (supports `k`, `lakh`, `lakhs` unit suffixes, range ₹20k–₹25L); room dimension change (`XxY` format); theme switch (12 keyword phrases); bathtub toggle (add/remove); sketch layout clear; fixture swap (faucet/tap/toilet/commode/wc/washbasin/basin/sink/vanity/shower/mirror/bathtub/tub → cheaper/premium/luxury/zen/modern/different).
- **Vision fallback chain:** Claude Vision → Ollama vision model (auto-detected from `/api/tags`) → PIL aspect-ratio heuristic with MD5-seeded jitter.

### Database & Seed Catalog
- **Engine:** SQLite (`kohler.db`) via SQLAlchemy ORM; PostgreSQL-compatible schema in `schema.sql` (includes `pgvector` extension, `VECTOR(1536)` column for future embedding support, 4 indexes on `category`, `sub_type`, `price_inr`, `verified`).
- **SQLAlchemy Models:**
  - `Product` table (`products`): `sku` (PK), `name`, `area`, `category`, `sub_type`, `price_inr`, `mrp_inr`, `discount_pct`, `finish`, `dimensions_json` (JSON), `style_tags` (JSON array), `flow_rate_lpm` (Float), `source_url`, `image_url`, `verified` (Boolean), `created_at`.
  - `SketchHistory` table (`sketch_history`): `id` (UUID PK), `session_id`, `filename`, `content_type`, `image_data` (LargeBinary), `proposal_json` (JSON), `bundle_json` (JSON, nullable), `created_at`, `updated_at` (auto-updated on edit).
- **Catalog Dataset:** `kohler_catalog.json` — 95 verified Kohler India products across 6 categories. Loaded via `backend/db/load_catalog.py` which enriches each product with computed 3D bounding dimensions (per-category defaults), style tags, and flow rate extraction from product name text.
- **Category dimension defaults (ft):** Washbasins 2.0W×1.5D×0.6H (21″ front clearance), Faucets 0.5W×0.6D×0.8H, Toilets 1.5W×2.4D×2.6H (24″ front, 15″ sides), Bathtubs 5.5W×2.8D×2.0H (24″ front), Showers 1.0W×1.0D×0.5H (30″ front, 15″ sides, wall-mounted), Mirrors & Cabinets 2.2W×0.3D×2.8H (20″ front, wall-mounted), Bathroom Vanity 3.0W×1.8D×2.8H.

### 3D Asset Pipeline
- **GLB files** (14 individual fixture SKU models): Used by Three.js / React Three Fiber for WebGL 3D rendering and Android WebXR.
- **USDZ files** (14 individual + 4 suite USDZ bundles): Used by Apple AR Quick Look on iOS Safari.
- **Suite USDZ bundles:** `bathroom-suite.usdz`, `suite-luxury.usdz`, `suite-modern.usdz`, `suite-zen.usdz`.
- **Individual SKU models:** `17629IN-SM-0`, `1855IN-0`, `21226IN-HP1`, `22931IN-NA`, `24547IN-CP`, `26050IN-BGL`, `31367IN-BGL`, `5401IN-0`, `5583IN-1WH-0`, `73038IN-CL-CP`, `73060T-9GCH-TT`, `73199IN-CP`, `74028IN-4-CP`, `77963-8A-BL`, `C64`.
- **Additional public assets:** `favicon.svg`, `icons.svg`.

---

## 5. Data Source & Catalog Provenance

The product database is built from real product listings on the **Kohler India official store** ([kohler.co.in](https://www.kohler.co.in/)):

1. Every item contains a `source_url` pointing directly to its live Kohler India PDP and a `verified: true` boolean flag.
2. The 95-product catalog covers all 6 required bathroom zones with real SKUs, real prices, and real MEP specs:
   - **Washbasins:** ModernLife Edge 60cm, Forefront, Brive Plus, Mica, Sveda Steam Basin, Span, Brazn, Vive.
   - **Faucets:** Components Rocker/Lever, Taut Pillar, Composed Titanium, Parallel, Avid, Artifacts.
   - **Toilets:** Veil Intelligent Smart Toilet, Ove 1Pc, Brive Plus, ModernLife Wall-Hung.
   - **Showers:** Rainduet Square 20cm Rainhead, Daisyfield Multifunction, Rainduet Edge, Statement Rainhead.
   - **Mirrors & Cabinets:** Essential Round 71.5 cm Brushed Brass, Essential Round 55.9 cm Brushed Brass, Vitality Lighted Mirror, Maxispace Cabinet.
   - **Bathtubs:** Evok Freestanding Oval, Stargaze Freestanding Acrylic, Volute Drop-in.
3. Style tags computed algorithmically at load time based on product name, finish, and category keywords:
   - **Minimalist Modern:** keywords: modern, edge, span, composed, hidden drain, wall-mount, sleek, rectang, thin, white, black. Finishes: White, Matte Black.
   - **Classic Luxury:** keywords: artifact, kelston, finial, widespread, memoirs, riverbath, whirlpool, gold, bronze, abrazo, luxury. Finishes: Polished Chrome, Brushed Bronze, French Gold.
   - **Japanese Zen:** keywords: zen, oval, conical, innate, smart, round, steam, rain, rainhead, organic, cashmere, indigo, vive. Finishes: Cashmere, Indigo, Thunder Grey, White.
4. MEP specs derived programmatically per product at query time via `get_fixture_specs()`:
   - **Electrical required:** smart/veil/innate/numi/leap/intelligent bidet toilets; lite/light/led/column/forefront mirrors; digital/anthem/electronic/dtv showers → "230V AC, 50Hz (15A Dedicated Circuit)".
   - **Water pressure tiers:** Low (≥0.5 Bar) for gravity-flush toilets and pillar faucets; Medium (≥1.0–1.8 Bar) for standard faucets, showers, smart toilets; High (≥2.0–3.0 Bar) for bathtubs and oversized rainheads (30.5 cm / 22+ LPM heads).
   - **Green certifications:** LEED v4, GRIHA 4-Star, IGBC Green (faucets ≤6 LPM), EPA WaterSense (showers ≤9.5 LPM), WaterSense (toilets ≤4.8 LPF).

---

## 6. 3D Placement & Clearance Engine

All placement logic lives in `backend/services/placement.py`. Scale: **1 unit = 1 real-world foot**.

### Coordinate Convention
- Room centered at world origin `(0, 0, 0)`.
- X-axis = room length (East-West). Z-axis = room width (North-South). Y-axis = height.
- `half_l = length_ft / 2`, `half_w = width_ft / 2`.
- Normalized sketch coordinates: `nx` 0.0 (West) → 1.0 (East); `nz` 0.0 (North) → 1.0 (South). Converted via: `x = (nx - 0.5) * length_ft`, `z = (nz - 0.5) * width_ft`.

### Default Fixture Positions (when no sketch hint)
| Fixture | Position | Y (height) | Wall | Notes |
|---------|----------|-----------|------|-------|
| Washbasin | `-half_l + 1.3 + 0.8, z = -half_w + 0.05` | 2.7 ft | north | basin_w=2.6, basin_d=1.75 |
| Faucet | Same X as basin, z = basin_z - 0.45 | basin_y + 0.15 | north | Collocated with basin |
| Mirror | Same X as basin, z = -half_w + 0.08 | 4.8 ft | north | Wall-mounted above basin |
| Toilet | `min(half_l - 3.4, basin_x + basin_w/2 + 1.8 + 0.8)` | 0.0 | north | If room ≥8 ft long; west wall alternative for smaller rooms |
| Shower | `half_l - 1.6, z = half_w - 1.6` | 6.5 ft | east | Corner position |
| Bathtub | `-half_l + 2.6 + 0.4, z = half_w - 1.3 - 0.2` | 0.0 | south | tub_w=5.2, tub_d=2.6; only if area ≥45 sq ft |

### Wall Rotation Mapping (radians)
| Wall | Y-rotation |
|------|-----------|
| north | 0 |
| south | π |
| west | π/2 |
| east | -π/2 |

### Camera Auto-Fit
- Diagonal = `sqrt(length² + width²)`.
- Camera distance = `max(diagonal × 1.3, 14.0)`.
- Camera position = `[length × 0.85, height × 1.35, width × 1.25]`.
- Target = `[0, height × 0.25, 0]`. FOV = 45°.
- Min/max orbit distance = `diagonal × 0.35` / `diagonal × 3.2`.

### AABB Collision Detection
2D axis-aligned bounding box overlap check on the X-Z floor plane for Basin (±1.3 × ±0.4 to +1.75), Toilet (±1.5 × ±1.5), Shower (±1.6 × ±1.6).

---

## 7. Optimizer Scoring & Bundle Construction

### Style Alignment Scoring (`score_product_style()`)
Base score: 5.0. Bonuses:
- Theme tag match in `style_tags`: +15.0
- Name keyword match for active theme: +8.0
- Finish match for active theme: +3.0 or +4.0

### Bundle Tiers
| Bundle | ID | Name | Selection Logic |
|--------|----|------|-----------------|
| Budget | `bundle-budget` | Budget-Optimized Collection | Cheapest compliant item per category |
| Balanced | `bundle-balanced` | Balanced Signature Suite | Highest style score, median index item |
| Premium | `bundle-premium` | Artisan Luxury & Smart Suite | Highest style score + highest price item |

### Bathtub Eligibility
Included when `include_bathtub=True` OR sketch explicitly shows a tub zone, AND `area_sqft ≥ 45.0`, AND `Bathtubs` category exists in DB.

### MEP Compliance Filtering (`is_product_compliant()`)
1. **Electrical:** If `electrical_rough_in=False` → exclude smart toilets, lighted mirrors, digital showers.
2. **Water pressure `low`** (< 1.5 Bar): Exclude items requiring > 1.2 Bar minimum.
3. **Water pressure `medium`**: Exclude items requiring > 2.5 Bar.
4. **LEED/GRIHA:** Showers > 10.0 LPM excluded; Faucets > 6.0 LPM excluded; Toilets > 4.8 LPF excluded.
5. **Custom flow cap** (`max_flow_rate_lpm`): Excludes items exceeding user-specified cap.
6. **Graceful fallback:** If all items in a category are filtered out, falls back to unfiltered category list.

### Bundle Output Fields (per bundle)
`bundle_id`, `bundle_name`, `tier`, `theme`, `total_price_inr`, `total_mrp_inr`, `savings_inr`, `discount_pct`, `within_budget`, `budget_inr`, `water_savings` (from `sustainability.py`), `mep_compliance` (dict with summary string), `fixtures` (with `position`, `rotation`, `scale: [1,1,1]`, `wall`, `placement_source`, `clearance_valid`, `specs`), `room`, `camera`, `layout_attribution` (`from_sketch`, `optimizer_filled`, `notes`).

---

## 8. System Architecture

```
                                  +-------------------------------------------------------+
                                  |                 USER BROWSER CLIENT                   |
                                  |  (Desktop / Android Chrome WebXR / iOS Safari WebKit) |
                                  +---------------------------+---------------------------+
                                                              |
                                             HTTP / JSON REST | & Multipart Form Data
                                                              v
+-------------------------------------------------------------------------------------------------------------------------+
|                                                   FASTAPI BACKEND (uvicorn)                                            |
|                                                                                                                         |
|   +---------------------+  +--------------------+  +-------------------+  +------------+  +------------------------+  |
|   | /api/catalog         |  | /api/optimize      |  | /api/chat         |  | /api/export|  | /api/vision-dimensions |  |
|   | GET (list, SKU)      |  | POST (3 bundles)   |  | POST (agent turn) |  | POST (PDF) |  | POST (image upload)    |  |
|   +----------+----------+  +---------+----------+  +--------+----------+  +-----+------+  +----------+-------------+  |
|              |                       |                       |                   |                    |                 |
|              v                       v                       v                   v                    v                 |
|   +----------+----------+  +---------+----------+  +--------+----------+  +-----+------+  +----------+-------------+  |
|   | SQLAlchemy (Product) |  | optimizer.py       |  | llm.py            |  | pdf_export |  | vision.py              |  |
|   | DB query + filters   |  | placement.py       |  | deterministic     |  | .py        |  | Claude → Ollama →      |  |
|   |                      |  | sustainability.py  |  | router → LLM      |  | ReportLab  |  | PIL heuristic chain    |  |
|   +----------+----------+  +---------+----------+  +--------+----------+  +-----+------+  +----------+-------------+  |
|              |                       |                       |                   |                    |                 |
|   /api/sketch-history (GET/PUT/DELETE) — SketchHistory model, session-scoped, LargeBinary image store                  |
+-------------------------------------------------------------------------------------------------------------------------+
                |                      |                      |                    |                   |
                v                      v                      v                    v                   v
+-------------------------------------------------------------------------------------------------------------------------+
|                                                  DATA & ASSET LAYER                                                     |
|                                                                                                                         |
|  +----------------------------+  +----------------------------------+  +------------------------------------------+     |
|  | SQLite DB (kohler.db)      |  | Seed JSON (kohler_catalog.json) |  | 3D Models (public/models/)               |     |
|  | Product (95 verified SKUs) |  | 95 verified Kohler India items  |  | 14 SKU .glb + 14 SKU .usdz              |     |
|  | SketchHistory (LargeBinary)|  | Source for DB re-seeding        |  | 4 suite .usdz bundles                    |     |
|  +----------------------------+  +----------------------------------+  +------------------------------------------+     |
+-------------------------------------------------------------------------------------------------------------------------+
```

---

## 9. File Structure

```
kohler-track1/
├── backend/
│   ├── .env                      # Active LLM keys & DB URL (gitignored)
│   ├── .env.example              # Config template
│   ├── config.py                 # Settings class, LLM mode detection, env loading
│   ├── main.py                   # FastAPI app, CORS, lifespan, global exception handler
│   ├── requirements.txt          # Python dependencies
│   ├── routers/
│   │   ├── catalog.py            # GET /api/catalog, GET /api/catalog/{sku}
│   │   ├── chat.py               # POST /api/chat
│   │   ├── export.py             # POST /api/export
│   │   ├── history.py            # GET|PUT|DELETE /api/sketch-history
│   │   ├── optimize.py           # POST /api/optimize
│   │   └── vision.py             # POST /api/vision-dimensions
│   ├── services/
│   │   ├── llm.py                # Chat agent, tool calling, deterministic router
│   │   ├── optimizer.py          # 3-bundle MEP-constrained fixture optimizer
│   │   ├── pdf_export.py         # ReportLab PDF generation
│   │   ├── placement.py          # 3D procedural room placement & camera fit
│   │   └── sustainability.py     # Water savings & CO₂ reduction calculator
│   └── db/
│       ├── models.py             # SQLAlchemy Product + SketchHistory ORM models
│       ├── schema.sql            # PostgreSQL DDL (with pgvector + indexes)
│       ├── session.py            # Engine, SessionLocal, init_db(), get_db()
│       └── load_catalog.py       # DB seeder from kohler_catalog.json
├── frontend/
│   ├── index.html                # Vite entry HTML
│   ├── package.json              # npm deps + scripts (dev/build/lint/preview)
│   ├── vite.config.js            # Vite config (host 0.0.0.0, port 5173)
│   ├── .oxlintrc.json            # Oxlint rules
│   ├── public/
│   │   ├── favicon.svg
│   │   ├── icons.svg
│   │   └── models/               # 14 .glb + 14 .usdz + 4 suite .usdz + README.md
│   └── src/
│       ├── main.jsx              # React entry point
│       ├── App.jsx               # Root app state, session management, API calls
│       ├── App.css               # App-level styles
│       ├── index.css             # Global design system tokens
│       ├── assets/               # Static image assets
│       └── components/
│           ├── ARSelectionModal.jsx    # Dual-track AR (WebXR + AR Quick Look)
│           ├── BundleComparison.jsx    # 3-tier suite comparison panel
│           ├── ChatPanel.jsx           # Floating chat agent UI
│           ├── FixtureDetailModal.jsx  # Fixture spec overlay modal
│           ├── InputForm.jsx           # Dimension/budget/MEP controls
│           ├── Room2DViewer.jsx        # SVG CAD floor plan viewer
│           └── Room3DViewer.jsx        # Three.js 3D room visualization
├── kohler.db                     # SQLite database (runtime)
├── kohler_catalog.json           # 95-product seed catalog
├── IMPLEMENTATION.md             # This document
└── kohler-bathroom-designer-PRD.md  # Product Requirements Document
```

---

## 10. Configuration & Environment Variables

| Variable | Location | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | `backend/.env` | `sqlite:///./kohler.db` | SQLAlchemy DB connection string |
| `ANTHROPIC_API_KEY` | `backend/.env` | *(empty)* | Claude API key (must start with `sk-ant-`) |
| `OLLAMA_BASE_URL` | `backend/.env` | `http://localhost:11434` | Ollama server URL |
| `OLLAMA_MODEL` | `backend/.env` | `llama3.2` | Ollama model name |
| `OLLAMA_KEEP_ALIVE` | `backend/.env` | `60m` | Keep-alive duration for loaded Ollama model |
| `VITE_API_BASE_URL` | Frontend env | `http://localhost:8003` | Backend URL used by frontend |

---

## 11. How to Run

### Backend
```bash
cd kohler-track1
pip install -r backend/requirements.txt
uvicorn backend.main:app --host 0.0.0.0 --port 8003 --reload
```
Interactive API docs available at: `http://localhost:8003/docs`

### Frontend
```bash
cd kohler-track1/frontend
npm install
npm run dev
# Served at http://localhost:5173
```

### Database Seeding (first time or re-seed)
```bash
cd kohler-track1
python -m backend.db.load_catalog
```

### Linting
```bash
cd kohler-track1/frontend
npm run lint
```

---

## 12. Known Platform Differences & Limitations

1. **iOS Safari vs Android WebXR:**
   - Apple iOS Safari does not support the W3C WebXR Device API (`navigator.xr`).
   - On iOS, AR is delivered via **Apple AR Quick Look** (`<a rel="ar">` links loading `.usdz` assets).
   - On Android (Chrome / Samsung Internet), AR uses **WebXR `immersive-ar`** backed by Google Play Services for AR (ARCore).

2. **Local LLM Performance:**
   - Ollama `llama3.2` inference speed depends on host hardware. The deterministic intent router handles common budget math, theme changes, fixture swaps, and catalog queries in <10ms — bypassing LLM entirely.
   - Per-session `asyncio.Semaphore(1)` prevents concurrency issues but means simultaneous requests in the same session queue sequentially.
   - Context limited to last 4 messages + system prompt to keep Ollama prompt lightweight.

3. **Computer Vision Fallback:**
   - Without Anthropic API key and no Ollama vision model, sketch analysis uses PIL image dimensions + MD5-seeded jitter for deterministic dimension estimation and hardcoded standard-ergonomics fixture zone placement.
   - Vision results always return `requires_confirmation: true` — never auto-applied.

4. **Database:**
   - Default SQLite (`kohler.db`) for single-node deployments. `schema.sql` provides a PostgreSQL production schema with `pgvector` for future semantic embedding search (`VECTOR(1536)` column `embedding_vector` already defined in DDL, not yet populated).

5. **Session State:**
   - Chat session store (`SESSION_STORE`) is in-memory Python dict — resets on backend restart. Sketch history survives restarts (DB-persisted). Frontend session ID survives browser refresh (localStorage).
