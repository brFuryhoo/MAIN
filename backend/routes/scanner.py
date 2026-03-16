"""
JARVIS Market Scanner API Routes
==================================
Endpoints to trigger scans, view opportunities, and manage scanner config.
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import os
import logging

from services.market_data import market_data_adapter
from services.technical_engine import compute_technical_analysis
from services.market_structure import detect_market_structure
from services.liquidity_mapper import map_liquidity
from services.monte_carlo import run_monte_carlo
from services.risk_engine import compute_risk_model
from services.causality_engine import explain_market_causality
from services.probability_engine import compute_probabilities
from services.report_generator import generate_executive_report
from services.regime_detector import detect_regime
from services.manipulation_detector import detect_manipulation
from services.market_scanner import (
    get_scan_assets, classify_opportunity, compute_scanner_summary, SCAN_UNIVERSE
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/scanner", tags=["scanner"])


def get_db():
    from server import db
    return db


def _extract_user_id(request: Request) -> str:
    import jwt as pyjwt
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        try:
            secret = os.environ.get('JWT_SECRET', 'aureos_ai_secure_secret')
            payload = pyjwt.decode(auth.split(" ")[1], secret, algorithms=["HS256"])
            return payload.get("user_id", "anonymous")
        except Exception:
            pass
    return "anonymous"


class ScanRequest(BaseModel):
    categories: Optional[List[str]] = None  # crypto, stocks_us, forex, commodities
    max_assets: int = 10


async def _run_quick_analysis(symbol: str, asset_type: str, coingecko_id: str = None) -> dict:
    """Run a lightweight version of the 11-step pipeline for scanning."""
    try:
        asset_data = await market_data_adapter.get_asset_data(
            symbol=symbol, asset_type=asset_type, coingecko_id=coingecko_id
        )
        candles = asset_data.get("candles", [])
        price = asset_data.get("price", 0)

        if not candles or price <= 0:
            return None

        technical = compute_technical_analysis(candles, price)
        structure = detect_market_structure(candles, technical)
        liquidity = map_liquidity(candles, technical)
        mc = run_monte_carlo(candles, price, num_simulations=1000, forecast_periods=14)
        risk = compute_risk_model(candles, price, technical, mc)
        causality = explain_market_causality(technical, structure, liquidity, candles)
        probability = compute_probabilities(technical, structure, liquidity, mc, risk, causality)
        report = generate_executive_report(asset_data, technical, structure, liquidity, mc, risk, causality, probability)
        regime = detect_regime(candles, technical, structure)
        manipulation = detect_manipulation(candles, technical, structure, liquidity)

        report["regime"] = {
            "trend_regime": regime["trend_regime"],
            "volatility_regime": regime["volatility_regime"],
            "market_phase": regime["market_phase"],
        }

        return {
            "symbol": symbol,
            "name": asset_data.get("name", symbol),
            "asset_type": asset_type,
            "price": price,
            "change_percent": asset_data.get("change_percent", 0),
            "report": report,
            "steps": {
                "technical_analysis": technical,
                "market_structure": structure,
                "monte_carlo": mc,
                "risk_model": risk,
                "regime_detection": regime,
                "manipulation_detection": manipulation,
                "liquidity_mapping": liquidity,
            },
        }
    except Exception as e:
        logger.warning(f"Scanner: failed to analyze {symbol}: {e}")
        return None


@router.get("/universe")
async def get_scanner_universe():
    """Get available asset categories for scanning."""
    universe = {}
    for cat, assets in SCAN_UNIVERSE.items():
        universe[cat] = {
            "count": len(assets),
            "assets": [{"symbol": a["symbol"], "name": a["name"]} for a in assets],
        }
    return {"categories": universe, "total_assets": sum(len(v) for v in SCAN_UNIVERSE.values())}


@router.post("/scan")
async def run_market_scan(req: ScanRequest, request: Request):
    """Run a market scan across selected categories."""
    try:
        db = get_db()
        user_id = _extract_user_id(request)
        assets = get_scan_assets(req.categories)[:req.max_assets]

        if not assets:
            return {"status": "error", "message": "No assets to scan"}

        all_opportunities = []
        scanned_assets = []
        failed = []

        for asset in assets:
            result = await _run_quick_analysis(
                symbol=asset["symbol"],
                asset_type=asset["asset_type"],
                coingecko_id=asset.get("coingecko_id"),
            )

            if result:
                opportunities = classify_opportunity(result)
                signal = result.get("report", {}).get("signal_summary", {})

                asset_summary = {
                    "symbol": asset["symbol"],
                    "name": asset["name"],
                    "asset_type": asset["asset_type"],
                    "price": result["price"],
                    "change_percent": result.get("change_percent", 0),
                    "signal": signal.get("direction", "HOLD"),
                    "confidence": signal.get("confidence", 50),
                    "strength": signal.get("strength", "weak"),
                    "opportunities": len(opportunities),
                    "risk_score": result["steps"].get("risk_model", {}).get("risk_score", 50),
                    "rsi": result["steps"].get("technical_analysis", {}).get("rsi", 50),
                    "regime": result["steps"].get("regime_detection", {}).get("market_phase", {}).get("phase", "unknown"),
                }
                scanned_assets.append(asset_summary)
                all_opportunities.extend(opportunities)
            else:
                failed.append(asset["symbol"])

        # Sort opportunities by confidence
        all_opportunities.sort(key=lambda x: x["confidence"], reverse=True)
        summary = compute_scanner_summary(all_opportunities)

        # Save scan result
        scan_doc = {
            "user_id": user_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "categories": req.categories or list(SCAN_UNIVERSE.keys()),
            "assets_scanned": len(scanned_assets),
            "opportunities_found": len(all_opportunities),
            "high_priority": summary.get("high_priority", 0),
            "summary": summary,
        }
        await db.scanner_history.insert_one(scan_doc)

        return {
            "status": "complete",
            "scanned": len(scanned_assets),
            "failed": len(failed),
            "assets": scanned_assets,
            "opportunities": all_opportunities[:20],
            "summary": summary,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    except Exception as e:
        logger.error(f"Scanner error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/opportunities")
async def get_latest_opportunities(request: Request, limit: int = 20):
    """Get cached opportunities from latest scan."""
    try:
        db = get_db()
        user_id = _extract_user_id(request)

        latest = await db.scanner_history.find(
            {"user_id": user_id}, {"_id": 0}
        ).sort("timestamp", -1).limit(1).to_list(1)

        if not latest:
            return {"opportunities": [], "message": "No scans yet. Run a scan first."}

        return {
            "last_scan": latest[0].get("timestamp"),
            "opportunities_found": latest[0].get("opportunities_found", 0),
            "summary": latest[0].get("summary", {}),
        }

    except Exception as e:
        return {"opportunities": [], "message": str(e)}


@router.get("/history")
async def get_scan_history(request: Request, limit: int = 10):
    """Get user's scan history."""
    try:
        db = get_db()
        user_id = _extract_user_id(request)

        history = await db.scanner_history.find(
            {"user_id": user_id}, {"_id": 0}
        ).sort("timestamp", -1).limit(limit).to_list(limit)

        return {"history": history, "count": len(history)}

    except Exception as e:
        return {"history": [], "count": 0}
