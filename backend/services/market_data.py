"""
Market Data Adapter Layer
--------------------------
Modular adapter for fetching market data from multiple providers.
Currently supports: CoinGecko (crypto), Mock (stocks, forex, commodities, indices).
Designed for easy plug-in of Alpha Vantage, MarketStack, NewsAPI etc.
"""

import httpx
import random
import math
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)

# ==================== MOCK DATA ====================

MOCK_STOCKS = {
    "AAPL": {"name": "Apple Inc.", "price": 178.52, "change_percent": 1.33, "volume": 52340000, "market_cap": 2800000000000},
    "GOOGL": {"name": "Alphabet Inc.", "price": 141.80, "change_percent": -0.85, "volume": 18920000, "market_cap": 1750000000000},
    "MSFT": {"name": "Microsoft Corp.", "price": 378.91, "change_percent": 1.22, "volume": 21450000, "market_cap": 2810000000000},
    "TSLA": {"name": "Tesla Inc.", "price": 248.50, "change_percent": -2.09, "volume": 89230000, "market_cap": 790000000000},
    "NVDA": {"name": "NVIDIA Corp.", "price": 495.22, "change_percent": 2.58, "volume": 45670000, "market_cap": 1220000000000},
    "AMZN": {"name": "Amazon.com", "price": 185.60, "change_percent": 0.95, "volume": 35800000, "market_cap": 1920000000000},
    "META": {"name": "Meta Platforms", "price": 505.40, "change_percent": 1.75, "volume": 16200000, "market_cap": 1290000000000},
    "BHP": {"name": "BHP Group (ASX)", "price": 45.80, "change_percent": 1.44, "volume": 8920000, "market_cap": 150000000000},
    "CBA": {"name": "Commonwealth Bank (ASX)", "price": 112.30, "change_percent": -0.75, "volume": 5430000, "market_cap": 189000000000},
    "WES": {"name": "Wesfarmers (ASX)", "price": 58.45, "change_percent": 2.10, "volume": 3210000, "market_cap": 65000000000},
}

MOCK_FOREX = {
    "AUDUSD": {"name": "AUD/USD", "price": 0.6542, "change_percent": 0.18, "volume": 180000000},
    "EURUSD": {"name": "EUR/USD", "price": 1.0865, "change_percent": -0.21, "volume": 350000000},
    "GBPUSD": {"name": "GBP/USD", "price": 1.2645, "change_percent": 0.27, "volume": 220000000},
    "USDJPY": {"name": "USD/JPY", "price": 148.52, "change_percent": 0.30, "volume": 280000000},
    "USDCAD": {"name": "USD/CAD", "price": 1.3580, "change_percent": -0.15, "volume": 120000000},
    "NZDUSD": {"name": "NZD/USD", "price": 0.6082, "change_percent": 0.42, "volume": 65000000},
}

MOCK_COMMODITIES = {
    "XAUUSD": {"name": "Gold", "price": 2035.50, "change_percent": 0.62, "volume": 195000000},
    "XAGUSD": {"name": "Silver", "price": 22.85, "change_percent": 1.15, "volume": 42000000},
    "WTICOUSD": {"name": "Crude Oil WTI", "price": 78.45, "change_percent": -1.20, "volume": 310000000},
    "COPPER": {"name": "Copper", "price": 3.82, "change_percent": 0.55, "volume": 15000000},
}

MOCK_INDICES = {
    "SPY": {"name": "S&P 500 ETF", "price": 478.52, "change_percent": 0.82, "volume": 75000000},
    "QQQ": {"name": "NASDAQ 100 ETF", "price": 410.30, "change_percent": 1.15, "volume": 48000000},
    "DJI": {"name": "Dow Jones", "price": 37468.90, "change_percent": 0.39, "volume": 320000000},
    "ASX200": {"name": "ASX 200", "price": 7456.80, "change_percent": -0.31, "volume": 85000000},
}


