"""
Aureos AI — Satellite Intelligence Engine
============================================
Alternative-data layer that mirrors what institutional commodity desks buy from
providers like Kpler, Windward, MarineTraffic and Orbital Insight: satellite-derived
signals on physical movement of oil tankers, floating storage, and port congestion.

This module currently ships with a realistic SIMULATION so the feature is fully
usable end-to-end today. Swapping to a real provider later only requires replacing
the `_fetch_*` functions below with actual API calls — the response shape for the
rest of the app stays identical.

Real providers to integrate later (documented for when you're ready to go live):
  - Kpler (kpler.com)            — tanker tracking, floating storage, crude flows
  - Windward (windward.ai)       — vessel AIS + satellite fusion, dark-ship detection
  - MarineTraffic (marinetraffic.com) — AIS positions, port calls (has a paid API)
  - Orbital Insight / SpaceKnow  — satellite imagery analytics (storage tank shadows,
                                    parking-lot counts, industrial activity)
"""

import random
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Dict, List

# ── Reference data: major oil chokepoints & routes ─────────────────────────
CHOKEPOINTS = [
    {"id": "hormuz",    "name": "Estreito de Ormuz",      "region": "Golfo Pérsico",   "daily_flow_bpd": 21_000_000, "lat": 26.57, "lon": 56.25},
    {"id": "malacca",   "name": "Estreito de Malaca",      "region": "Sudeste Asiático","daily_flow_bpd": 16_000_000, "lat": 2.86,  "lon": 101.35},
    {"id": "suez",      "name": "Canal de Suez",           "region": "Egito",           "daily_flow_bpd": 9_000_000,  "lat": 30.44, "lon": 32.34},
    {"id": "bab_el_mandeb", "name": "Bab el-Mandeb", "region": "Mar Vermelho",           "daily_flow_bpd": 8_000_000,  "lat": 12.58, "lon": 43.32},
    {"id": "bosphorus", "name": "Estreito do Bósforo",     "region": "Turquia",         "daily_flow_bpd": 3_000_000,  "lat": 41.11, "lon": 29.06},
    {"id": "panama",    "name": "Canal do Panamá",         "region": "América Central", "daily_flow_bpd": 900_000,    "lat": 9.08,  "lon": -79.68},
]

MAJOR_PORTS = [
    {"id": "ras_tanura", "name": "Ras Tanura",        "country": "Arábia Saudita", "type": "loading",  "lat": 26.64, "lon": 50.16},
    {"id": "houston",    "name": "Houston",            "country": "EUA",            "type": "loading",  "lat": 29.75, "lon": -95.36},
    {"id": "rotterdam",  "name": "Rotterdam",          "country": "Holanda",        "type": "discharge", "lat": 51.95, "lon": 4.14},
    {"id": "ningbo",     "name": "Ningbo-Zhoushan",    "country": "China",          "type": "discharge", "lat": 29.87, "lon": 121.55},
    {"id": "novorossiysk","name": "Novorossiysk",      "country": "Rússia",         "type": "loading",  "lat": 44.72, "lon": 37.77},
    {"id": "fujairah",   "name": "Fujairah",           "country": "EAU",            "type": "storage",   "lat": 25.11, "lon": 56.34},
]

VESSEL_TYPES = ["VLCC", "Suezmax", "Aframax", "Panamax", "Product Tanker"]
FLAG_STATES = ["Panamá", "Libéria", "Ilhas Marshall", "Malta", "Singapura"]


def _seeded_random(seed_key: str) -> random.Random:
    """Deterministic-per-hour randomness so numbers don't jump on every refresh."""
    hour_bucket = datetime.now(timezone.utc).strftime("%Y%m%d%H")
    seed = int(hashlib.sha256(f"{seed_key}{hour_bucket}".encode()).hexdigest()[:8], 16)
    return random.Random(seed)


# ══════════════════════════════════════════════════════════════════════════
# 1. CHOKEPOINT TRAFFIC — flow anomalies at major oil transit points
# ══════════════════════════════════════════════════════════════════════════

