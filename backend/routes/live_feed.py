"""
Live Price Feed — WebSocket + REST
=====================================
Provides real-time and snapshot price data for key global assets.

Endpoints:
  GET  /api/live/prices   — snapshot of 10 key assets
  GET  /api/live/ticker   — top 10 assets for marquee display
  WS   /api/live/ws       — streams price updates every 10 seconds
"""

import asyncio
import json
import logging
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional, Set

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/live", tags=["live-feed"])

# ---------------------------------------------------------------------------
# Asset catalogue — symbol → asset_type mapping
# ---------------------------------------------------------------------------

TRACKED_ASSETS: List[Dict] = [
    {"symbol": "BTC",     "asset_type": "crypto",    "display": "Bitcoin"},
    {"symbol": "ETH",     "asset_type": "crypto",    "display": "Ethereum"},
    {"symbol": "SOL",     "asset_type": "crypto",    "display": "Solana"},
    {"symbol": "AAPL",    "asset_type": "stock",     "display": "Apple"},
    {"symbol": "TSLA",    "asset_type": "stock",     "display": "Tesla"},
    {"symbol": "NVDA",    "asset_type": "stock",     "display": "NVIDIA"},
    {"symbol": "SPY",     "asset_type": "stock",     "display": "S&P 500 ETF"},
    {"symbol": "EUR/USD", "asset_type": "forex",     "display": "Euro / Dollar"},
    {"symbol": "GBP/USD", "asset_type": "forex",     "display": "Pound / Dollar"},
    {"symbol": "GOLD",    "asset_type": "commodity", "display": "Gold"},
]

# ---------------------------------------------------------------------------
# In-memory price cache (30-second TTL)
# ---------------------------------------------------------------------------

_PRICE_CACHE_TTL = 30  # seconds

_price_cache: Dict[str, dict] = {}       # symbol → {data, fetched_at}
_previous_prices: Dict[str, float] = {}  # symbol → last known price (for change calc)


def _is_cache_valid(symbol: str) -> bool:
    entry = _price_cache.get(symbol)
    if not entry:
        return False
    return time.monotonic() - entry["fetched_at"] < _PRICE_CACHE_TTL


def _cache_price(symbol: str, data: dict) -> None:
    _price_cache[symbol] = {"data": data, "fetched_at": time.monotonic()}


# ---------------------------------------------------------------------------
# Price fetching helpers
# ---------------------------------------------------------------------------

