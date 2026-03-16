"""
Analysis API Routes
--------------------
Endpoints for the 9-step analysis pipeline, regime/manipulation detection,
and analysis history persistence.
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import os
import uuid
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

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analysis", tags=["analysis"])


def get_db():
    from server import db
    return db


def get_user_from_token(token: str):
    import jwt as pyjwt
    try:
        secret = os.environ.get('JWT_SECRET', 'aureos_ai_secure_secret')
        payload = pyjwt.decode(token, secret, algorithms=["HS256"])
        return payload
    except Exception:
        return None


class AnalysisRequest(BaseModel):
    symbol: str
    asset_type: str = "crypto"
    coingecko_id: Optional[str] = None
    name: Optional[str] = None
    timeframe: str = "4H"
    analysis_type: str = "full"


@router.post("/start")
async def start_analysis(req: AnalysisRequest, request: Request = None):
    """
    Execute the full institutional analysis pipeline.
    Now includes 11 steps: 9 original + Regime Detection + Manipulation Detection.
    Saves results to analysis_history in MongoDB.
    """
    try:
        # Step 1: Market Data Aggregation
        asset_data = await market_data_adapter.get_asset_data(
            symbol=req.symbol,
            asset_type=req.asset_type,
            coingecko_id=req.coingecko_id,
        )
        candles = asset_data.get("candles", [])
        price = asset_data.get("price", 0)

        if not candles or price <= 0:
            raise HTTPException(status_code=400, detail="Unable to fetch market data for this asset")

        step_results = {}

        # Step 1 result
        step_results["market_data"] = {
            "status": "complete",
            "symbol": asset_data["symbol"],
            "name": asset_data.get("name", req.symbol),
            "price": price,
            "change_percent": asset_data.get("change_percent", 0),
            "volume": asset_data.get("volume", 0),
            "market_cap": asset_data.get("market_cap", 0),
            "candle_count": len(candles),
            "source": asset_data.get("source", "unknown"),
        }

        # Step 2: Technical Analysis Engine
        technical = compute_technical_analysis(candles, price)
        step_results["technical_analysis"] = {"status": "complete", **technical}

        # Step 3: Market Structure Detection
        structure = detect_market_structure(candles, technical)
        step_results["market_structure"] = {"status": "complete", **structure}

        # Step 4: Liquidity Mapping
        liquidity = map_liquidity(candles, technical)
        step_results["liquidity_mapping"] = {"status": "complete", **liquidity}

        # Step 5: Quantitative Scenario Modeling (Monte Carlo)
        mc_result = run_monte_carlo(candles, price, num_simulations=5000, forecast_periods=30)
        step_results["monte_carlo"] = {"status": "complete", **mc_result}

        # Step 6: Risk Modeling Engine
        risk = compute_risk_model(candles, price, technical, mc_result)
        step_results["risk_model"] = {"status": "complete", **risk}

        # Step 7: Market Causality Engine
        causality = explain_market_causality(technical, structure, liquidity, candles)
        step_results["causality"] = {"status": "complete", **causality}

        # Step 8: Probability Engine
        probability = compute_probabilities(technical, structure, liquidity, mc_result, risk, causality)
        step_results["probability"] = {"status": "complete", **probability}

        # Step 9: Executive Report
        report = generate_executive_report(asset_data, technical, structure, liquidity, mc_result, risk, causality, probability)
        step_results["executive_report"] = {"status": "complete"}

        # Step 10: Market Regime Detection
        regime = detect_regime(candles, technical, structure)
        step_results["regime_detection"] = {"status": "complete", **regime}

        # Step 11: Manipulation Detection
        manipulation = detect_manipulation(candles, technical, structure, liquidity)
        step_results["manipulation_detection"] = {"status": "complete", **manipulation}

        # Enrich report with regime and manipulation data
        report["regime"] = {
            "trend_regime": regime["trend_regime"],
            "volatility_regime": regime["volatility_regime"],
            "market_phase": regime["market_phase"],
            "regime_summary": regime["regime_summary"],
        }
        report["manipulation"] = {
            "score": manipulation["manipulation_score"],
            "risk_level": manipulation["risk_level"],
            "events_detected": manipulation["total_events_detected"],
            "warnings": manipulation["warnings"],
            "summary": manipulation["summary"],
        }

        analysis_id = str(uuid.uuid4())
        timestamp = datetime.now(timezone.utc).isoformat()

        # Build result
        result = {
            "analysis_id": analysis_id,
            "symbol": req.symbol,
            "name": asset_data.get("name", req.symbol),
            "asset_type": req.asset_type,
            "timeframe": req.timeframe,
            "price": price,
            "timestamp": timestamp,
            "steps": step_results,
            "report": report,
            "candles": candles[-100:],
        }

        # Save to analysis_history in MongoDB (async, non-blocking)
        try:
            db = get_db()
            user_id = "anonymous"
            if request:
                auth_header = request.headers.get("Authorization", "")
                if auth_header.startswith("Bearer "):
                    user_data = get_user_from_token(auth_header.split(" ")[1])
                    if user_data:
                        user_id = user_data.get("user_id", "anonymous")

            history_doc = {
                "analysis_id": analysis_id,
                "user_id": user_id,
                "symbol": req.symbol,
                "name": asset_data.get("name", req.symbol),
                "asset_type": req.asset_type,
                "timeframe": req.timeframe,
                "price": price,
                "signal": report.get("signal_summary", {}),
                "regime": report.get("regime", {}),
                "manipulation_score": manipulation["manipulation_score"],
                "timestamp": timestamp,
                # Quant Lab enrichment fields
                "rsi": technical.get("rsi", 50),
                "macd": technical.get("macd", {}),
                "moving_averages": technical.get("moving_averages", {}),
                "bollinger_bands": technical.get("bollinger_bands", {}),
                "volume_trend": technical.get("volume_trend", "stable"),
                "atr_percent": technical.get("atr_percent", 2),
                "structure_bias": structure.get("bias", "neutral"),
                "monte_carlo_win_prob": mc_result.get("win_probability", 50),
                "risk_score": risk.get("risk_score", 50),
                "liquidity_signal": 0.6 if liquidity.get("near_support") else (-0.6 if liquidity.get("near_resistance") else 0),
            }
            await db.analysis_history.insert_one(history_doc)
        except Exception as e:
            logger.warning(f"Failed to save analysis history: {e}")

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Analysis error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.get("/history")
async def get_analysis_history(request: Request, limit: int = 20):
    """Get user's analysis history."""
    try:
        db = get_db()
        user_id = "anonymous"
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            user_data = get_user_from_token(auth_header.split(" ")[1])
            if user_data:
                user_id = user_data.get("user_id", "anonymous")

        history = await db.analysis_history.find(
            {"user_id": user_id},
            {"_id": 0}
        ).sort("timestamp", -1).limit(limit).to_list(limit)

        return {"history": history, "count": len(history)}

    except Exception as e:
        logger.error(f"History error: {str(e)}")
        return {"history": [], "count": 0}
