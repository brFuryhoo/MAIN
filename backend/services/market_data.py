"""
Market Data Adapter Layer — Global Coverage
---------------------------------------------
Unified adapter for fetching market data from multiple providers:
- CoinGecko: Crypto (primary)
- Twelve Data: Stocks, Forex, Commodities, ETFs (primary for search + data)
- Polygon.io: US Stocks (historical candles)
- Alpha Vantage: Stocks, Forex (fallback)
- Mock: Ultimate fallback for any provider failure

Designed for plug-and-play: add new providers without touching the core pipeline.
"""

import os
import httpx
import random
import math
import time
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)

# ==================== SIMPLE IN-MEMORY CACHE ====================

_cache: Dict[str, dict] = {}
CACHE_TTL_SEARCH = 300     # 5 min for search results
CACHE_TTL_PRICE = 120      # 2 min for price data
CACHE_TTL_CANDLES = 600    # 10 min for candle data


def _cache_get(key: str) -> Optional[dict]:
    entry = _cache.get(key)
    if entry and time.time() - entry["ts"] < entry["ttl"]:
        return entry["data"]
    return None


def _cache_set(key: str, data, ttl: int):
    _cache[key] = {"data": data, "ts": time.time(), "ttl": ttl}


# ==================== MOCK FALLBACK DATA ====================

MOCK_DATA = {
    "AAPL":   {"name": "Apple Inc.", "price": 178.52, "type": "stock"},
    "GOOGL":  {"name": "Alphabet Inc.", "price": 141.80, "type": "stock"},
    "MSFT":   {"name": "Microsoft Corp.", "price": 378.91, "type": "stock"},
    "TSLA":   {"name": "Tesla Inc.", "price": 248.50, "type": "stock"},
    "NVDA":   {"name": "NVIDIA Corp.", "price": 495.22, "type": "stock"},
    "AMZN":   {"name": "Amazon.com", "price": 185.60, "type": "stock"},
    "XAUUSD": {"name": "Gold", "price": 2035.50, "type": "commodity"},
    "XAGUSD": {"name": "Silver", "price": 22.85, "type": "commodity"},
}


def generate_candles(base_price: float, count: int = 200, volatility: float = 0.015) -> List[Dict]:
    """Generate realistic OHLCV candle data with trending behavior."""
    candles = []
    price = base_price * random.uniform(0.85, 0.95)
    trend = random.choice([-1, 1]) * random.uniform(0.0005, 0.002)
    for i in range(count):
        if random.random() < 0.05:
            trend = random.choice([-1, 1]) * random.uniform(0.0005, 0.002)
        drift = trend + random.gauss(0, volatility)
        open_p = price
        close_p = price * (1 + drift)
        high = max(open_p, close_p) * (1 + abs(random.gauss(0, volatility * 0.5)))
        low = min(open_p, close_p) * (1 - abs(random.gauss(0, volatility * 0.5)))
        vol = max(100000, int(random.gauss(5000000, 2000000)))
        ts = datetime.now(timezone.utc) - timedelta(hours=count - i)
        candles.append({
            "timestamp": ts.isoformat(),
            "time": int(ts.timestamp()),
            "open": round(open_p, 6 if base_price < 1 else 2),
            "high": round(high, 6 if base_price < 1 else 2),
            "low": round(low, 6 if base_price < 1 else 2),
            "close": round(close_p, 6 if base_price < 1 else 2),
            "volume": vol,
        })
        price = close_p
    return candles


# ==================== PROVIDER CLASSES ====================