def generate_candles(base_price: float, count: int = 200, volatility: float = 0.015) -> List[Dict]:
    """Generate realistic OHLCV candle data with trending behavior."""
    candles = []
    price = base_price * random.uniform(0.85, 0.95)
    trend = random.choice([-1, 1]) * random.uniform(0.0005, 0.002)

    for i in range(count):
        # Add micro trend shifts
        if random.random() < 0.05:
            trend = random.choice([-1, 1]) * random.uniform(0.0005, 0.002)

        drift = trend + random.gauss(0, volatility)
        open_price = price
        close_price = price * (1 + drift)
        high = max(open_price, close_price) * (1 + abs(random.gauss(0, volatility * 0.5)))
        low = min(open_price, close_price) * (1 - abs(random.gauss(0, volatility * 0.5)))
        vol = int(random.gauss(5000000, 2000000))
        vol = max(vol, 100000)

        ts = datetime.now(timezone.utc) - timedelta(hours=count - i)
        candles.append({
            "timestamp": ts.isoformat(),
            "time": int(ts.timestamp()),
            "open": round(open_price, 6 if base_price < 1 else 2),
            "high": round(high, 6 if base_price < 1 else 2),
            "low": round(low, 6 if base_price < 1 else 2),
            "close": round(close_price, 6 if base_price < 1 else 2),
            "volume": vol,
        })
        price = close_price
    return candles


