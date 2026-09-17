"""
Single LLM Service Module (PRD §4.3, §7.1).
Conversational agent supporting local Ollama (default llama3.2) and Anthropic Claude
with native tool/function calling: reoptimize(), swap_item(), get_bundle_details().
Includes a high-speed deterministic intent router to bypass LLM calls for common operations
(budget math, specifications, theme switching, fixture swapping, basic arithmetic).
"""

import asyncio
import json
import logging
import re
from typing import Dict, Any, List, Optional

from backend.config import settings
from backend.db.session import SessionLocal
from backend.db.models import Product
from backend.services.optimizer import generate_optimized_bundles

logger = logging.getLogger("kohler.llm")

# In-memory session store (PRD FR-8)
SESSION_STORE: Dict[str, Dict[str, Any]] = {}

# Per-session asyncio locks
SESSION_LOCKS: Dict[str, asyncio.Semaphore] = {}

# Singleton Ollama AsyncClient instance
_ollama_client: Optional[Any] = None


def get_ollama_client() -> Any:
    """Return reusable singleton Ollama AsyncClient."""
    global _ollama_client
    if _ollama_client is None:
        import ollama
        _ollama_client = ollama.AsyncClient(
            host=settings.OLLAMA_BASE_URL,
            timeout=settings.API_TIMEOUT_SECONDS
        )
    return _ollama_client


async def warmup_llm():
    """Pre-warms the LLM model on backend startup to prevent cold-start latency."""
    mode = settings.get_llm_mode()
    if mode == "ollama":
        try:
            client = get_ollama_client()
            logger.info(f"[LLM Warmup] Pre-warming Ollama model '{settings.OLLAMA_MODEL}' with keep_alive={settings.OLLAMA_KEEP_ALIVE}...")
            await client.chat(
                model=settings.OLLAMA_MODEL,
                messages=[{"role": "user", "content": "hi"}],
                options={"num_predict": 1},
                keep_alive=settings.OLLAMA_KEEP_ALIVE
            )
            logger.info("[LLM Warmup] Ollama model warmed up successfully and resident in memory.")
        except Exception as e:
            logger.warning(f"[LLM Warmup] Ollama warm-up skipped / failed: {e}")


def _get_session_lock(session_id: str) -> asyncio.Semaphore:
    """Return (creating if absent) the per-session Ollama semaphore."""
    if session_id not in SESSION_LOCKS:
        SESSION_LOCKS[session_id] = asyncio.Semaphore(1)
    return SESSION_LOCKS[session_id]