class TwelveDataProvider:
    """Primary provider for stocks, forex, commodities, ETFs — global coverage."""

    BASE = "https://api.twelvedata.com"

    def __init__(self, http: httpx.AsyncClient):
        self._http = http
        self._key = os.environ.get("TWELVE_DATA_KEY", "")

    async def search(self, query: str) -> List[Dict]:
        if not self._key:
            return []
        cache_key = f"td_search:{query}"
        cached = _cache_get(cache_key)
        if cached is not None:
            return cached
        try:
            resp = await self._http.get(f"{self.BASE}/symbol_search", params={
                "symbol": query, "apikey": self._key
            })
            if resp.status_code != 200:
                return []
            data = resp.json().get("data", [])
            results = []
            for item in data[:15]:
                inst = item.get("instrument_type", "").lower()
                asset_type = (
                    "stock" if inst in ("common stock", "equity", "etf", "depositary receipt") else
                    "forex" if inst == "physical currency" else
                    "index" if inst == "index" else
                    "crypto" if inst == "digital currency" else
                    "etf" if inst == "etf" else
                    "stock"
                )
                results.append({
                    "symbol": item.get("symbol", ""),
                    "name": item.get("instrument_name", ""),
                    "type": asset_type,
                    "exchange": item.get("exchange", ""),
                    "country": item.get("country", ""),
                    "provider": "twelve_data",
                })
            _cache_set(cache_key, results, CACHE_TTL_SEARCH)
            return results
        except Exception as e:
            logger.warning(f"Twelve Data search error: {e}")
            return []

    async def get_price(self, symbol: str) -> Optional[Dict]:
        if not self._key:
            return None
        cache_key = f"td_price:{symbol}"
        cached = _cache_get(cache_key)
        if cached is not None:
            return cached
        try:
            resp = await self._http.get(f"{self.BASE}/quote", params={
                "symbol": symbol, "apikey": self._key
            })
            if resp.status_code != 200:
                return None
            d = resp.json()
            if d.get("code"):
                return None
            result = {
                "price": float(d.get("close", 0) or 0),
                "open": float(d.get("open", 0) or 0),
                "high": float(d.get("high", 0) or 0),
                "low": float(d.get("low", 0) or 0),
                "volume": int(float(d.get("volume", 0) or 0)),
                "change_percent": float(d.get("percent_change", 0) or 0),
                "name": d.get("name", symbol),
                "exchange": d.get("exchange", ""),
                "source": "twelve_data",
            }
            _cache_set(cache_key, result, CACHE_TTL_PRICE)
            return result
        except Exception as e:
            logger.warning(f"Twelve Data price error for {symbol}: {e}")
            return None

    async def get_candles(self, symbol: str, interval: str = "1h", count: int = 200) -> List[Dict]:
        if not self._key:
            return []
        cache_key = f"td_candles:{symbol}:{interval}"
        cached = _cache_get(cache_key)
        if cached is not None:
            return cached
        try:
            resp = await self._http.get(f"{self.BASE}/time_series", params={
                "symbol": symbol, "interval": interval,
                "outputsize": str(min(count, 200)), "apikey": self._key,
                "order": "ASC",
            })
            if resp.status_code != 200:
                return []
            data = resp.json()
            if data.get("code"):
                return []
            values = data.get("values", [])
            candles = []
            for v in values:
                try:
                    ts = datetime.fromisoformat(v["datetime"].replace(" ", "T"))
                    candles.append({
                        "timestamp": ts.isoformat(),
                        "time": int(ts.timestamp()),
                        "open": float(v.get("open", 0)),
                        "high": float(v.get("high", 0)),
                        "low": float(v.get("low", 0)),
                        "close": float(v.get("close", 0)),
                        "volume": int(float(v.get("volume", 0) or 0)),
                    })
                except Exception:
                    continue
            _cache_set(cache_key, candles, CACHE_TTL_CANDLES)
            return candles
        except Exception as e:
            logger.warning(f"Twelve Data candles error for {symbol}: {e}")
            return []