def get_chokepoint_status() -> Dict:
    """Traffic and anomaly status at the world's major oil transit chokepoints."""
    rows = []
    for cp in CHOKEPOINTS:
        rng = _seeded_random(cp["id"])
        baseline_vessels = rng.randint(40, 140)
        deviation_pct = round(rng.uniform(-18, 22), 1)
        current_vessels = round(baseline_vessels * (1 + deviation_pct / 100))

        if abs(deviation_pct) > 15:
            status = "ANOMALIA" if deviation_pct > 0 else "CONGESTIONAMENTO BAIXO"
            severity = "high"
        elif abs(deviation_pct) > 8:
            status = "ATENÇÃO"
            severity = "medium"
        else:
            status = "NORMAL"
            severity = "low"

        rows.append({
            "id": cp["id"],
            "name": cp["name"],
            "region": cp["region"],
            "lat": cp["lat"],
            "lon": cp["lon"],
            "daily_flow_bpd": cp["daily_flow_bpd"],
            "vessels_detected_24h": current_vessels,
            "baseline_vessels_24h": baseline_vessels,
            "deviation_percent": deviation_pct,
            "status": status,
            "severity": severity,
        })

    rows.sort(key=lambda r: abs(r["deviation_percent"]), reverse=True)
    return {
        "chokepoints": rows,
        "alerts_count": len([r for r in rows if r["severity"] == "high"]),
        "scan_time": datetime.now(timezone.utc).isoformat(),
        "data_source": "SIMULATED — swap for Kpler/Windward AIS feed for production",
    }


# ══════════════════════════════════════════════════════════════════════════
# 2. FLOATING STORAGE — tankers idling offshore (bearish signal for oil when high)
# ══════════════════════════════════════════════════════════════════════════

def get_floating_storage() -> Dict:
    """Vessels used as floating storage (anchored, not moving) — a classic oversupply signal."""
    rng = _seeded_random("floating_storage")
    regions = [
        {"name": "Golfo Pérsico", "base_barrels_m": 45},
        {"name": "Mar do Norte", "base_barrels_m": 12},
        {"name": "Costa da China", "base_barrels_m": 28},
        {"name": "Costa do Golfo dos EUA", "base_barrels_m": 18},
        {"name": "Cingapura / Malaca", "base_barrels_m": 22},
    ]
    rows = []
    total_current = 0
    total_baseline = 0
    for r in regions:
        variation = rng.uniform(-0.15, 0.35)
        current = round(r["base_barrels_m"] * (1 + variation), 1)
        total_current += current
        total_baseline += r["base_barrels_m"]
        rows.append({
            "region": r["name"],
            "floating_storage_million_bbl": current,
            "baseline_million_bbl": r["base_barrels_m"],
            "change_percent": round(variation * 100, 1),
            "vessels_idle": rng.randint(8, 45),
        })

    total_change_pct = round((total_current - total_baseline) / total_baseline * 100, 1)
    if total_change_pct > 12:
        signal = "BEARISH"
        interpretation = "Estoque flutuante em alta sugere excesso de oferta de petróleo — pressão baixista nos preços."
    elif total_change_pct < -12:
        signal = "BULLISH"
        interpretation = "Estoque flutuante em queda sugere demanda absorvendo oferta rapidamente — pressão altista nos preços."
    else:
        signal = "NEUTRO"
        interpretation = "Estoque flutuante dentro da normalidade histórica."

    return {
        "regions": rows,
        "total_current_million_bbl": round(total_current, 1),
        "total_baseline_million_bbl": round(total_baseline, 1),
        "total_change_percent": total_change_pct,
        "market_signal": signal,
        "interpretation": interpretation,
        "scan_time": datetime.now(timezone.utc).isoformat(),
        "data_source": "SIMULATED — swap for Kpler floating storage feed for production",
    }


