"""
Asset Search API Routes
------------------------
Endpoints for the Global Asset Selector.
"""

from fastapi import APIRouter
import logging

from services.market_data import market_data_adapter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/assets", tags=["assets"])


@router.get("/search")
async def search_assets(q: str = ""):
    """Search for assets across all asset classes."""
    if not q or len(q) < 1:
        return {"results": [], "query": q}

    try:
        results = await market_data_adapter.search_assets(q)
        return {"results": results, "query": q}
    except Exception as e:
        logger.error(f"Asset search error: {str(e)}")
        return {"results": [], "query": q, "error": str(e)}