class PolygonProvider:
    """US stocks & historical candle data."""

    BASE = "https://api.polygon.io"

    def __init__(self, http: httpx.AsyncClient):
        self._http = http
        self._key = os.environ.get("POLYGON_KEY", "")

    async def search(self, query: str) -> List[Dict]:
        if not self._key:
            return []
        cache_key = f"pg_search:{query}"
        cached = _cache_get(cache_key)
        if cached is not None:
            return cached
        try:
            resp = await self._http.get(f"{self.BASE}/v3/reference/tickers", params={
                "search": query, "limit": 15, "apiKey": self._key, "active": "true",
            })
            if resp.status_code != 200:
                return []
            results = []
            for item in resp.json().get("results", []):
                market = item.get("market", "").lower()
                asset_type = "stock" if market == "stocks" else "forex" if market == "fx" else "crypto" if market == "crypto" else "index" if market == "indices" else "stock"
                results.append({
                    "symbol": item.get("ticker", ""),
                    "name": item.get("name", ""),
                    "type": asset_type,
                    "exchange": item.get("primary_exchange", ""),
                    "market": market,
                    "provider": "polygon",
                })
            _cache_set(cache_key, results, CACHE_TTL_SEARCH)
            return results
        except Exception as e:
            logger.warning(f"Polygon search error: {e}")
            return []

    async def get_candles(self, symbol: str, timespan: str = "hour", days_back: int = 10) -> List[Dict]:
        if not self._key:
            return []
        cache_key = f"pg_candles:{symbol}:{timespan}"
        cached = _cache_get(cache_key)
        if cached is not None:
            return cached
        try:
            date_from = (datetime.now(timezone.utc) - timedelta(days=days_back)).strftime("%Y-%m-%d")
            date_to = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            resp = await self._http.get(
                f"{self.BASE}/v2/aggs/ticker/{symbol}/range/1/{timespan}/{date_from}/{date_to}",
                params={"adjusted": "true", "sort": "asc", "limit": 500, "apiKey": self._key}
            )
            if resp.status_code != 200:
                return []
            data = resp.json()
            candles = []
            for bar in data.get("results", []):
                ts_ms = bar.get("t", 0)
                candles.append({
                    "timestamp": datetime.fromtimestamp(ts_ms / 1000, tz=timezone.utc).isoformat(),
                    "time": int(ts_ms / 1000),
                    "open": bar.get("o", 0),
                    "high": bar.get("h", 0),
                    "low": bar.get("l", 0),
                    "close": bar.get("c", 0),
                    "volume": bar.get("v", 0),
                })
            _cache_set(cache_key, candles, CACHE_TTL_CANDLES)
            return candles
        except Exception as e:
            logger.warning(f"Polygon candles error for {symbol}: {e}")
            return []

    async def get_prev_close(self, symbol: str) -> Optional[Dict]:
        if not self._key:
            return None
        try:
            resp = await self._http.get(
                f"{self.BASE}/v2/aggs/ticker/{symbol}/prev",
                params={"adjusted": "true", "apiKey": self._key}
            )
            if resp.status_code != 200:
                return None
            results = resp.json().get("results", [])
            if not results:
                return None
            bar = results[0]
            return {
                "price": bar.get("c", 0),
                "open": bar.get("o", 0),
                "high": bar.get("h", 0),
                "low": bar.get("l", 0),
                "volume": bar.get("v", 0),
                "change_percent": round(((bar.get("c", 0) - bar.get("o", 0)) / bar.get("o", 1)) * 100, 2) if bar.get("o") else 0,
                "source": "polygon",
            }
        except Exception as e:
            logger.warning(f"Polygon prev close error for {symbol}: {e}")
            return None


