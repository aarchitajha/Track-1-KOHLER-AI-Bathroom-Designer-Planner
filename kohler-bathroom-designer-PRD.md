# Product Requirements & Design Specification
## KOHLER AI Bathroom Designer & Planner

**Version:** 1.0
**Prepared for:** Implementation handoff (Antigravity)
**Status:** Draft for build

---

## 1. Important Note on Product Data (read first)

Kohler India's site (kohler.co.in) renders its product listing pages (category/PLP pages) client-side via a Next.js/React app — a plain fetch of these pages returns only navigation, category structure, and marketing copy, **not** the actual product grid (names, SKUs, prices, dimensions). Individual product detail pages (PDP), however, **do** render real data server-side — confirmed by fetching a live PDP, which returned:

> **Sveda Basin with Steam generator** — SKU `K-C97` — ₹57,598 (MRP ₹72,000, 20% off), inclusive of taxes.

**What this means for the build:** the category taxonomy, collections, and finish options below are verified real data pulled from the live site. The full product catalog (30–50 SKUs with prices/dimensions needed for the recommendation engine) is **not** available in bulk and must be collected via one of:

1. **A headless-browser scraper** (Playwright/Puppeteer) that visits each PDP URL and extracts name, SKU, price, and spec-table data — the technically correct, most defensible approach, and a good showcase of engineering rigor for the "Technical Execution" criterion.
2. **Manual collection** — open ~8–10 flagship products per category in a real browser, copy the verified name/SKU/price/dimensions by hand into the catalog seed file.

**Do not hardcode invented prices, dimensions, or SKUs.** Every catalog entry must trace back to a real PDP URL. Mark any entry that hasn't been verified yet as `"verified": false` in the data file so it's never presented as real in a demo.

---

## 2. Verified Real Data (from kohler.co.in)

### 2.1 Category Taxonomy (confirmed structure)

| Area | Category | Sub-types |
|---|---|---|
| Basin Area | Washbasins | Vessel, Undercounter, Wall Mount, Semi Recessed, Vanity Top |
| Basin Area | Faucets | Single Control, Tall, Wall-Mount, Widespread, Bathtub Faucets |
| Basin Area | Mirrors & Cabinets | Lighted Mirror, Lighted Mirror Cabinet, Non-Lighted Mirror, Non-Lighted Mirror Cabinet |
| Basin Area | Bathroom Vanity | — |
| Showering Area | Shower Doors | Pivot, Sliding, Bathscreen |
| Showering Area | Showers | Rainpanels, Rainheads, Showerheads, Hand Showers, Body Spray |
| Showering Area | Diverters & Trims | Digital Control, Manual Control, Exposed Wall Mixer |
| Showering Area | Shower Fittings | Handshower Hose/Bracket, Supply Elbow, Slidebar, Shower Arm, Floor Drain |
| Toilet Area | Toilets | Smart Toilet, Wall Hung, One Piece, Two Piece, Wall Hung w/ Exposed Tank |
| Toilet Area | Toilet/Bidet Seats | Electronic Bidet Seats, Manual Bidet Seats, Toilet Seats, Bidet Attachment |
| Toilet Area | Cisterns & Flushing | Cisterns, Face Plates, Flush Valve |
| Wellness | Bathtubs | Freestanding, Drop-in, Alcove |
| Wellness | Bathtub Fillers | Freestanding, Deck Mount, Wall Mount |
| Wellness | Steam | Steam Basin, Steam Bath |
| Accessories | Bathroom Accessories | Toilet Paper Holders, Robe Hooks, Towel Bars/Rings, Soap Dispenser/Dish, Shelves, Grab Bars, Brush Holder, Tumbler Holder |

### 2.2 Verified Collections (basin line)
ModernLife Edge, Span, Brazn, Vive — plus referenced elsewhere on-site: Sveda, Veil, Escale, Nysa, Mica, Forefront

### 2.3 Verified Finish/Color Options
White, Black, Indigo, Cashmere, Peacock, Thunder Grey

### 2.4 One Verified Sample Product (for schema reference)
```json
{
  "sku": "K-C97",
  "name": "Sveda Basin with Steam generator",
  "category": "Grooming Area Combos",
  "price_inr": 57598,
  "mrp_inr": 72000,
  "discount_pct": 20,
  "source_url": "https://www.kohler.co.in/en/p/shop-grooming-area-combos/sveda-basin-with-steam-generator-1.html?skuId=C97",
  "verified": true
}
```

---

## 3. Problem Statement & Goals

Build an interactive AI design assistant that takes a customer's bathroom dimensions, budget, and aesthetic theme, and produces optimized, real Kohler product bundle recommendations — visualized in an accurate, well-proportioned 3D room — refinable through natural conversation.

