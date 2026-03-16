"""
Analysis API Routes
--------------------
Endpoints for the 9-step analysis pipeline and analysis history.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
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

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analysis", tags=["analysis"])


class AnalysisRequest(BaseModel):
    symbol: str
    asset_type: str = "crypto"
    coingecko_id: Optional[str] = None
    name: Optional[str] = None
    timeframe: str = "4H"
    analysis_type: str = "full"  # "full" or "simple"


@router.post("/start")
async def start_analysis(req: AnalysisRequest):
    """
    Execute the full 9-step institutional analysis pipeline.
    Returns the complete analysis report with all intermediate results.
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

        # Return full analysis
        return {
            "analysis_id": str(uuid.uuid4()),
            "symbol": req.symbol,
            "name": asset_data.get("name", req.symbol),
            "asset_type": req.asset_type,
            "timeframe": req.timeframe,
            "price": price,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "steps": step_results,
            "report": report,
            "candles": candles[-100:],  # Last 100 candles for chart
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Analysis error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