class AlphaVantageProvider:
    """Fallback for stocks, forex, commodities."""

    BASE = "https://www.alphavantage.co/query"

    def __init__(self, http: httpx.AsyncClient):
        self._http = http
        self._key = os.environ.get("ALPHA_VANTAGE_KEY", "")

    async def search(self, query: str) -> List[Dict]:
        if not self._key:
            return []
        cache_key = f"av_search:{query}"
        cached = _cache_get(cache_key)
        if cached is not None:
            return cached
        try:
            resp = await self._http.get(self.BASE, params={
                "function": "SYMBOL_SEARCH", "keywords": query, "apikey": self._key
            })
            if resp.status_code != 200:
                return []
            matches = resp.json().get("bestMatches", [])
            results = []
            for m in matches[:10]:
                atype = m.get("3. type", "Equity")
                asset_type = "stock" if "Equity" in atype else "etf" if "ETF" in atype else "forex" if "Currency" in atype else "stock"
                results.append({
                    "symbol": m.get("1. symbol", ""),
                    "name": m.get("2. name", ""),
                    "type": asset_type,
                    "exchange": m.get("4. region", ""),
                    "provider": "alpha_vantage",
                })
            _cache_set(cache_key, results, CACHE_TTL_SEARCH)
            return results
        except Exception as e:
            logger.warning(f"Alpha Vantage search error: {e}")
            return []

    async def get_quote(self, symbol: str) -> Optional[Dict]:
        if not self._key:
            return None
        cache_key = f"av_quote:{symbol}"
        cached = _cache_get(cache_key)
        if cached is not None:
            return cached
        try:
            resp = await self._http.get(self.BASE, params={
                "function": "GLOBAL_QUOTE", "symbol": symbol, "apikey": self._key
            })
            if resp.status_code != 200:
                return None
            gq = resp.json().get("Global Quote", {})
            if not gq:
                return None
            result = {
                "price": float(gq.get("05. price", 0) or 0),
                "open": float(gq.get("02. open", 0) or 0),
                "high": float(gq.get("03. high", 0) or 0),
                "low": float(gq.get("04. low", 0) or 0),
                "volume": int(float(gq.get("06. volume", 0) or 0)),
                "change_percent": float(gq.get("10. change percent", "0").replace("%", "") or 0),
                "source": "alpha_vantage",
            }
            _cache_set(cache_key, result, CACHE_TTL_PRICE)
            return result
        except Exception as e:
            logger.warning(f"Alpha Vantage quote error for {symbol}: {e}")
            return None


class CoinGeckoProvider:
    """Crypto — free, no API key needed."""

    BASE = "https://api.coingecko.com/api/v3"

    SYMBOL_MAP = {
        "BTC": "bitcoin", "ETH": "ethereum", "SOL": "solana", "ADA": "cardano",
        "XRP": "ripple", "DOGE": "dogecoin", "MATIC": "polygon", "DOT": "polkadot",
        "AVAX": "avalanche-2", "LINK": "chainlink", "SHIB": "shiba-inu",
        "LTC": "litecoin", "UNI": "uniswap", "ATOM": "cosmos", "NEAR": "near",
        "APT": "aptos", "ARB": "arbitrum", "OP": "optimism", "SUI": "sui",
        "PEPE": "pepe", "BONK": "bonk", "BNB": "binancecoin",
    }

    def __init__(self, http: httpx.AsyncClient):
        self._http = http

    async def search(self, query: str) -> List[Dict]:
        cache_key = f"cg_search:{query}"
        cached = _cache_get(cache_key)
        if cached is not None:
            return cached
        try:
            resp = await self._http.get(f"{self.BASE}/search", params={"query": query})
            if resp.status_code != 200:
                return []
            results = []
            for coin in resp.json().get("coins", [])[:10]:
                results.append({
                    "symbol": coin["symbol"].upper(),
                    "name": coin["name"],
                    "type": "crypto",
                    "coingecko_id": coin["id"],
                    "thumb": coin.get("thumb", ""),
                    "provider": "coingecko",
                })
            _cache_set(cache_key, results, CACHE_TTL_SEARCH)
            return results
        except Exception as e:
            logger.warning(f"CoinGecko search error: {e}")
            return []

    async def get_data(self, symbol: str, coingecko_id: str = None) -> Optional[Dict]:
        clean = symbol.upper().replace("USDT", "").replace("USD", "")
        cg_id = coingecko_id or self.SYMBOL_MAP.get(clean, clean.lower())

        cache_key = f"cg_data:{cg_id}"
        cached = _cache_get(cache_key)
        if cached is not None:
            return cached
        try:
            resp = await self._http.get(
                f"{self.BASE}/coins/{cg_id}",
                params={"localization": "false", "tickers": "false", "community_data": "false", "developer_data": "false"}
            )
            if resp.status_code != 200:
                return None
            coin = resp.json()
            md = coin.get("market_data", {})
            price = md.get("current_price", {}).get("usd", 0)
            if not price:
                return None
            result = {
                "price": price,
                "change_percent": md.get("price_change_percentage_24h", 0) or 0,
                "volume": md.get("total_volume", {}).get("usd", 0),
                "market_cap": md.get("market_cap", {}).get("usd", 0),
                "high_24h": md.get("high_24h", {}).get("usd", 0),
                "low_24h": md.get("low_24h", {}).get("usd", 0),
                "name": coin.get("name", symbol),
                "source": "coingecko",
            }
            _cache_set(cache_key, result, CACHE_TTL_PRICE)
            return result
        except Exception as e:
            logger.warning(f"CoinGecko data error for {cg_id}: {e}")
            return None