**Success criteria (tied to competition rubric):**
- Approach & Innovation — agentic refinement + multi-constraint optimization, not a static form
- Technical Execution — stable, performant, real data-backed
- UX & Feasibility — clean, spacious, production-quality interface
- Business & Sustainability Impact — water-savings quantified per bundle

---

## 4. Functional Requirements

### 4.1 Input
- FR-1: User enters room length × width (ft), budget (INR), and aesthetic theme (Minimalist Modern / Classic Luxury / Japanese Zen)
- FR-2 (Tier 2): User may instead upload a photo/sketch; a vision-capable LLM estimates dimensions and pre-fills the form for confirmation

### 4.2 Recommendation Engine
- FR-3: Multi-constraint optimizer selects one fixture per category (basin, faucet, toilet, shower system, vanity) such that total price ≤ budget and total footprint ≤ room area, maximizing a style-fit + quality score
- FR-4: Generate 3 bundles — Budget-Optimized, Balanced, Premium — at different price/quality points
- FR-5: Style matching uses embeddings to score catalog items against the selected aesthetic theme

### 4.3 Conversational Agent
- FR-6: Chat interface where the user can request changes ("swap the vanity," "make it cheaper," "more Zen") in natural language
- FR-7: Agent uses tool-calling to invoke `reoptimize()`, `swap_item()`, `get_bundle_details()` — never edits the layout by direct text generation
- FR-8: Conversation state persists across turns within a session

### 4.4 Sustainability
- FR-9: Each bundle displays estimated annual water savings (gallons/litres) vs. standard baseline fixtures, computed from published WaterSense-equivalent specs per fixture

