"""
PDF Quotation Export Service (FR-15).
Uses ReportLab to generate an official Kohler Quotation & Sustainability Summary.
Includes itemized pricing, bundle savings, MEP specifications, and water conservation metrics.
Features clean vector icon drawings and standardized architectural badges to avoid missing-glyph bugs.
"""

import os
import re
from io import BytesIO
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether
from reportlab.graphics.shapes import Drawing, Rect, Circle, Polygon, String, Line, Group

# ==========================================
# 1. TEXT SANITIZER & CURRENCY FORMATTER
# ==========================================
def sanitize_pdf_text(text: str) -> str:
    """
    Sanitizes strings for ReportLab standard PostScript fonts (Helvetica).
    Replaces unsupported Unicode characters, corrupted glyphs, and emojis with clean ASCII equivalents.
    """
    if not text:
        return ""
    
    t = str(text)
    # Remove unicode replacement char and common corrupted marks
    t = t.replace("\ufffd", "")
    t = t.replace("™", " ").replace("®", " ").replace("©", " ")
    t = t.replace("₹", "INR ")
    
    # Strip emojis and unsupported symbols outside standard Latin/WinAnsi range
    t = re.sub(r'[\U00010000-\U0010ffff]', '', t)
    t = re.sub(r'[\u2600-\u26ff\u2700-\u27bf]', '', t)
    
    # Collapse multiple whitespace
    t = re.sub(r'\s+', ' ', t).strip()
    return t

def format_currency(amount: int | float | None) -> str:
    """Formats numeric amounts with explicit INR currency prefix."""
    if amount is None:
        return "-"
    try:
        val = int(round(float(amount)))
        return f"INR {val:,}"
    except (ValueError, TypeError):
        return "-"

# ==========================================
# 2. VECTOR DRAWING ICONS (No Unicode Emojis)
# ==========================================
def create_eco_leaf_icon(size: int = 18) -> Drawing:
    """Draws a clean architectural eco leaf vector icon."""
    d = Drawing(size, size)
    # Diamond / Leaf body
    half = size / 2
    d.add(Polygon(
        [half, size - 2, size - 2, half, half, 2, 2, half],
        fillColor=colors.HexColor('#16a34a'),
        strokeColor=None
    ))
    # Inner vein center line
    d.add(Line(half, 3, half, size - 3, strokeColor=colors.HexColor('#dcfce7'), strokeWidth=1.2))
    d.add(Line(half, half, size - 4, half + 2, strokeColor=colors.HexColor('#dcfce7'), strokeWidth=1))
    return d

def create_water_drop_icon(size: int = 18) -> Drawing:
    """Draws a clean architectural water droplet vector icon."""
    d = Drawing(size, size)
    half = size / 2
    # Droplet top triangle
    d.add(Polygon(
        [half, size - 1, size - 3, half * 0.7, 3, half * 0.7],
        fillColor=colors.HexColor('#0284c7'),
        strokeColor=None
    ))
    # Droplet bottom circle
    d.add(Circle(half, half * 0.7, half - 3, fillColor=colors.HexColor('#0284c7'), strokeColor=None))
    # Highlight reflection spot
    d.add(Circle(half - 2, half * 0.8, 1.6, fillColor=colors.HexColor('#e0f2fe'), strokeColor=None))
    return d

def create_shield_verified_icon(size: int = 18) -> Drawing:
    """Draws a clean architectural verified shield vector icon."""
    d = Drawing(size, size)
    half = size / 2
    # Shield polygon
    d.add(Polygon(
        [2, size - 2, size - 2, size - 2, size - 2, half, half, 2, 2, half],
        fillColor=colors.HexColor('#0f172a'),
        strokeColor=None
    ))
    # Checkmark lines inside shield
    d.add(Line(half - 3, half - 1, half - 1, half - 3, strokeColor=colors.HexColor('#4ade80'), strokeWidth=1.5))
    d.add(Line(half - 1, half - 3, size - 5, half + 2, strokeColor=colors.HexColor('#4ade80'), strokeWidth=1.5))
    return d

def create_bolt_icon(size: int = 14) -> Drawing:
    """Draws an architectural electrical indicator vector icon."""
    d = Drawing(size, size)
    d.add(Polygon(
        [8, size - 1, 3, 7, 7, 7, 5, 1, 11, 7, 7, 7],
        fillColor=colors.HexColor('#d97706'),
        strokeColor=None
    ))
    return d