# ==================== UNIFIED ADAPTER ====================

class MarketDataAdapter:
    """Unified adapter — routes requests to the best provider per asset type."""

    def __init__(self):
        self._http = httpx.AsyncClient(timeout=15)
        self.coingecko = CoinGeckoProvider(self._http)
        self.twelve_data = TwelveDataProvider(self._http)
        self.polygon = PolygonProvider(self._http)
        self.alpha_vantage = AlphaVantageProvider(self._http)

    async def search_assets(self, query: str) -> List[Dict]:
        """Search across ALL providers in parallel for global coverage."""
        if not query or len(query) < 1:
            return []

        import asyncio
        results_lists = await asyncio.gather(
            self.twelve_data.search(query),
            self.coingecko.search(query),
            self.polygon.search(query),
            return_exceptions=True,
        )

        merged = []
        seen_symbols = set()

        for result_list in results_lists:
            if isinstance(result_list, Exception):
                continue
            for item in result_list:
                sym = item.get("symbol", "")
                key = f"{sym}:{item.get('type', '')}"
                if key not in seen_symbols:
                    seen_symbols.add(key)
                    merged.append(item)

        return merged[:25]

    async def get_asset_data(self, symbol: str, asset_type: str, coingecko_id: str = None) -> Dict:
        """Fetch comprehensive market data for any global asset."""

        if asset_type == "crypto":
            return await self._get_crypto_data(symbol, coingecko_id)
        elif asset_type == "forex":
            return await self._get_forex_data(symbol)
        else:
            return await self._get_stock_data(symbol, asset_type)

    async def _get_crypto_data(self, symbol: str, coingecko_id: str = None) -> Dict:
        """Crypto: CoinGecko primary, mock candles (CG doesn't provide OHLCV freely)."""
        data = await self.coingecko.get_data(symbol, coingecko_id)
        if data:
            candles = generate_candles(data["price"], 200, 0.025)
            return {
                "symbol": symbol.upper(), "name": data["name"], "type": "crypto",
                "price": data["price"], "change_percent": data["change_percent"],
                "volume": data["volume"], "market_cap": data.get("market_cap", 0),
                "candles": candles, "source": data["source"],
            }
        # Fallback
        price = 100.0
        return {"symbol": symbol.upper(), "name": symbol, "type": "crypto",
                "price": price, "change_percent": 0, "volume": 0,
                "candles": generate_candles(price, 200, 0.025), "source": "mock_fallback"}

    async def _get_forex_data(self, symbol: str) -> Dict:
        """Forex: Twelve Data primary. Format forex symbols for Twelve Data (e.g. EURUSD → EUR/USD)."""
        # Convert EURUSD to EUR/USD for Twelve Data
        td_symbol = symbol
        if len(symbol) == 6 and "/" not in symbol:
            td_symbol = f"{symbol[:3]}/{symbol[3:]}"

        # Try Twelve Data quote
        price_data = await self.twelve_data.get_price(td_symbol)
        if price_data and price_data.get("price", 0) > 0:
            candles = await self.twelve_data.get_candles(td_symbol, interval="1h", count=200)
            if not candles:
                candles = generate_candles(price_data["price"], 200, 0.008)
            return {
                "symbol": symbol.upper(), "name": price_data.get("name", symbol),
                "type": "forex", "price": price_data["price"],
                "change_percent": price_data.get("change_percent", 0),
                "volume": price_data.get("volume", 0),
                "candles": candles, "source": price_data.get("source", "twelve_data"),
            }

        # Mock fallback
        mock = MOCK_DATA.get(symbol.upper())
        price = mock["price"] if mock else random.uniform(0.5, 150)
        return {"symbol": symbol.upper(), "name": mock["name"] if mock else symbol,
                "type": "forex", "price": price, "change_percent": random.uniform(-2, 2),
                "volume": 0, "candles": generate_candles(price, 200, 0.008), "source": "mock_fallback"}

    async def _get_stock_data(self, symbol: str, asset_type: str) -> Dict:
        """Stocks/ETFs/Commodities/Indices: Twelve Data → Polygon → Alpha Vantage → Mock."""

        # 1) Try Twelve Data for quote
        price_data = await self.twelve_data.get_price(symbol)

        # 2) Try Polygon for quote if Twelve Data failed
        if not price_data or price_data.get("price", 0) <= 0:
            pg = await self.polygon.get_prev_close(symbol)
            if pg and pg.get("price", 0) > 0:
                price_data = pg

        # 3) Try Alpha Vantage as last resort
        if not price_data or price_data.get("price", 0) <= 0:
            av = await self.alpha_vantage.get_quote(symbol)
            if av and av.get("price", 0) > 0:
                price_data = av

        # 4) Mock fallback
        if not price_data or price_data.get("price", 0) <= 0:
            mock = MOCK_DATA.get(symbol.upper())
            price = mock["price"] if mock else random.uniform(10, 500)
            name = mock["name"] if mock else symbol
            return {
                "symbol": symbol.upper(), "name": name, "type": asset_type,
                "price": price, "change_percent": random.uniform(-3, 3),
                "volume": random.randint(1000000, 50000000),
                "candles": generate_candles(price, 200, 0.018), "source": "mock_fallback",
            }

        price = price_data["price"]
        name = price_data.get("name", symbol)
        source = price_data.get("source", "unknown")

        # Get real candles: Polygon first (better historical), then Twelve Data
        candles = await self.polygon.get_candles(symbol, timespan="hour", days_back=10)
        if not candles:
            candles = await self.twelve_data.get_candles(symbol, interval="1h", count=200)

        # If real candles are insufficient for quality analysis, supplement with generated data
        if not candles or len(candles) < 50:
            candles = generate_candles(price, 200, 0.018)
            source += "+generated_candles"

        return {
            "symbol": symbol.upper(), "name": name, "type": asset_type,
            "price": price, "change_percent": price_data.get("change_percent", 0),
            "volume": price_data.get("volume", 0),
            "market_cap": price_data.get("market_cap", 0),
            "candles": candles, "source": source,
        }

    async def close(self):
        await self._http.aclose()