### 4.5 3D Visualization
- FR-10: Room shell (walls, floor) generated procedurally from input dimensions, to real-world scale
- FR-11: Fixtures placed via 3D bin-packing/collision logic respecting category-specific clearance rules (e.g. toilet needs 24" clearance in front)
- FR-12: Scene must auto-frame the camera so the full room is visible on load, regardless of room size — this is the "fits properly" requirement: compute camera distance/FOV from room bounding box, don't hardcode a fixed camera position
- FR-13: Orbit/pan/zoom camera controls
- FR-14: Scene updates live when the agent changes a fixture (no full page reload)

### 4.6 Output
- FR-15: Exportable PDF quote: bundle, itemized pricing, water-savings badge, 3D render snapshot

---

## 5. UI / Design Specification

### 5.1 Color System

Derived from the two provided color-hex.com palettes (IDs 45492 and 76074) — both are grayscale/monochrome, and combine cleanly into a single 10-step neutral scale, extended with pure white for a minimalist, gallery-like interface that lets the 3D renders and product photography carry the visual weight:

| Token | Hex | Usage |
|---|---|---|
| `--color-white` | `#ffffff` | Page background, cards |
| `--color-grey-100` | `#e8e8e8` | Section backgrounds, dividers |
| `--color-grey-200` | `#b7b7b7` | Borders, disabled states |
| `--color-grey-300` | `#8c8c8c` | Placeholder text, muted icons |
| `--color-grey-400` | `#525252` | Secondary text |
| `--color-grey-500` | `#4d4d4d` | Body text (alt) |
| `--color-grey-600` | `#3c3c3c` | Headings (alt) |
| `--color-grey-700` | `#1e1e1e` | Primary headings |
| `--color-grey-800` | `#111111` | Primary text |
| `--color-black` | `#000000` | High-emphasis buttons, active states |

No separate accent color — keep the app chrome strictly monochrome so the aesthetic-theme options (which carry their own material/color identity in the 3D scene) stand out against a neutral UI. If a single accent is needed later for CTAs/success states, introduce it deliberately rather than defaulting to a random blue.

### 5.2 Typography
- Sans-serif, geometric (e.g. Inter or Neue Haas Grotesk-style) for a modern, Kohler-appropriate feel
- Scale: 12 / 14 / 16 / 20 / 24 / 32 / 48px, 1.5 line-height for body text

### 5.3 Spacing System
Use an 8px base grid throughout — this is what makes spacing "feel right" rather than arbitrary:
- Micro spacing (icon-to-label): 4px
- Component padding: 16px / 24px
- Section gaps: 48px / 64px
- Page margins: 64px desktop, 24px mobile
- Card grid gutters: 24px

### 5.4 Layout
- Fixed-width content container (max 1280px), generous whitespace, no cramped product cards
- 3D scene occupies a minimum 60% viewport height on desktop so it reads as the centerpiece, not an afterthought
- Chat panel docked right (desktop) or as a bottom sheet (mobile) — never overlapping the 3D view

### 5.5 Components (minimum set)
- Input form (dimensions/budget/theme) — single card, progressive disclosure
- Bundle comparison cards (3-up on desktop, stacked on mobile)
- 3D viewer with floating camera-reset and theme-swap controls
- Chat panel with tool-call status indicators ("Re-optimizing…", "Swapping vanity…")
- Water-savings badge component (icon + number + unit)
- Quote export button (sticky, always visible once a bundle is selected)

---

## 6. 3D Visualization Spec

- **Stack:** React Three Fiber + @react-three/drei
- **Scale:** 1 real-world foot = fixed scene unit (e.g. 1 unit); document this conversion once and use it everywhere — never eyeball scale per fixture
- **Room generation:** procedural walls/floor from `(length, width, height=8ft default)`
- **Fixture placement:** optimizer outputs `(x, z, rotation_y)` per fixture; a placement validator checks bounding-box collisions and minimum clearances before accepting a layout — reject and retry with next-best item if violated
- **Camera:** auto-computed `OrbitControls` target = room center; camera distance computed from room diagonal so the whole room fits in frame on load, with min/max zoom clamped to prevent clipping through walls
- **Lighting:** one ambient light + one directional "window light" + drei `Environment` preset for soft realistic shading — avoid flat/unlit look
- **Assets:** glTF models sourced from Sketchfab/Poly Pizza per fixture category; primitive fallback (box/cylinder) if no suitable free asset exists for a category — never leave a fixture invisible
- **Performance:** lazy-load glTF models, reuse geometry via instancing if the same fixture type repeats

---

## 7. Technical Architecture & Deployment Considerations

Since this will be deployed post-competition, build the API layer production-mindedly from day one, not as a demo hack:

### 7.1 Backend
- FastAPI, structured with routers per domain: `/optimize`, `/chat`, `/catalog`, `/export`
- All LLM calls go through a single service module — never call the Claude/OpenAI SDK directly from route handlers — so you can add retries, timeouts, and logging in one place
- **Environment variables** for all secrets (API keys, DB URL) — never hardcoded; use `.env` locally and a secrets manager (Render/Railway env vars) in production
- **Timeouts & retries:** every external call (LLM, catalog DB) wrapped with a timeout (e.g. 15s) and one retry with backoff
- **Rate limiting:** per-session limit on chat/optimize calls (e.g. 20 requests/5 min) to control LLM API cost once public
- **Caching:** cache catalog lookups and embedding computations (Redis or in-memory LRU) — style-matching embeddings don't need to be recomputed per request
- **CORS:** explicit allow-list of your deployed frontend origin, not `*`, once live
- **Error handling:** every endpoint returns a consistent error shape (`{error, code, message}`) so the frontend can render failures gracefully instead of crashing

### 7.2 Frontend
- React (Vite) + Tailwind, deployed to Vercel
- API base URL from environment config, not hardcoded, so staging/prod can point to different backends
- Loading and error states designed for every async action (optimize, chat turn, export) — never a blank screen while waiting

### 7.3 Database
- PostgreSQL (Render/Railway/Supabase) for the catalog table — not SQLite, since SQLite doesn't survive redeploys on most PaaS free tiers
- Schema: `products(sku, name, category, price_inr, mrp_inr, dimensions_json, style_tags, finish, source_url, verified, embedding_vector)`

### 7.4 Deployment Checklist
- [ ] Secrets in environment variables, never committed
- [ ] CORS locked to production frontend domain
- [ ] Rate limiting active before any public link is shared
- [ ] Database migrations tracked (Alembic) rather than manual schema edits
- [ ] Basic logging/monitoring (even just structured console logs shipped to a free tier like Logtail) so failures are debuggable post-launch

---

## 8. API Contract (summary)

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/catalog` | GET | List/filter verified catalog products |
| `/api/optimize` | POST | Input: dimensions, budget, theme → Output: 3 bundles with placements |
| `/api/chat` | POST | Input: session_id, message → Output: agent reply + any updated bundle/placement |
| `/api/export` | POST | Input: bundle_id → Output: PDF quote URL |

---

## 9. Non-Functional Requirements

- **Performance:** 3D scene interactive within 3s of load on a mid-range laptop
- **Accessibility:** form inputs keyboard-navigable, sufficient contrast (verify grey-on-white text meets WCAG AA — `#525252` on white passes; anything lighter than `#8c8c8c` on white for body text does not, so restrict lighter greys to large text/decorative use only)
- **Responsiveness:** usable on mobile down to 375px width, with the 3D view given priority over secondary panels
- **Data integrity:** no fabricated product data ever reaches the UI — enforce `verified: true` as a required flag before a product is eligible for recommendation

---

## 10. Build Milestones

1. Verified catalog scraper (Playwright) + Postgres schema
2. Optimization engine (backend-only, tested against seed data)
3. Static 3D scene with placeholder placement (proves render pipeline + camera auto-fit)
4. Wire optimizer → 3D placement
5. Conversational agent with tool-calling
6. Sustainability calculator + PDF export
7. UI polish to spec (§5) across all screens
8. Deployment hardening (§7.4 checklist)