# Tool definitions in OpenAI format (standard for Ollama)
OLLAMA_TOOLS: List[Dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "reoptimize",
            "description": "Recalculates Kohler bathroom bundle recommendations based on updated budget in INR, aesthetic theme, or room dimensions.",
            "parameters": {
                "type": "object",
                "properties": {
                    "budget_inr": {"type": "integer", "description": "Target total budget in INR (e.g. 80000, 150000, 300000)"},
                    "theme": {"type": "string", "enum": ["Minimalist Modern", "Classic Luxury", "Japanese Zen"], "description": "Target aesthetic theme"},
                    "length_ft": {"type": "number", "description": "Room length in feet"},
                    "width_ft": {"type": "number", "description": "Room width in feet"},
                    "include_bathtub": {"type": "boolean", "description": "Whether to include a bathtub in recommendations"},
                    "water_pressure": {"type": "string", "enum": ["low", "medium", "high"], "description": "Operating water pressure (low < 1.5 Bar, medium, high 3.0+ Bar)"},
                    "electrical_rough_in": {"type": "boolean", "description": "Whether 230V electrical rough-in is available for smart toilets/mirrors"},
                    "green_certification": {"type": "string", "enum": ["none", "leed", "griha"], "description": "Green building standard: none, leed, or griha"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "swap_item",
            "description": "Swaps a specific fixture within the active bathroom suite for an alternative verified product from the Kohler catalog.",
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {
                        "type": "string",
                        "enum": ["Washbasins", "Faucets", "Toilets", "Showers", "Bathtubs", "Mirrors & Cabinets"],
                        "description": "Category of fixture to swap"
                    },
                    "criteria": {
                        "type": "string",
                        "enum": ["cheaper", "premium", "zen", "modern", "luxury", "different"],
                        "description": "Selection criteria for the replacement item"
                    }
                },
                "required": ["category"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_bundle_details",
            "description": "Retrieves comprehensive specs, pricing, and EPA water conservation metrics for the currently active suite.",
            "parameters": {
                "type": "object",
                "properties": {
                    "bundle_id": {"type": "string", "description": "ID of the bundle (optional)"}
                }
            }
        }
    }
]

# Anthropic format derived directly from OLLAMA_TOOLS
CLAUDE_TOOLS: List[Dict[str, Any]] = [
    {
        "name": t["function"]["name"],
        "description": t["function"]["description"],
        "input_schema": t["function"]["parameters"]
    }
    for t in OLLAMA_TOOLS
]

SYSTEM_PROMPT = (
    "You are the official KOHLER AI Bathroom Designer assistant for Kohler India. "
    "Your mission is to help customers design their dream bathroom using real verified Kohler fixtures, "
    "adhering to aesthetic themes (Minimalist Modern, Classic Luxury, Japanese Zen), "
    "space constraints, and budget targets.\n\n"
    "CRITICAL RULES:\n"
    "1. Whenever the user requests layout modifications, style changes, or budget adjustments, "
    "call the appropriate tool (reoptimize or swap_item).\n"
    "2. Never invent product SKUs, prices, or layout dimensions.\n"
    "3. Keep conversational replies concise, elegant, and focused on Kohler luxury aesthetics."
)

TOOL_TRIGGER_PATTERN = re.compile(
    r"\b(reoptimi[sz]|optimi[sz]|swap|replace|cheaper|premium|budget|style|theme|"
    r"japanese|zen|luxury|modern|bathtub|details|specs|water saving|water conservation)\b",
    re.IGNORECASE,
)


def get_session(session_id: str) -> Dict[str, Any]:
    if session_id not in SESSION_STORE:
        SESSION_STORE[session_id] = {
            "history": [],
            "ollama_messages": [
                {"role": "system", "content": SYSTEM_PROMPT}
            ],
            "claude_messages": [],
            "current_params": {
                "length_ft": 10.0,
                "width_ft": 8.0,
                "budget_inr": 150000,
                "theme": "Minimalist Modern",
                "include_bathtub": False
            },
            "active_bundle": None
        }
    return SESSION_STORE[session_id]


def execute_tool_reoptimize(session: dict, args: dict) -> dict:
    params = session["current_params"]
    if "budget_inr" in args and args["budget_inr"]:
        params["budget_inr"] = int(args["budget_inr"])
    if "theme" in args and args["theme"]:
        params["theme"] = args["theme"]
    if "length_ft" in args and args["length_ft"]:
        params["length_ft"] = float(args["length_ft"])
    if "width_ft" in args and args["width_ft"]:
        params["width_ft"] = float(args["width_ft"])
    if "include_bathtub" in args and args["include_bathtub"] is not None:
        params["include_bathtub"] = bool(args["include_bathtub"])
    if "water_pressure" in args and args["water_pressure"]:
        params["water_pressure"] = args["water_pressure"]
    if "electrical_rough_in" in args and args["electrical_rough_in"] is not None:
        params["electrical_rough_in"] = bool(args["electrical_rough_in"])
    if "green_certification" in args and args["green_certification"]:
        params["green_certification"] = args["green_certification"]

    result = generate_optimized_bundles(
        length_ft=params["length_ft"],
        width_ft=params["width_ft"],
        budget_inr=params["budget_inr"],
        theme=params["theme"],
        include_bathtub=params["include_bathtub"],
        water_pressure=params.get("water_pressure", "medium"),
        electrical_rough_in=params.get("electrical_rough_in", True),
        green_certification=params.get("green_certification", "none"),
        sketch_layout=params.get("sketch_layout")
    )
    session["active_bundle"] = result["bundles"][1]
    return {
        "status": "success",
        "action": "reoptimize",
        "updated_params": params,
        "message": f"Re-optimized suite for {params['theme']} aesthetic within ₹{params['budget_inr']:,} budget.",
        "data": result
    }


def execute_tool_swap_item(session: dict, args: dict) -> dict:
    raw_cat = args.get("category", "Washbasins")
    criteria = args.get("criteria", "different")
    active_bundle = session.get("active_bundle")

    if not active_bundle:
        p = session["current_params"]
        res = generate_optimized_bundles(p["length_ft"], p["width_ft"], p["budget_inr"], p["theme"])
        active_bundle = res["bundles"][1]
        session["active_bundle"] = active_bundle

    cat_query = raw_cat
    for core_cat in ["Washbasins", "Faucets", "Toilets", "Showers", "Bathtubs", "Mirrors & Cabinets"]:
        if core_cat.lower() in raw_cat.lower():
            cat_query = core_cat
            break

    db = SessionLocal()
    candidates = db.query(Product).filter(Product.category == cat_query, Product.verified == True).all()
    db.close()

    if not candidates:
        return {"status": "error", "message": f"No alternative products found in catalog for {raw_cat}."}

    current_sku = None
    for f in active_bundle.get("fixtures", []):
        if f.get("category") == cat_query:
            current_sku = f.get("sku")
            break

    alt_candidates = [c for c in candidates if c.sku != current_sku]
    if not alt_candidates:
        alt_candidates = candidates

    if criteria == "cheaper":
        selected = sorted(alt_candidates, key=lambda p: p.price_inr)[0]
    elif criteria in ["premium", "luxury"]:
        selected = sorted(alt_candidates, key=lambda p: p.price_inr, reverse=True)[0]
    else:
        selected = alt_candidates[0]

    new_fixtures = []
    for f in active_bundle.get("fixtures", []):
        if f.get("category") == cat_query:
            new_f = selected.to_dict()
            new_f["position"] = f.get("position", [0, 0, 0])
            new_f["rotation"] = f.get("rotation", [0, 0, 0])
            new_fixtures.append(new_f)
        else:
            new_fixtures.append(f)

    active_bundle["fixtures"] = new_fixtures
    active_bundle["total_price_inr"] = sum(f["price_inr"] for f in new_fixtures)

    return {
        "status": "success",
        "action": "swap_item",
        "category": cat_query,
        "swapped_to": selected.name,
        "new_sku": selected.sku,
        "new_price_inr": selected.price_inr,
        "active_bundle": active_bundle,
        "message": f"Successfully swapped {cat_query} to {selected.name} (SKU: {selected.sku}) at ₹{selected.price_inr:,}."
    }


def execute_tool_get_bundle_details(session: dict, args: dict) -> dict:
    active = session.get("active_bundle")
    if not active:
        p = session["current_params"]
        res = generate_optimized_bundles(p["length_ft"], p["width_ft"], p["budget_inr"], p["theme"])
        active = res["bundles"][1]
        session["active_bundle"] = active

    return {
        "status": "success",
        "action": "get_bundle_details",
        "bundle_name": active.get("bundle_name"),
        "tier": active.get("tier"),
        "theme": active.get("theme"),
        "total_price_inr": active.get("total_price_inr"),
        "fixtures": [{"name": f["name"], "sku": f["sku"], "price_inr": f["price_inr"], "category": f["category"]} for f in active.get("fixtures", [])],
        "water_savings": active.get("water_savings")
    }


def execute_tool_call(tool_name: str, tool_args: dict, session: dict) -> dict:
    if tool_name == "reoptimize":
        return execute_tool_reoptimize(session, tool_args)
    elif tool_name == "swap_item":
        return execute_tool_swap_item(session, tool_args)
    elif tool_name == "get_bundle_details":
        return execute_tool_get_bundle_details(session, tool_args)
    else:
        return {"status": "error", "message": f"Unknown tool: {tool_name}"}


# =====================================================================
# DETERMINISTIC INTENT & ACTION ROUTING LAYER
# =====================================================================
def try_deterministic_routing(session: dict, message: str) -> Optional[Dict[str, Any]]:
    """
    Evaluates if the user query is a simple deterministic calculation, catalog query, or layout command.
    Returns the completed response dictionary if handled, or None to fall back to the LLM.
    Significantly cuts Ollama latency and cold starts for common user actions.
    """
    clean_msg = message.strip()
    msg_lower = clean_msg.lower()
    # Strip basic trailing punctuation
    msg_clean = re.sub(r"[\?\!\.\,]+$", "", msg_lower).strip()

    # 1. Greetings & System Capability queries
    if msg_clean in ["hi", "hello", "hey", "greetings", "good morning", "good evening", "namaste", "help", "who are you", "what can you do"]:
        reply = (
            "Hello! I am your **KOHLER AI Bathroom Designer** assistant. I can help you customize your bathroom layout, "
            "optimize for **Minimalist Modern**, **Classic Luxury**, or **Japanese Zen** aesthetics, swap fixtures, "
            "adjust your budget, enforce MEP & water-efficiency constraints, and analyze hand-drawn sketches."
        )
        return {
            "reply": reply,
            "tool_called": None,
            "tool_result": None,
            "active_bundle": session.get("active_bundle"),
            "current_params": session["current_params"]
        }

    # 2. Direct Arithmetic (e.g. "What is 2 + 3?", "2 + 3", "150000 * 0.8", "120000 - 30000")
    math_match = re.match(r"^(?:what\s+is\s+|calculate\s+)?([\d\.\s\+\-\*\/\(\)]+)\??$", clean_msg, re.IGNORECASE)
    if math_match:
        expr = math_match.group(1).strip()
        if re.search(r"[\+\-\*\/]", expr) and re.match(r"^[\d\.\s\+\-\*\/\(\)]+$", expr):
            try:
                # Safe restricted eval of purely numeric arithmetic expressions
                code = compile(expr, "<string>", "eval")
                for name in code.co_names:
                    raise ValueError(f"Disallowed expression symbol: {name}")
                res = eval(code, {"__builtins__": {}}, {})
                if isinstance(res, (int, float)):
                    reply = f"{expr} = {int(res):,}" if float(res).is_integer() else f"{expr} = {res:.2f}"
                    return {
                        "reply": reply,
                        "tool_called": None,
                        "tool_result": None,
                        "active_bundle": session.get("active_bundle"),
                        "current_params": session["current_params"]
                    }
            except Exception:
                pass

    # 3. Water conservation / water specs query
    if any(k in msg_lower for k in [
        "water conservation specs", "water specs", "water savings", "water saving",
        "show water conservation", "how much water", "water efficiency", "gallons saved", "liters saved"
    ]):
        tool_res = execute_tool_get_bundle_details(session, {})
        ws = tool_res.get("water_savings") or {}
        annual_gal = ws.get("annual_saved_gallons", 0)
        annual_lit = ws.get("annual_saved_litres") or ws.get("annual_saved_liters", 0)
        pct = ws.get("savings_pct", 0)
        reply = (
            f"💧 **Water Conservation Specifications for {tool_res.get('bundle_name')}:**\n\n"
            f"- **Annual Savings:** ~{annual_gal:,} Gallons ({annual_lit:,} Liters) saved per year\n"
            f"- **Efficiency Gain:** {pct}% reduction compared to baseline plumbing fixtures\n"
            f"- **Green Standard:** WaterSense / LEED v4 compliant high-efficiency flow fixtures"
        )
        return {
            "reply": reply,
            "tool_called": "get_bundle_details",
            "tool_result": tool_res,
            "active_bundle": session.get("active_bundle"),
            "current_params": session["current_params"]
        }

    # 4. Product specifications / suite catalog details
    if any(k in msg_lower for k in [
        "show product specifications", "product specifications", "fixture specifications",
        "show product specs", "product specs", "suite specs", "pricing details", "list products", "list fixtures", "catalog lookup"
    ]):
        tool_res = execute_tool_get_bundle_details(session, {})
        fixtures = tool_res.get("fixtures", [])
        total_p = tool_res.get("total_price_inr", 0)
        items_str = "\n".join([f"- **{f['category']}:** {f['name']} (SKU: `{f['sku']}`) — ₹{f['price_inr']:,}" for f in fixtures])
        reply = (
            f"📋 **{tool_res.get('bundle_name')} — Fixture Specifications:**\n\n"
            f"{items_str}\n\n"
            f"**Total Suite Price:** ₹{total_p:,} (includes GST & standard Kohler warranty)"
        )
        return {
            "reply": reply,
            "tool_called": "get_bundle_details",
            "tool_result": tool_res,
            "active_bundle": session.get("active_bundle"),
            "current_params": session["current_params"]
        }

    # 5. Percentage Budget Adjustments (e.g. "reduce budget by 20%", "increase budget by 10%")
    budget_pct_match = re.search(r"\b(reduce|decrease|cut|lower|increase|raise|boost)\s+(?:the\s+|total\s+)?budget\s+by\s+(\d+(?:\.\d+)?)%", msg_lower)
    if budget_pct_match:
        action, pct_str = budget_pct_match.groups()
        pct = float(pct_str) / 100.0
        current_b = session["current_params"].get("budget_inr", 150000)
        if action in ["reduce", "decrease", "cut", "lower"]:
            new_b = int(current_b * (1.0 - pct))
        else:
            new_b = int(current_b * (1.0 + pct))
        new_b = max(30000, min(1000000, new_b))
        tool_res = execute_tool_reoptimize(session, {"budget_inr": new_b})
        reply = f"I've adjusted your target budget by {pct_str}% to ₹{new_b:,} and re-optimized your Kohler suite recommendations."
        return {
            "reply": reply,
            "tool_called": "reoptimize",
            "tool_result": tool_res,
            "active_bundle": session.get("active_bundle"),
            "current_params": session["current_params"]
        }

    # 6. Direct Absolute Budget Set (e.g. "set budget to 80000", "reduce budget to Rs 75,000", "budget 200000", "budget 2 lakhs")
    budget_abs_match = re.search(r"\b(?:set|change|make|reduce|increase)?\s*(?:the\s+|total\s+)?budget\s+(?:to\s+|is\s+|of\s+)?(?:rs\.?|inr|₹)?\s*(\d{1,3}(?:,\d{3})*|\d+(?:\.\d+)?)\s*(k|lakh|lakhs)?\b", msg_lower)
    if budget_abs_match and not budget_pct_match:
        raw_val = budget_abs_match.group(1).replace(",", "")
        unit = (budget_abs_match.group(2) or "").lower()
        try:
            val = float(raw_val)
            if unit == "k" or ("k" in msg_lower and val < 1000):
                val *= 1000
            elif unit in ["lakh", "lakhs"] or ("lakh" in msg_lower and val < 100):
                val *= 100000
            val_int = int(val)
            if 20000 <= val_int <= 2500000:
                tool_res = execute_tool_reoptimize(session, {"budget_inr": val_int})
                reply = f"Target budget updated to ₹{val_int:,}. Generated new optimized Kohler bathroom suites matching this budget."
                return {
                    "reply": reply,
                    "tool_called": "reoptimize",
                    "tool_result": tool_res,
                    "active_bundle": session.get("active_bundle"),
                    "current_params": session["current_params"]
                }
        except ValueError:
            pass

    # 7. Direct Room Dimension Adjustments (e.g. "set dimensions to 12x10", "make room 12 by 8", "change length to 14")
    dim_match = re.search(r"\b(?:dimensions|room\s+size|size)\s+(?:to\s+|is\s+)?(\d+(?:\.\d+)?)\s*(?:x|by|\*)\s*(\d+(?:\.\d+)?)\b", msg_lower)
    if dim_match:
        l_val, w_val = float(dim_match.group(1)), float(dim_match.group(2))
        if 5.0 <= l_val <= 30.0 and 4.0 <= w_val <= 25.0:
            tool_res = execute_tool_reoptimize(session, {"length_ft": l_val, "width_ft": w_val})
            reply = f"Updated room dimensions to **{l_val} ft × {w_val} ft** ({int(l_val*w_val)} sq ft) and recalculated fixture placements."
            return {
                "reply": reply,
                "tool_called": "reoptimize",
                "tool_result": tool_res,
                "active_bundle": session.get("active_bundle"),
                "current_params": session["current_params"]
            }

    # 8. Direct Theme / Aesthetic Switch
    theme_targets = {
        "japanese zen": "Japanese Zen",
        "zen style": "Japanese Zen",
        "zen theme": "Japanese Zen",
        "zen aesthetic": "Japanese Zen",
        "zen": "Japanese Zen",
        "classic luxury": "Classic Luxury",
        "luxury theme": "Classic Luxury",
        "luxury style": "Classic Luxury",
        "classic style": "Classic Luxury",
        "minimalist modern": "Minimalist Modern",
        "modern theme": "Minimalist Modern",
        "modern style": "Minimalist Modern",
        "modern": "Minimalist Modern"
    }
    for phrase, target_theme in theme_targets.items():
        # Match whole word / phrase bounds
        if re.search(r"\b" + re.escape(phrase) + r"\b", msg_lower):
            tool_res = execute_tool_reoptimize(session, {"theme": target_theme})
            reply = f"Switched aesthetic theme to **{target_theme}**. Re-curated fixtures with matching Kohler design language and finishes."
            return {
                "reply": reply,
                "tool_called": "reoptimize",
                "tool_result": tool_res,
                "active_bundle": session.get("active_bundle"),
                "current_params": session["current_params"]
            }

    # 9. Bathtub Inclusion / Removal Toggle
    if any(k in msg_lower for k in ["add bathtub", "include bathtub", "add tub", "include tub", "with bathtub", "with tub"]):
        tool_res = execute_tool_reoptimize(session, {"include_bathtub": True})
        reply = "Added a freestanding Kohler bathtub to your suite configuration and updated 3D clearance."
        return {
            "reply": reply,
            "tool_called": "reoptimize",
            "tool_result": tool_res,
            "active_bundle": session.get("active_bundle"),
            "current_params": session["current_params"]
        }
    if any(k in msg_lower for k in ["remove bathtub", "exclude bathtub", "no bathtub", "without bathtub", "remove tub", "without tub", "no tub"]):
        tool_res = execute_tool_reoptimize(session, {"include_bathtub": False})
        reply = "Removed the bathtub from recommendations to optimize space for shower and grooming zones."
        return {
            "reply": reply,
            "tool_called": "reoptimize",
            "tool_result": tool_res,
            "active_bundle": session.get("active_bundle"),
            "current_params": session["current_params"]
        }

    # 10. Clear Sketch Layout
    if any(k in msg_lower for k in ["clear sketch", "reset sketch", "remove sketch", "delete sketch layout", "reset layout"]):
        params = session["current_params"]
        params.pop("sketch_layout", None)
        params.pop("sketch_history_id", None)
        tool_res = execute_tool_reoptimize(session, {})
        reply = "Cleared sketch-derived layout constraints. Suite re-optimized using default architectural placement rules."
        return {
            "reply": reply,
            "tool_called": "reoptimize",
            "tool_result": tool_res,
            "active_bundle": session.get("active_bundle"),
            "current_params": session["current_params"]
        }

    # 11. Fixture Swap Commands (e.g. "swap faucet to luxury", "swap toilet to cheaper", "replace shower", "change vanity")
    swap_match = re.search(r"\b(swap|replace|change)\s+(?:the\s+|my\s+)?(faucet|tap|toilet|commode|wc|washbasin|basin|sink|vanity|shower|mirror|bathtub|tub)(?:\s+(?:to|for|with)\s+(?:a\s+)?(cheaper|premium|luxury|zen|modern|different))?", msg_lower)
    if swap_match:
        _, raw_category, raw_crit = swap_match.groups()
        cat_map = {
            "faucet": "Faucets", "tap": "Faucets",
            "toilet": "Toilets", "commode": "Toilets", "wc": "Toilets",
            "washbasin": "Washbasins", "basin": "Washbasins", "sink": "Washbasins", "vanity": "Washbasins",
            "shower": "Showers",
            "mirror": "Mirrors & Cabinets",
            "bathtub": "Bathtubs", "tub": "Bathtubs"
        }
        category = cat_map.get(raw_category, "Washbasins")
        criteria = raw_crit if raw_crit in ["cheaper", "premium", "luxury", "zen", "modern"] else "different"
        tool_res = execute_tool_swap_item(session, {"category": category, "criteria": criteria})
        return {
            "reply": tool_res.get("message", f"Swapped {category} successfully."),
            "tool_called": "swap_item",
            "tool_result": tool_res,
            "active_bundle": session.get("active_bundle"),
            "current_params": session["current_params"]
        }

    return None


async def _process_with_ollama(session: dict, message: str, session_id: str = "") -> Dict[str, Any]:
    client = get_ollama_client()
    ollama_msgs = session["ollama_messages"]
    ollama_msgs.append({"role": "user", "content": message})

    # Limit context window to system prompt + last 4 conversational messages to keep prompt lightweight & fast
    if len(ollama_msgs) > 5:
        ollama_msgs = [ollama_msgs[0]] + ollama_msgs[-4:]
        session["ollama_messages"] = ollama_msgs

    logger.info(f"[LLM Agent] Invoking Ollama ({settings.OLLAMA_MODEL}) with tools. User: {message!r}")

    slot = _get_session_lock(session_id)

    async def chat_with_timeout(timeout_seconds=20, **kwargs):
        try:
            await asyncio.wait_for(slot.acquire(), timeout=timeout_seconds)
        except asyncio.TimeoutError as exc:
            raise TimeoutError("Ollama is busy processing another request in this session.") from exc
        try:
            return await asyncio.wait_for(
                client.chat(keep_alive=settings.OLLAMA_KEEP_ALIVE, **kwargs),
                timeout=timeout_seconds
            )
        except asyncio.TimeoutError as exc:
            raise TimeoutError(f"Ollama did not respond within {timeout_seconds} seconds.") from exc
        finally:
            slot.release()

    request_args = {
        "model": settings.OLLAMA_MODEL,
        "messages": ollama_msgs,
        "options": {"num_predict": 256, "temperature": 0.2},
    }
    if TOOL_TRIGGER_PATTERN.search(message):
        request_args["tools"] = OLLAMA_TOOLS

    try:
        response = await chat_with_timeout(**request_args)
    except TimeoutError as exc:
        err_msg = str(exc)
        logger.warning(f"[LLM Agent] Initial Ollama call timed out: {err_msg}")
        return {
            "reply": (
                "The AI model took too long to respond. "
                "Ollama may still be loading — please wait a moment and try again."
            ),
            "tool_called": None,
            "tool_result": None,
            "active_bundle": session.get("active_bundle"),
            "current_params": session["current_params"],
            "error": err_msg,
        }

    executed_tool = None
    tool_res = None
    final_reply = ""

    if response.message.tool_calls:
        # Execute tool calls directly and build clean luxury designer reply without a 2nd LLM roundtrip
        for tc in response.message.tool_calls:
            tool_name = tc.function.name
            tool_args = tc.function.arguments or {}
            executed_tool = tool_name
            tool_res = execute_tool_call(tool_name, tool_args, session)

        final_reply = tool_res.get("message", "Action completed successfully.")
        ollama_msgs.append({"role": "assistant", "content": final_reply})
    else:
        final_reply = response.message.content or ""
        ollama_msgs.append({"role": "assistant", "content": final_reply})

    session["history"].append({"role": "assistant", "content": final_reply})
    logger.info(f"[LLM Agent] Ollama complete. Tool called: {executed_tool}. Reply length: {len(final_reply)}")

    return {
        "reply": final_reply,
        "tool_called": executed_tool,
        "tool_result": tool_res,
        "active_bundle": session.get("active_bundle"),
        "current_params": session["current_params"]
    }


async def _process_with_anthropic(session: dict, message: str) -> Dict[str, Any]:
    import anthropic

    api_key = settings.get_anthropic_api_key()
    client = anthropic.Anthropic(api_key=api_key, timeout=30.0)
    claude_msgs = session["claude_messages"]
    claude_msgs.append({"role": "user", "content": message})

    if len(claude_msgs) > 6:
        claude_msgs = claude_msgs[-6:]
        session["claude_messages"] = claude_msgs

    logger.info(f"[LLM Agent] Invoking Anthropic Claude API with tools. User: {message!r}")

    response = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        tools=CLAUDE_TOOLS,
        messages=claude_msgs
    )

    executed_tool = None
    tool_res = None
    final_reply = ""

    if response.stop_reason == "tool_use":
        assistant_content = response.content
        claude_msgs.append({"role": "assistant", "content": assistant_content})

        tool_results_content = []
        for block in assistant_content:
            if block.type == "tool_use":
                executed_tool = block.name
                tool_input = block.input
                tool_res = execute_tool_call(executed_tool, tool_input, session)
                tool_results_content.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": json.dumps(tool_res)
                })

        claude_msgs.append({"role": "user", "content": tool_results_content})

        followup = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            tools=CLAUDE_TOOLS,
            messages=claude_msgs
        )
        for b in followup.content:
            if b.type == "text":
                final_reply += b.text
        claude_msgs.append({"role": "assistant", "content": final_reply})
    else:
        for b in response.content:
            if b.type == "text":
                final_reply += b.text
        claude_msgs.append({"role": "assistant", "content": final_reply})

    session["history"].append({"role": "assistant", "content": final_reply})
    logger.info(f"[LLM Agent] Claude complete. Tool called: {executed_tool}. Reply length: {len(final_reply)}")

    return {
        "reply": final_reply,
        "tool_called": executed_tool,
        "tool_result": tool_res,
        "active_bundle": session.get("active_bundle"),
        "current_params": session["current_params"]
    }