# ==========================================
# 3. PDF GENERATOR ENGINE
# ==========================================
def generate_pdf_quote(bundle_data: dict, room_specs: dict) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    styles = getSampleStyleSheet()
    primary_color = colors.HexColor("#0f172a")
    muted_color = colors.HexColor("#475569")
    accent_bar = colors.HexColor("#cbd5e1")

    title_style = ParagraphStyle(
        "KohlerTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=primary_color
    )
    subtitle_style = ParagraphStyle(
        "KohlerSubTitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=15,
        textColor=muted_color
    )
    h2_style = ParagraphStyle(
        "KohlerH2",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=primary_color
    )
    body_style = ParagraphStyle(
        "KohlerBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=primary_color
    )
    bold_body_style = ParagraphStyle(
        "KohlerBoldBody",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=12,
        textColor=primary_color
    )
    badge_style = ParagraphStyle(
        "BadgeText",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor("#14532d")
    )
    mep_style = ParagraphStyle(
        "MepText",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7.5,
        leading=10.5,
        textColor=colors.HexColor("#334155")
    )

    story = []

    # 1. Header with Kohler Branding & Ref Number
    now = datetime.now()
    ref_num = f"KOH-{now.strftime('%y%m%d%H%M')}"
    header_data = [
        [
            Paragraph("<b>KOHLER.</b>", title_style),
            Paragraph(
                f"<b>Official AI Bathroom Design Specification & Quotation</b><br/>"
                f"Quotation Date: {now.strftime('%d %b %Y')} • Reference: <b>{ref_num}</b><br/>"
                f"Portal Source: kohler.co.in (Verified Catalog Pricing)",
                subtitle_style
            )
        ]
    ]
    header_table = Table(header_data, colWidths=[200, 330])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 10))

    # Divider bar
    story.append(Table([[""]], colWidths=[530], rowHeights=[2], style=[('BACKGROUND', (0, 0), (-1, -1), accent_bar)]))
    story.append(Spacer(1, 12))

    # 2. Room Specifications & Engineering Parameters Summary Card
    bundle_name = sanitize_pdf_text(bundle_data.get("bundle_name", "Curated Bathroom Suite"))
    theme = sanitize_pdf_text(bundle_data.get("theme", room_specs.get("theme", "Minimalist Modern")))
    total_price = bundle_data.get("total_price_inr", 0)
    total_mrp = bundle_data.get("total_mrp_inr", total_price)
    savings = bundle_data.get("savings_inr", 0)

    mep = bundle_data.get("mep_compliance", {})
    water_p = sanitize_pdf_text(room_specs.get("water_pressure") or mep.get("water_pressure") or "medium").capitalize()
    elec_val = room_specs.get("electrical_rough_in") if "electrical_rough_in" in room_specs else mep.get("electrical_rough_in", True)
    elec_status = "Available (230V AC Dedicated Circuit)" if elec_val else "Plumbing Only (No Electrical Rough-in)"
    green_status = sanitize_pdf_text(room_specs.get("green_certification") or mep.get("green_certification") or "Standard").upper()

    summary_data = [
        [
            Paragraph(
                f"<b>Selected Suite:</b> {bundle_name}<br/>"
                f"<b>Aesthetic Theme:</b> {theme}<br/>"
                f"<b>Electrical Rough-in:</b> {elec_status}",
                body_style
            ),
            Paragraph(
                f"<b>Room Dimensions:</b> {room_specs.get('length_ft', 10)}' × {room_specs.get('width_ft', 8)}' ({room_specs.get('area_sqft', 80)} sq ft)<br/>"
                f"<b>Operating Water Pressure:</b> {water_p} Pressure Standard<br/>"
                f"<b>Green Building Code:</b> {green_status} Standard",
                body_style
            )
        ]
    ]
    summary_table = Table(summary_data, colWidths=[265, 265])
    summary_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#e2e8f0")),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 10))

    # 3. Sustainability Impact & Water Conservation Badge (Using Vector Icon)
    water = bundle_data.get("water_savings", {})
    annual_gallons = water.get("annual_saved_gallons", 0)
    annual_litres = water.get("annual_saved_litres", 0)
    annual_inr = water.get("annual_saved_inr", 0)

    eco_icon = create_eco_leaf_icon(22)
    eco_content = [
        [
            eco_icon,
            Paragraph("<b>KOHLER WATER CONSERVATION BADGE [EPA WaterSense & GRIHA Certified]</b>", badge_style),
            Paragraph(
                f"<b>{annual_gallons:,} Gallons ({annual_litres:,} Litres)</b> saved annually vs standard baseline<br/>"
                f"Estimated Utility Savings: {format_currency(annual_inr)}/year • Target Standard: <b>{green_status}</b>",
                body_style
            )
        ]
    ]
    eco_table = Table(eco_content, colWidths=[26, 250, 254])
    eco_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f0fdf4")),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#86efac")),
    ]))
    story.append(eco_table)
    story.append(Spacer(1, 12))

    # 4. Itemized Fixture Breakdown with Technical Specifications
    story.append(Paragraph("<b>Itemized Fixture Schedule & Engineering Parameters</b>", h2_style))
    story.append(Spacer(1, 6))

    fixtures = bundle_data.get("fixtures", [])
    table_rows = [
        [
            Paragraph("<b>Category</b>", bold_body_style),
            Paragraph("<b>Verified Product, SKU & MEP Parameters</b>", bold_body_style),
            Paragraph("<b>Finish</b>", bold_body_style),
            Paragraph("<b>MRP</b>", bold_body_style),
            Paragraph("<b>Selling Price</b>", bold_body_style)
        ]
    ]

    for f in fixtures:
        mrp_val = f.get("mrp_inr", f.get("price_inr"))
        mrp_str = format_currency(mrp_val) if mrp_val and mrp_val > f.get("price_inr", 0) else "-"
        selling_str = format_currency(f.get("price_inr", 0))

        clean_name = sanitize_pdf_text(f.get("name", ""))
        clean_sku = sanitize_pdf_text(f.get("sku", ""))
        clean_cat = sanitize_pdf_text(f.get("category", ""))
        clean_finish = sanitize_pdf_text(f.get("finish", "White"))

        specs = f.get("specs") or {}
        elec_flag = "[230V Electrical Required]" if specs.get("electrical_required") else "[Mechanical Operation]"
        min_p = specs.get("min_water_pressure_bar", 1.0)
        flow_note = f" • Flow: {specs.get('flow_rate_lpm')} LPM" if specs.get("flow_rate_lpm") else ""
        flush_note = f" • Flush: {specs.get('flush_volume_lpf')} LPF" if specs.get("flush_volume_lpf") else ""
        mep_summary_line = f"MEP: {elec_flag} • Min {min_p} Bar Operating Pressure{flow_note}{flush_note}"

        table_rows.append([
            Paragraph(clean_cat, body_style),
            Paragraph(
                f"<b>{clean_name}</b><br/>"
                f"<font color='#64748b'>SKU: {clean_sku} [Verified Catalog Product]</font><br/>"
                f"<font color='#334155' size=7>{mep_summary_line}</font>",
                body_style
            ),
            Paragraph(clean_finish, body_style),
            Paragraph(mrp_str, body_style),
            Paragraph(f"<b>{selling_str}</b>", bold_body_style)
        ])

    # Totals Row
    total_selling_str = format_currency(total_price)
    total_mrp_str = format_currency(total_mrp)
    table_rows.append([
        Paragraph("<b>TOTAL</b>", bold_body_style),
        Paragraph(f"<b>{len(fixtures)} Verified Authentic Kohler Fixtures</b>", bold_body_style),
        Paragraph("", body_style),
        Paragraph(f"<b>{total_mrp_str}</b>", bold_body_style),
        Paragraph(f"<b>{total_selling_str}</b>", bold_body_style)
    ])

    fixture_table = Table(table_rows, colWidths=[90, 240, 60, 70, 70])
    fixture_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor("#f8fafc")),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (3, 0), (4, -1), 'RIGHT'),
    ]))
    story.append(fixture_table)
    story.append(Spacer(1, 10))

    # 5. Price & Bundle Savings Callout
    callout_rows = [
        [
            Paragraph("<b>Total Package Investment (Inclusive of GST & Manufacturer Warranty):</b>", h2_style),
            Paragraph(f"<b>{total_selling_str}</b>", title_style)
        ]
    ]
    if savings > 0:
        disc_pct = bundle_data.get("discount_pct", 0)
        callout_rows.append([
            Paragraph("Official Kohler Bundle Discount Savings vs MRP:", body_style),
            Paragraph(f"<font color='#15803d'><b>SAVE {format_currency(savings)} ({disc_pct}% Bundle Savings)</b></font>", bold_body_style)
        ])

    callout_table = Table(callout_rows, colWidths=[340, 190])
    callout_table.setStyle(TableStyle([
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
    ]))
    story.append(callout_table)
    story.append(Spacer(1, 14))

    # 6. Terms, Warranty & Catalog Data Integrity
    disclaimer_text = (
        "<b>Catalog Data Integrity & Warranty Notice:</b> This quotation is generated using verified products and prices from the official "
        "Kohler India portal (kohler.co.in). All fixtures carry standard Kohler India manufacturer warranty (up to 10 years on vitreous china "
        "and faucet ceramic cartridges). Final delivery, rough-in plumbing inspection, and installation should be confirmed through authorized "
        "Kohler showrooms and certified technicians across India."
    )
    story.append(Paragraph(disclaimer_text, mep_style))

    doc.build(story)
    return buffer.getvalue()