class MarketDataAdapter:
    """Unified adapter for all market data sources."""

    def __init__(self):
        self._http = httpx.AsyncClient(timeout=15)

    async def search_assets(self, query: str) -> List[Dict]:
        """Search across all asset classes."""
        query_upper = query.upper()
        results = []

        # Search CoinGecko
        try:
            cg_results = await self._search_coingecko(query)
            results.extend(cg_results)
        except Exception as e:
            logger.warning(f"CoinGecko search failed: {e}")

        # Search mock stocks
        for sym, data in MOCK_STOCKS.items():
            if query_upper in sym or query_upper in data["name"].upper():
                results.append({"symbol": sym, "name": data["name"], "type": "stock", "price": data["price"], "change_percent": data["change_percent"]})

        # Search mock forex
        for sym, data in MOCK_FOREX.items():
            if query_upper in sym or query_upper in data["name"].upper():
                results.append({"symbol": sym, "name": data["name"], "type": "forex", "price": data["price"], "change_percent": data["change_percent"]})

        # Search mock commodities
        for sym, data in MOCK_COMMODITIES.items():
            if query_upper in sym or query_upper in data["name"].upper():
                results.append({"symbol": sym, "name": data["name"], "type": "commodity", "price": data["price"], "change_percent": data["change_percent"]})

        # Search mock indices
        for sym, data in MOCK_INDICES.items():
            if query_upper in sym or query_upper in data["name"].upper():
                results.append({"symbol": sym, "name": data["name"], "type": "index", "price": data["price"], "change_percent": data["change_percent"]})

        return results[:20]

    async def _search_coingecko(self, query: str) -> List[Dict]:
        """Search CoinGecko for crypto assets."""
        resp = await self._http.get(
            "https://api.coingecko.com/api/v3/search",
            params={"query": query},
        )
        if resp.status_code != 200:
            return []
        data = resp.json()
        results = []
        for coin in data.get("coins", [])[:10]:
            results.append({
                "symbol": coin["symbol"].upper(),
                "name": coin["name"],
                "type": "crypto",
                "coingecko_id": coin["id"],
                "thumb": coin.get("thumb", ""),
            })
        return results

    async def get_asset_data(self, symbol: str, asset_type: str, coingecko_id: str = None) -> Dict:
        """Fetch comprehensive market data for an asset."""
        if asset_type == "crypto":
            return await self._get_crypto_data(symbol, coingecko_id)
        elif asset_type == "stock":
            return self._get_mock_data(symbol, MOCK_STOCKS, "stock")
        elif asset_type == "forex":
            return self._get_mock_data(symbol, MOCK_FOREX, "forex")
        elif asset_type == "commodity":
            return self._get_mock_data(symbol, MOCK_COMMODITIES, "commodity")
        elif asset_type == "index":
            return self._get_mock_data(symbol, MOCK_INDICES, "index")
        else:
            return self._get_mock_data(symbol, MOCK_STOCKS, "stock")

    async def _get_crypto_data(self, symbol: str, coingecko_id: str = None) -> Dict:
        """Fetch real crypto data from CoinGecko."""
        cg_id = coingecko_id or symbol.lower().replace("usdt", "").replace("usd", "")

        # Map common symbols
        symbol_map = {"BTC": "bitcoin", "ETH": "ethereum", "SOL": "solana", "ADA": "cardano",
                      "XRP": "ripple", "DOGE": "dogecoin", "MATIC": "polygon", "DOT": "polkadot",
                      "AVAX": "avalanche-2", "LINK": "chainlink", "SHIB": "shiba-inu",
                      "LTC": "litecoin", "UNI": "uniswap", "ATOM": "cosmos", "NEAR": "near",
                      "APT": "aptos", "ARB": "arbitrum", "OP": "optimism", "SUI": "sui",
                      "PEPE": "pepe", "BONK": "bonk"}
        if not coingecko_id:
            clean = symbol.upper().replace("USDT", "").replace("USD", "")
            cg_id = symbol_map.get(clean, clean.lower())

        try:
            resp = await self._http.get(
                f"https://api.coingecko.com/api/v3/coins/{cg_id}",
                params={"localization": "false", "tickers": "false", "community_data": "false", "developer_data": "false"},
            )
            if resp.status_code == 200:
                coin = resp.json()
                md = coin.get("market_data", {})
                price = md.get("current_price", {}).get("usd", 0)
                candles = generate_candles(price, 200, 0.025)
                return {
                    "symbol": symbol.upper(),
                    "name": coin.get("name", symbol),
                    "type": "crypto",
                    "price": price,
                    "change_percent": md.get("price_change_percentage_24h", 0),
                    "volume": md.get("total_volume", {}).get("usd", 0),
                    "market_cap": md.get("market_cap", {}).get("usd", 0),
                    "high_24h": md.get("high_24h", {}).get("usd", 0),
                    "low_24h": md.get("low_24h", {}).get("usd", 0),
                    "ath": md.get("ath", {}).get("usd", 0),
                    "atl": md.get("atl", {}).get("usd", 0),
                    "candles": candles,
                    "source": "coingecko",
                }
        except Exception as e:
            logger.warning(f"CoinGecko detail fetch failed for {cg_id}: {e}")

        # Fallback to mock candle data
        price = 100.0
        return {
            "symbol": symbol.upper(),
            "name": symbol,
            "type": "crypto",
            "price": price,
            "change_percent": random.uniform(-5, 5),
            "volume": random.randint(1000000, 50000000),
            "market_cap": 0,
            "candles": generate_candles(price, 200, 0.025),
            "source": "mock_fallback",
        }

    def _get_mock_data(self, symbol: str, data_map: Dict, asset_type: str) -> Dict:
        """Get mock data for non-crypto assets."""
        sym = symbol.upper()
        entry = data_map.get(sym)
        if not entry:
            # Generate generic mock data
            price = random.uniform(10, 500)
            entry = {"name": sym, "price": price, "change_percent": random.uniform(-3, 3), "volume": random.randint(1000000, 50000000)}

        candles = generate_candles(entry["price"], 200, 0.012 if asset_type == "forex" else 0.018)
        return {
            "symbol": sym,
            "name": entry["name"],
            "type": asset_type,
            "price": entry["price"],
            "change_percent": entry["change_percent"],
            "volume": entry.get("volume", 0),
            "market_cap": entry.get("market_cap", 0),
            "candles": candles,
            "source": "mock",
        }

    async def close(self):
        await self._http.aclose()


# Singleton
market_data_adapter = MarketDataAdapter()