async def process_chat_message(
    session_id: str,
    message: str,
    active_bundle: Optional[dict] = None,
    current_params: Optional[dict] = None
) -> Dict[str, Any]:
    """
    Processes a conversational turn with native tool calling (PRD §4.3).
    Routes deterministic requests (math, budget calc, theme toggle, specs) directly to backend logic.
    For reasoning / ambiguous queries, routes to Anthropic Claude or local Ollama engine.
    """
    session = get_session(session_id)
    if active_bundle:
        session["active_bundle"] = active_bundle
    if current_params:
        session["current_params"].update(current_params)

    # 1. High-speed deterministic intent routing check
    deterministic_res = try_deterministic_routing(session, message)
    if deterministic_res:
        session["history"].append({"role": "user", "content": message})
        session["history"].append({"role": "assistant", "content": deterministic_res["reply"]})
        logger.info(f"[LLM Agent] Handled deterministically: {message!r}")
        return deterministic_res

    # 2. Otherwise route to LLM for conversational reasoning
    session["history"].append({"role": "user", "content": message})

    mode = settings.get_llm_mode()
    if mode == "anthropic":
        return await _process_with_anthropic(session, message)
    elif mode == "ollama":
        return await _process_with_ollama(session, message, session_id=session_id)
    else:
        err = (
            "No LLM configured. Please configure ANTHROPIC_API_KEY in backend/.env "
            f"or start Ollama locally at {settings.OLLAMA_BASE_URL} with model '{settings.OLLAMA_MODEL}'."
        )
        logger.error(f"[LLM Agent] {err}")
        raise RuntimeError(err)