async def _fetch_asset_price(symbol: str, asset_type: str, display: str) -> dict:
    """Fetch price for a single asset, using the in-memory cache when fresh."""
    if _is_cache_valid(symbol):
        return _price_cache[symbol]["data"]

    try:
        from services.market_data import market_data_adapter  # local import avoids circular
        asset_data = await market_data_adapter.get_asset_data(symbol, asset_type)

        price: float = asset_data.get("price", 0.0)
        change_pct: float = asset_data.get("change_percent", 0.0)

        prev = _previous_prices.get(symbol, price)
        change_24h = price - (price / (1 + change_pct / 100)) if change_pct else 0.0
        direction = "up" if change_pct >= 0 else "down"

        # Update previous price tracker for next comparison
        _previous_prices[symbol] = price

        result = {
            "symbol": symbol,
            "display": display,
            "asset_type": asset_type,
            "price": round(price, 6 if price < 1 else 2),
            "change_24h": round(change_24h, 6 if abs(change_24h) < 1 else 2),
            "change_pct": round(change_pct, 4),
            "direction": direction,
            "source": asset_data.get("source", "unknown"),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        _cache_price(symbol, result)
        return result

    except Exception as exc:
        logger.warning("Price fetch failed for %s (%s): %s", symbol, asset_type, exc)
        # Return stale cache if available
        stale = _price_cache.get(symbol)
        if stale:
            return stale["data"]
        return {
            "symbol": symbol,
            "display": display,
            "asset_type": asset_type,
            "price": 0.0,
            "change_24h": 0.0,
            "change_pct": 0.0,
            "direction": "neutral",
            "source": "error",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }


async def _fetch_all_prices() -> List[dict]:
    """Fetch prices for all tracked assets concurrently."""
    tasks = [
        _fetch_asset_price(a["symbol"], a["asset_type"], a["display"])
        for a in TRACKED_ASSETS
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    prices = []
    for idx, result in enumerate(results):
        if isinstance(result, Exception):
            logger.error("Price gather error for %s: %s", TRACKED_ASSETS[idx]["symbol"], result)
            prices.append({
                "symbol": TRACKED_ASSETS[idx]["symbol"],
                "display": TRACKED_ASSETS[idx]["display"],
                "asset_type": TRACKED_ASSETS[idx]["asset_type"],
                "price": 0.0,
                "change_24h": 0.0,
                "change_pct": 0.0,
                "direction": "neutral",
                "source": "error",
                "updated_at": datetime.now(timezone.utc).isoformat(),
            })
        else:
            prices.append(result)
    return prices


# ---------------------------------------------------------------------------
# WebSocket Connection Manager
# ---------------------------------------------------------------------------

class LiveConnectionManager:
    """Manages WebSocket connections for the live price feed channel."""

    def __init__(self) -> None:
        self._connections: List[WebSocket] = []
        self._subscriptions: Dict[str, Set[str]] = {}  # ws_id → set of symbols
        self._streaming_task: Optional[asyncio.Task] = None

    async def connect(self, websocket: WebSocket, symbols: Optional[List[str]] = None) -> None:
        await websocket.accept()
        self._connections.append(websocket)
        ws_id = str(id(websocket))
        # Default: subscribe to all tracked symbols
        self._subscriptions[ws_id] = set(symbols) if symbols else {a["symbol"] for a in TRACKED_ASSETS}
        logger.info("Live WS client connected (total=%d)", len(self._connections))
        self._ensure_streaming()

    def disconnect(self, websocket: WebSocket) -> None:
        ws_id = str(id(websocket))
        self._connections = [ws for ws in self._connections if ws is not websocket]
        self._subscriptions.pop(ws_id, None)
        logger.info("Live WS client disconnected (total=%d)", len(self._connections))

    def update_subscriptions(self, websocket: WebSocket, symbols: List[str]) -> None:
        ws_id = str(id(websocket))
        if ws_id in self._subscriptions:
            self._subscriptions[ws_id] = set(symbols)

    def _ensure_streaming(self) -> None:
        if self._streaming_task is None or self._streaming_task.done():
            self._streaming_task = asyncio.create_task(self._broadcast_loop())

    async def _broadcast_loop(self) -> None:
        """Background loop: fetches prices every 10 seconds and broadcasts to clients."""
        logger.info("Live price streaming loop started")
        try:
            while self._connections:
                try:
                    prices = await _fetch_all_prices()
                    await self._broadcast_prices(prices)
                except Exception as exc:
                    logger.error("Broadcast loop error: %s", exc)
                await asyncio.sleep(10)
        finally:
            logger.info("Live price streaming loop stopped")

    async def _broadcast_prices(self, all_prices: List[dict]) -> None:
        price_map = {p["symbol"]: p for p in all_prices}
        disconnected: List[WebSocket] = []

        for ws in list(self._connections):
            ws_id = str(id(ws))
            subscribed_symbols = self._subscriptions.get(ws_id, set())
            filtered = [
                {
                    "symbol": p["symbol"],
                    "price": p["price"],
                    "change_24h": p["change_24h"],
                    "change_pct": p["change_pct"],
                    "direction": p["direction"],
                }
                for sym, p in price_map.items()
                if sym in subscribed_symbols
            ]
            payload = {
                "type": "price_update",
                "data": filtered,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            try:
                await ws.send_text(json.dumps(payload))
            except Exception:
                disconnected.append(ws)

        for ws in disconnected:
            self.disconnect(ws)

    @property
    def connection_count(self) -> int:
        return len(self._connections)


live_manager = LiveConnectionManager()


# ---------------------------------------------------------------------------
# REST Endpoints
# ---------------------------------------------------------------------------

@router.get("/prices")
async def get_live_prices():
    """
    Returns a snapshot of the current price for each of the 10 key assets.
    Prices are cached for up to 30 seconds per asset to reduce external API calls.
    """
    try:
        prices = await _fetch_all_prices()
        return {
            "status": "ok",
            "count": len(prices),
            "assets": prices,
            "snapshot_at": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as exc:
        logger.error("GET /prices error: %s", exc, exc_info=True)
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/ticker")
async def get_ticker():
    """
    Returns an array of top 10 assets with price + 24h change % suitable for
    marquee or ticker display components.
    """
    try:
        prices = await _fetch_all_prices()
        ticker = [
            {
                "symbol": p["symbol"],
                "display": p["display"],
                "price": p["price"],
                "change_pct": p["change_pct"],
                "direction": p["direction"],
            }
            for p in prices
        ]
        return {
            "status": "ok",
            "ticker": ticker,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as exc:
        logger.error("GET /ticker error: %s", exc, exc_info=True)
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=str(exc))


# ---------------------------------------------------------------------------
# WebSocket Endpoint
# ---------------------------------------------------------------------------

@router.websocket("/ws")
async def live_prices_ws(websocket: WebSocket):
    """
    WebSocket endpoint that streams price updates every 10 seconds.

    On connect, all 10 tracked assets are subscribed by default.

    Client → Server messages (JSON):
      {"action": "subscribe",   "symbols": ["BTC", "ETH"]}   — override subscriptions
      {"action": "ping"}                                      — keepalive

    Server → Client messages (JSON):
      {"type": "price_update",  "data": [{symbol, price, change_24h, change_pct, direction}], "timestamp": "..."}
      {"type": "pong"}
      {"type": "subscribed",    "symbols": [...]}
    """
    await live_manager.connect(websocket)
    try:
        while True:
            try:
                raw = await asyncio.wait_for(websocket.receive_text(), timeout=30)
                msg = json.loads(raw)
                action = msg.get("action", "")

                if action == "ping":
                    await websocket.send_text(
                        json.dumps({"type": "pong", "timestamp": datetime.now(timezone.utc).isoformat()})
                    )

                elif action == "subscribe":
                    symbols: List[str] = msg.get("symbols", [])
                    if symbols:
                        live_manager.update_subscriptions(websocket, symbols)
                        await websocket.send_text(
                            json.dumps({"type": "subscribed", "symbols": symbols})
                        )

            except asyncio.TimeoutError:
                # No message from client for 30s — send keepalive
                await websocket.send_text(
                    json.dumps({"type": "keepalive", "timestamp": datetime.now(timezone.utc).isoformat()})
                )
            except json.JSONDecodeError:
                pass  # ignore malformed messages

    except WebSocketDisconnect:
        live_manager.disconnect(websocket)
    except Exception as exc:
        logger.warning("Live WS unexpected disconnect: %s", exc)
        live_manager.disconnect(websocket)