# ══════════════════════════════════════════════════════════════════════════
# 3. PORT ACTIVITY — loading/discharge rates at major terminals
# ══════════════════════════════════════════════════════════════════════════

def get_port_activity() -> Dict:
    """Loading and discharge activity at major oil terminals — supply-side signal."""
    rows = []
    for port in MAJOR_PORTS:
        rng = _seeded_random(port["id"])
        baseline = rng.randint(15, 60)
        deviation = round(rng.uniform(-20, 25), 1)
        current = round(baseline * (1 + deviation / 100))

        rows.append({
            "id": port["id"],
            "name": port["name"],
            "country": port["country"],
            "type": port["type"],
            "lat": port["lat"],
            "lon": port["lon"],
            "vessel_calls_7d": current,
            "baseline_7d": baseline,
            "deviation_percent": deviation,
            "wait_time_hours": round(rng.uniform(4, 36), 1),
        })

    return {
        "ports": rows,
        "scan_time": datetime.now(timezone.utc).isoformat(),
        "data_source": "SIMULATED — swap for MarineTraffic port-calls API for production",
    }


# ══════════════════════════════════════════════════════════════════════════
# 4. DARK FLEET DETECTION — sanctioned/shadow tankers going dark (AIS off)
# ══════════════════════════════════════════════════════════════════════════

def get_dark_fleet_activity() -> Dict:
    """Vessels that disabled their AIS transponder — often signals sanctions evasion
    or ship-to-ship transfers, closely watched by commodity desks and compliance teams."""
    rng = _seeded_random("dark_fleet")
    events = []
    routes = [
        ("Golfo Pérsico", "Costa da China"),
        ("Mar Negro", "Mediterrâneo Oriental"),
        ("Golfo Pérsico", "Sudeste Asiático"),
        ("Mar Báltico", "Costa da Índia"),
    ]
    for i in range(rng.randint(3, 7)):
        origin, dest = rng.choice(routes)
        hours_dark = rng.randint(6, 96)
        events.append({
            "vessel_type": rng.choice(VESSEL_TYPES),
            "flag_state": rng.choice(FLAG_STATES),
            "route": f"{origin} → {dest}",
            "hours_ais_disabled": hours_dark,
            "estimated_cargo_bbl": rng.randint(500_000, 2_000_000),
            "risk_level": "alto" if hours_dark > 48 else "médio",
            "detected_hours_ago": rng.randint(1, 20),
        })

    events.sort(key=lambda e: e["hours_ais_disabled"], reverse=True)
    return {
        "events": events,
        "total_dark_vessels_7d": rng.randint(18, 40),
        "total_estimated_cargo_bbl": sum(e["estimated_cargo_bbl"] for e in events),
        "scan_time": datetime.now(timezone.utc).isoformat(),
        "data_source": "SIMULATED — swap for Windward dark-activity feed for production",
    }


# ══════════════════════════════════════════════════════════════════════════
# 5. UNIFIED SUMMARY — for the dashboard widget / JARVIS context
# ══════════════════════════════════════════════════════════════════════════

def get_satellite_intelligence_summary() -> Dict:
    """Condensed cross-signal summary for embedding in the main dashboard and
    feeding JARVIS conversational context."""
    chokepoints = get_chokepoint_status()
    storage = get_floating_storage()
    dark_fleet = get_dark_fleet_activity()

    top_alert = chokepoints["chokepoints"][0] if chokepoints["chokepoints"] else None

    return {
        "headline": (
            f"{chokepoints['alerts_count']} chokepoint(s) com anomalia de tráfego detectada"
            if chokepoints["alerts_count"] > 0
            else "Tráfego em chokepoints dentro da normalidade"
        ),
        "top_chokepoint_alert": top_alert,
        "floating_storage_signal": storage["market_signal"],
        "floating_storage_interpretation": storage["interpretation"],
        "dark_fleet_vessels_7d": dark_fleet["total_dark_vessels_7d"],
        "scan_time": datetime.now(timezone.utc).isoformat(),
    }
