"""
Sustainability & Water Savings Calculator (FR-9).
Computes annual water savings (litres & gallons) vs standard baseline fixtures.
Based on EPA WaterSense & Kohler published efficiency metrics.
"""

# Baseline fixture consumptions
BASELINE_TOILET_LPF = 6.0       # Standard conventional toilet (6 Litres per flush)
BASELINE_SHOWER_LPM = 15.0      # Standard conventional showerhead (15 Litres per minute)
BASELINE_FAUCET_LPM = 8.3       # Standard conventional faucet (8.3 Litres per minute)

# Usage assumptions (household of 3-4 persons)
ANNUAL_FLUSHES_PER_HOME = 7300       # ~20 flushes per day
ANNUAL_SHOWER_MINUTES_PER_HOME = 8760 # ~24 minutes shower time per day (3 x 8 min)
ANNUAL_FAUCET_MINUTES_PER_HOME = 5475 # ~15 minutes faucet running time per day

LITRE_TO_GALLON = 0.264172
AVG_WATER_COST_PER_KILOLITRE_INR = 45.0  # Typical urban municipal water & pumping cost

def calculate_bundle_water_savings(fixtures):
    """
    Computes annual water savings for a selected bundle of fixtures.
    """
    total_saved_litres = 0.0
    details = []

    for f in fixtures:
        cat = f.get("category", "")
        flow = f.get("flow_rate_lpm")
        name = f.get("name", "")

        if cat == "Toilets":
            # Kohler dual flush or smart toilet averages 3.6 to 4.8 LPF
            actual_lpf = flow if (flow and flow < 6.0) else 3.8
            saved = (BASELINE_TOILET_LPF - actual_lpf) * ANNUAL_FLUSHES_PER_HOME
            if saved > 0:
                total_saved_litres += saved
                details.append({
                    "fixture": name,
                    "type": "Toilet",
                    "baseline": f"{BASELINE_TOILET_LPF} LPF",
                    "kohler_efficiency": f"{actual_lpf:.1f} LPF",
                    "annual_saved_litres": round(saved)
                })

        elif cat == "Showers":
            # Kohler efficient showerheads (e.g. 8.7 to 9.5 LPM vs 15.0 baseline)
            actual_lpm = flow if flow else 9.5
            if actual_lpm < BASELINE_SHOWER_LPM:
                saved = (BASELINE_SHOWER_LPM - actual_lpm) * ANNUAL_SHOWER_MINUTES_PER_HOME
                total_saved_litres += saved
                details.append({
                    "fixture": name,
                    "type": "Showerhead",
                    "baseline": f"{BASELINE_SHOWER_LPM} LPM",
                    "kohler_efficiency": f"{actual_lpm:.1f} LPM",
                    "annual_saved_litres": round(saved)
                })

        elif cat == "Faucets":
            # Kohler aerated faucets (e.g. 4.5 to 8.3 LPM)
            actual_lpm = flow if flow else 5.5
            if actual_lpm < BASELINE_FAUCET_LPM:
                saved = (BASELINE_FAUCET_LPM - actual_lpm) * ANNUAL_FAUCET_MINUTES_PER_HOME
                total_saved_litres += saved
                details.append({
                    "fixture": name,
                    "type": "Faucet",
                    "baseline": f"{BASELINE_FAUCET_LPM} LPM",
                    "kohler_efficiency": f"{actual_lpm:.1f} LPM",
                    "annual_saved_litres": round(saved)
                })

    annual_gallons = round(total_saved_litres * LITRE_TO_GALLON)
    annual_inr_saved = round((total_saved_litres / 1000.0) * AVG_WATER_COST_PER_KILOLITRE_INR)

    return {
        "annual_saved_litres": round(total_saved_litres),
        "annual_saved_gallons": annual_gallons,
        "annual_saved_inr": annual_inr_saved,
        "co2_reduction_kg": round(total_saved_litres * 0.0003, 1), # Water pumping carbon footprint reduction
        "details": details,
        "badge_text": f"{annual_gallons:,} Gallons / {round(total_saved_litres):,} L saved/yr"
    }