# Singleton
market_data_adapter = MarketDataAdapter()



# ══════════════════════════════════════════════════════════════
# ENHANCED REAL-TIME MARKET PULSE (Aureos AI Quantica)
# ══════════════════════════════════════════════════════════════

_pulse_cache = {"data": None, "ts": None}
_PULSE_TTL = 120  # seconds

async def get_real_market_pulse() -> list:
    """Unified market pulse with REAL prices from CoinGecko + Twelve Data"""
    import asyncio
    from datetime import datetime, timezone

    # Check cache
    if _pulse_cache["data"] and _pulse_cache["ts"]:
        age = (datetime.now(timezone.utc) - _pulse_cache["ts"]).total_seconds()
        if age < _PULSE_TTL:
            return _pulse_cache["data"]

    indicators = []
    adapter = market_data_adapter

    # 1) Crypto from CoinGecko
    try:
        for sym, cg_id in [("BTC/USD", "bitcoin"), ("ETH/USD", "ethereum"), ("SOL/USD", "solana")]:
            data = await adapter.coingecko.get_data(sym, cg_id)
            if data and data.get("price"):
                indicators.append({
                    "symbol": sym, "value": data["price"],
                    "change": data.get("change_percent_24h", 0), "type": "crypto"
                })
    except Exception as e:
        logger.warning(f"Crypto pulse error: {e}")

    # 2) Stocks & forex & commodities from Twelve Data
    try:
        td_symbols = ["SPY", "QQQ", "NVDA", "AAPL", "XAU/USD", "XAG/USD", "EUR/USD", "USD/BRL"]
        sym_str = ",".join(td_symbols)
        td_key = os.environ.get("TWELVE_DATA_KEY")
        if td_key:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(f"https://api.twelvedata.com/quote?symbol={sym_str}&apikey={td_key}")
                if resp.status_code == 200:
                    data = resp.json()
                    if isinstance(data, dict) and "symbol" in data:
                        data = {data["symbol"]: data}

                    label_map = {"SPY": "S&P 500", "QQQ": "NASDAQ", "XAU/USD": "GOLD", "XAG/USD": "SILVER"}
                    type_map = {"SPY": "index", "QQQ": "index", "NVDA": "stock", "AAPL": "stock",
                                "XAU/USD": "commodity", "XAG/USD": "commodity", "EUR/USD": "forex", "USD/BRL": "forex"}

                    for sym in td_symbols:
                        if sym in data and isinstance(data[sym], dict) and "close" in data[sym]:
                            try:
                                indicators.append({
                                    "symbol": label_map.get(sym, sym),
                                    "value": float(data[sym]["close"]),
                                    "change": float(data[sym].get("percent_change", 0)),
                                    "type": type_map.get(sym, "stock")
                                })
                            except (ValueError, TypeError):
                                pass
    except Exception as e:
        logger.warning(f"TD pulse error: {e}")

    if indicators:
        _pulse_cache["data"] = indicators
        _pulse_cache["ts"] = datetime.now(timezone.utc)

    return indicators


async def get_global_market_overview() -> dict:
    """Global market overview across ALL asset classes"""
    adapter = market_data_adapter
    crypto_global = {}
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get("https://api.coingecko.com/api/v3/global")
            if resp.status_code == 200:
                g = resp.json().get("data", {})
                crypto_global = {
                    "total_crypto_market_cap": g.get("total_market_cap", {}).get("usd", 0),
                    "total_crypto_volume_24h": g.get("total_volume", {}).get("usd", 0),
                    "btc_dominance": g.get("market_cap_percentage", {}).get("btc", 0),
                    "eth_dominance": g.get("market_cap_percentage", {}).get("eth", 0),
                    "active_cryptocurrencies": g.get("active_cryptocurrencies", 0),
                    "market_cap_change_24h": g.get("market_cap_change_percentage_24h_usd", 0),
                }
    except Exception as e:
        logger.warning(f"CG global error: {e}")

    return {
        "global_equity_market_cap": 110_000_000_000_000,
        "global_bond_market": 130_000_000_000_000,
        "global_forex_daily_volume": 7_500_000_000_000,
        "crypto_market_cap": crypto_global.get("total_crypto_market_cap", 0),
        "crypto_volume_24h": crypto_global.get("total_crypto_volume_24h", 0),
        "gold_market_cap": 16_000_000_000_000,
        "btc_dominance": crypto_global.get("btc_dominance", 0),
        "eth_dominance": crypto_global.get("eth_dominance", 0),
        "active_cryptocurrencies": crypto_global.get("active_cryptocurrencies", 0),
        "market_cap_change_24h": crypto_global.get("market_cap_change_24h", 0),
    }
