"""
JARVIS World Events Engine
============================
Aggregates real-world financial market events from multiple free data sources:
  - RSS feeds (Reuters, BBC Business, CoinDesk, Yahoo Finance)
  - Reddit public JSON API (worldnews, stocks, cryptocurrency)
  - In-memory caching with configurable TTL
  - Keyword-based fast scoring, sentiment detection, and asset mapping

All sources use graceful fallback — partial failures produce partial results.
"""

import asyncio
import hashlib
import logging
import re
import time
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional
from xml.etree import ElementTree

import httpx

logger = logging.getLogger(__name__)

# ─────────────────────────── in-memory cache ────────────────────────────────

_events_cache: Dict[str, dict] = {}  # key → {data, ts, ttl}


def _cache_get(key: str) -> Optional[dict]:
    entry = _events_cache.get(key)
    if entry and time.time() - entry["ts"] < entry["ttl"]:
        return entry["data"]
    return None


def _cache_set(key: str, data, ttl: int):
    _events_cache[key] = {"data": data, "ts": time.time(), "ttl": ttl}


# ─────────────────────────── keyword maps ───────────────────────────────────

CATEGORY_KEYWORDS: Dict[str, List[str]] = {
    "geopolitical": [
        "war", "conflict", "sanctions", "missile", "troops", "nato", "invasion",
        "attack", "military", "nuclear", "drone", "ceasefire", "airstrip",
        "diplomat", "treaty", "embargo", "coup", "protest", "riot", "terrorism",
    ],
    "macro": [
        "fed", "rate", "inflation", "cpi", "gdp", "unemployment", "recession",
        "central bank", "treasury", "yield", "federal reserve", "interest rate",
        "monetary policy", "fiscal", "stimulus", "quantitative", "fomc",
        "jobs report", "pce", "nonfarm", "payroll", "boj", "ecb", "imf",
    ],
    "crypto": [
        "bitcoin", "ethereum", "crypto", "blockchain", "defi", "nft", "binance",
        "coinbase", "sec crypto", "altcoin", "stablecoin", "solana", "ripple",
        "xrp", "btc", "eth", "web3", "token", "wallet", "mining",
    ],
    "equity": [
        "earnings", "revenue", "ipo", "merger", "acquisition", "lawsuit", "fda",
        "stock split", "buyback", "dividend", "s&p", "nasdaq", "dow jones",
        "quarterly", "profit", "loss", "guidance", "forecast", "downgrade",
        "upgrade", "analyst", "rating", "short squeeze",
    ],
    "commodity": [
        "oil", "gold", "silver", "wheat", "copper", "opec", "supply chain",
        "drought", "natural gas", "crude", "brent", "wti", "grain", "corn",
        "soybean", "lithium", "cobalt", "iron ore", "aluminum", "coffee",
    ],
    "forex": [
        "dollar", "yuan", "yen", "euro", "pound", "currency", "exchange rate",
        "devaluation", "usd", "eur", "jpy", "gbp", "cny", "cad", "aud",
        "emerging market", "fx", "forex", "reserve currency", "peg",
    ],
}

BULLISH_KEYWORDS = [
    "surge", "rally", "soar", "jump", "beat", "record", "approval",
    "breakthrough", "growth", "gain", "rise", "profit", "bullish",
    "rebound", "recovery", "upgrade", "beat expectations", "outperform",
    "deal", "partnership", "expansion", "breakthrough", "strong",
]

BEARISH_KEYWORDS = [
    "crash", "fall", "drop", "miss", "ban", "reject", "crisis", "default",
    "collapse", "war", "recession", "inflation", "sanction", "downgrade",
    "loss", "decline", "selloff", "plunge", "fear", "warning", "risk",
    "investigation", "fine", "lawsuit", "tariff", "bear", "slump",
]

# Asset sensitivity: which keywords map to which asset symbols
ASSET_KEYWORD_MAP: Dict[str, List[str]] = {
    "BTC":     ["bitcoin", "btc", "crypto", "coinbase", "binance", "defi", "blockchain"],
    "ETH":     ["ethereum", "eth", "defi", "nft", "smart contract", "web3"],
    "XRP":     ["ripple", "xrp"],
    "SOL":     ["solana", "sol"],
    "GOLD":    ["gold", "safe haven", "xau", "precious metal", "inflation hedge"],
    "SILVER":  ["silver", "xag", "precious metal"],
    "OIL":     ["oil", "crude", "brent", "wti", "opec", "petroleum", "energy"],
    "NVDA":    ["nvidia", "nvda", "ai chip", "semiconductor", "gpu", "data center"],
    "TSM":     ["tsmc", "tsm", "semiconductor", "taiwan", "chipmaker"],
    "AAPL":    ["apple", "aapl", "iphone", "ios", "app store"],
    "MSFT":    ["microsoft", "msft", "azure", "windows", "openai"],
    "GOOGL":   ["google", "alphabet", "googl", "youtube", "android"],
    "AMZN":    ["amazon", "amzn", "aws", "prime"],
    "META":    ["meta", "facebook", "instagram", "whatsapp", "zuckerberg"],
    "TSLA":    ["tesla", "tsla", "elon musk", "electric vehicle", "ev"],
    "SPY":     ["s&p 500", "s&p500", "spy", "stock market", "equity market"],
    "QQQ":     ["nasdaq", "qqq", "tech stocks"],
    "EUR/USD": ["euro", "eur", "ecb", "eurozone", "eu economy"],
    "USD/JPY": ["yen", "jpy", "boj", "bank of japan", "japan"],
    "GBP/USD": ["pound", "gbp", "uk economy", "bank of england"],
    "DXY":     ["dollar", "usd", "federal reserve", "fed", "dxy"],
    "XOM":     ["exxon", "xom", "oil major", "opec"],
    "CVX":     ["chevron", "cvx", "oil major"],
    "WHEAT":   ["wheat", "grain", "food crisis", "ukraine", "drought"],
    "COPPER":  ["copper", "industrial metal", "china demand"],
}

HIGH_IMPACT_KEYWORDS = [
    "fed rate", "rate hike", "rate cut", "emergency", "crash", "collapse",
    "war", "nuclear", "default", "crisis", "ban", "sanctions", "ceasefire",
    "cpi", "gdp", "recession", "hyperinflation", "circuit breaker",
]

# ─────────────────────────── RSS feed sources ────────────────────────────────

RSS_SOURCES = [
    {
        "url": "https://feeds.reuters.com/reuters/businessNews",
        "source": "Reuters",
    },
    {
        "url": "http://feeds.bbci.co.uk/news/business/rss.xml",
        "source": "BBC Business",
    },
    {
        "url": "https://www.coindesk.com/arc/outboundfeeds/rss/",
        "source": "CoinDesk",
    },
    {
        "url": "https://finance.yahoo.com/news/rssindex",
        "source": "Yahoo Finance",
    },
]

REDDIT_SUBREDDITS = ["worldnews", "stocks", "cryptocurrency"]

# ─────────────────────────── HTTP client ─────────────────────────────────────

_http_client: Optional[httpx.AsyncClient] = None


def _get_http_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(
            timeout=12,
            headers={
                "User-Agent": "AureosAI/1.0 (+https://aureos.tech)",
                "Accept": "application/rss+xml, application/xml, text/xml, */*",
            },
            follow_redirects=True,
        )
    return _http_client


# ─────────────────────────── RSS parsing ─────────────────────────────────────

def _safe_text(element, tag: str) -> str:
    """Extract text from an XML element by tag, safely."""
    child = element.find(tag)
    if child is None:
        # Try namespace-stripped
        for c in element:
            local = c.tag.split("}")[-1] if "}" in c.tag else c.tag
            if local == tag:
                return (c.text or "").strip()
        return ""
    return (child.text or "").strip()


def _parse_rss_xml(xml_text: str, source: str, max_items: int = 5) -> List[Dict]:
    """Parse RSS XML string into a list of event dicts."""
    items = []
    try:
        root = ElementTree.fromstring(xml_text)
    except ElementTree.ParseError as exc:
        logger.warning(f"RSS XML parse error for {source}: {exc}")
        return []

    # Handle both RSS <channel><item> and Atom <entry>
    ns_map = {"atom": "http://www.w3.org/2005/Atom"}

    # Try finding items via standard RSS first
    found_items = root.findall(".//item")
    if not found_items:
        # Try Atom feed entries
        found_items = root.findall(".//atom:entry", ns_map) or root.findall(".//entry")

    for item in found_items[:max_items]:
        # Title
        title = _safe_text(item, "title")
        if not title:
            for child in item:
                local = child.tag.split("}")[-1] if "}" in child.tag else child.tag
                if local == "title":
                    title = (child.text or "").strip()
                    break

        # Link
        link = _safe_text(item, "link")
        if not link:
            # Try <link href="..."> (Atom style)
            for child in item:
                local = child.tag.split("}")[-1] if "}" in child.tag else child.tag
                if local == "link":
                    link = child.get("href", child.text or "")
                    break

        # Published date
        published = (
            _safe_text(item, "pubDate")
            or _safe_text(item, "published")
            or _safe_text(item, "updated")
            or datetime.now(timezone.utc).isoformat()
        )

        # Normalize date
        try:
            # Try ISO parse first
            pub_dt = datetime.fromisoformat(published.replace("Z", "+00:00"))
            published = pub_dt.isoformat()
        except ValueError:
            try:
                from email.utils import parsedate_to_datetime
                pub_dt = parsedate_to_datetime(published)
                published = pub_dt.isoformat()
            except Exception:
                published = datetime.now(timezone.utc).isoformat()

        if title:
            items.append({
                "title": title,
                "link": link,
                "published": published,
                "source": source,
            })

    return items


async def fetch_rss_headlines(url: str, max_items: int = 5) -> List[Dict]:
    """
    Fetch and parse RSS XML via httpx.
    Returns [{title, link, published, source}]
    """
    source_label = next(
        (s["source"] for s in RSS_SOURCES if s["url"] == url), url.split("/")[2]
    )
    cache_key = f"rss:{url}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    client = _get_http_client()
    try:
        resp = await client.get(url)
        resp.raise_for_status()
        items = _parse_rss_xml(resp.text, source_label, max_items)
        _cache_set(cache_key, items, ttl=300)
        logger.info(f"RSS [{source_label}]: fetched {len(items)} items")
        return items
    except httpx.TimeoutException:
        logger.warning(f"RSS timeout: {url}")
        return []
    except httpx.HTTPStatusError as exc:
        logger.warning(f"RSS HTTP error {exc.response.status_code}: {url}")
        return []
    except Exception as exc:
        logger.warning(f"RSS fetch error [{source_label}]: {exc}")
        return []


# ─────────────────────────── Reddit ─────────────────────────────────────────

async def fetch_reddit_posts(subreddit: str, limit: int = 10) -> List[Dict]:
    """
    Fetch hot posts from a subreddit's public JSON API.
    Returns [{title, score, url, created_utc, subreddit}]
    """
    cache_key = f"reddit:{subreddit}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    api_url = f"https://www.reddit.com/r/{subreddit}/hot.json?limit={limit}"
    client = _get_http_client()
    try:
        resp = await client.get(
            api_url,
            headers={"User-Agent": "AureosAI/1.0"},
        )
        resp.raise_for_status()
        data = resp.json()
        posts = []
        for child in data.get("data", {}).get("children", []):
            p = child.get("data", {})
            title = p.get("title", "")
            if not title or p.get("stickied"):
                continue
            posts.append({
                "title": title,
                "score": p.get("score", 0),
                "url": p.get("url", ""),
                "permalink": f"https://reddit.com{p.get('permalink', '')}",
                "created_utc": datetime.fromtimestamp(
                    p.get("created_utc", 0), tz=timezone.utc
                ).isoformat(),
                "subreddit": subreddit,
                "source": f"Reddit r/{subreddit}",
            })
        _cache_set(cache_key, posts, ttl=300)
        logger.info(f"Reddit r/{subreddit}: fetched {len(posts)} posts")
        return posts
    except httpx.TimeoutException:
        logger.warning(f"Reddit timeout: r/{subreddit}")
        return []
    except httpx.HTTPStatusError as exc:
        logger.warning(f"Reddit HTTP error {exc.response.status_code}: r/{subreddit}")
        return []
    except Exception as exc:
        logger.warning(f"Reddit fetch error r/{subreddit}: {exc}")
        return []


# ─────────────────────────── scoring engine ──────────────────────────────────

def score_event_relevance(title: str, description: str = "") -> Dict:
    """
    Keyword-based fast scoring (no LLM call).

    Returns:
    {
      "relevance_score": 0-100,
      "sentiment": "bullish" | "bearish" | "neutral",
      "affected_assets": ["BTC", "GOLD", ...],
      "category": "geopolitical" | "macro" | "crypto" | "equity" | "commodity" | "forex",
      "impact_level": "HIGH" | "MEDIUM" | "LOW",
    }
    """
    combined = (title + " " + description).lower()

    # 1. Category detection — score each category by keyword hits
    category_scores: Dict[str, int] = {}
    for cat, keywords in CATEGORY_KEYWORDS.items():
        hits = sum(1 for kw in keywords if kw in combined)
        if hits:
            category_scores[cat] = hits

    category = max(category_scores, key=category_scores.get) if category_scores else "macro"
    total_keyword_hits = sum(category_scores.values())

    # 2. Relevance score: baseline from keyword density + category weight
    cat_weights = {
        "macro": 25, "geopolitical": 22, "equity": 20,
        "crypto": 20, "commodity": 18, "forex": 15,
    }
    base_score = min(40, total_keyword_hits * 8) + cat_weights.get(category, 15)

    # Boost for high-impact keywords
    high_impact_hits = sum(1 for kw in HIGH_IMPACT_KEYWORDS if kw in combined)
    base_score += high_impact_hits * 10

    relevance_score = min(100, max(10, base_score))

    # 3. Sentiment detection
    bull_hits = sum(1 for kw in BULLISH_KEYWORDS if kw in combined)
    bear_hits = sum(1 for kw in BEARISH_KEYWORDS if kw in combined)
    if bull_hits > bear_hits:
        sentiment = "bullish"
    elif bear_hits > bull_hits:
        sentiment = "bearish"
    else:
        sentiment = "neutral"

    # 4. Affected assets detection
    affected_assets: List[str] = []
    for asset, keywords in ASSET_KEYWORD_MAP.items():
        if any(kw in combined for kw in keywords):
            affected_assets.append(asset)

    # Category-level defaults when no specific assets matched
    if not affected_assets:
        defaults = {
            "geopolitical": ["GOLD", "OIL", "SPY"],
            "macro":        ["SPY", "QQQ", "DXY", "GOLD"],
            "crypto":       ["BTC", "ETH"],
            "equity":       ["SPY", "QQQ"],
            "commodity":    ["GOLD", "OIL", "COPPER"],
            "forex":        ["EUR/USD", "DXY", "USD/JPY"],
        }
        affected_assets = defaults.get(category, ["SPY"])

    # 5. Impact level
    if relevance_score >= 70 or high_impact_hits >= 2:
        impact_level = "HIGH"
    elif relevance_score >= 40:
        impact_level = "MEDIUM"
    else:
        impact_level = "LOW"

    return {
        "relevance_score": relevance_score,
        "sentiment": sentiment,
        "affected_assets": affected_assets[:8],  # cap at 8
        "category": category,
        "impact_level": impact_level,
    }


# ─────────────────────────── deduplication ───────────────────────────────────

def _dedup_events(events: List[Dict]) -> List[Dict]:
    """
    Deduplicate events by title similarity using a simple hash fingerprint.
    Two titles that share >= 60% words are considered duplicates.
    """
    seen_fingerprints: Dict[str, str] = {}  # fingerprint → first event id
    unique: List[Dict] = []

    def _fingerprint(title: str) -> frozenset:
        words = set(re.sub(r"[^\w\s]", "", title.lower()).split())
        return frozenset(w for w in words if len(w) > 3)

    for evt in events:
        fp = _fingerprint(evt.get("title", ""))
        if not fp:
            unique.append(evt)
            continue
        is_dup = False
        for seen_fp_str in seen_fingerprints:
            seen_fp = frozenset(seen_fp_str.split("|"))
            if len(fp) > 0 and len(seen_fp) > 0:
                overlap = len(fp & seen_fp) / max(len(fp), len(seen_fp))
                if overlap >= 0.6:
                    is_dup = True
                    break
        if not is_dup:
            fp_key = "|".join(sorted(fp))
            seen_fingerprints[fp_key] = evt["id"]
            unique.append(evt)

    return unique


# ─────────────────────────── main aggregator ─────────────────────────────────

async def aggregate_world_events(use_cache_seconds: int = 300) -> Dict:
    """
    Master aggregator — fetches all sources in parallel, deduplicates events,
    scores market relevance, and returns a structured event feed.

    Returns:
    {
      "events": [...],
      "total": int,
      "categories": {"geopolitical": N, ...},
      "market_temperature": "HOT" | "WARM" | "COOL",
      "top_themes": [...],
      "generated_at": ISO timestamp,
    }
    """
    cache_key = "world_events:aggregate"
    cached = _cache_get(cache_key)
    if cached is not None:
        logger.debug("World events: returning cached aggregate")
        return cached

    # ── parallel fetch ──────────────────────────────────────────────────────
    rss_tasks = [fetch_rss_headlines(s["url"], max_items=5) for s in RSS_SOURCES]
    reddit_tasks = [fetch_reddit_posts(sub, limit=10) for sub in REDDIT_SUBREDDITS]

    all_results = await asyncio.gather(*rss_tasks, *reddit_tasks, return_exceptions=True)

    raw_items: List[Dict] = []
    for result in all_results:
        if isinstance(result, Exception):
            logger.warning(f"Source fetch error (skipping): {result}")
            continue
        raw_items.extend(result)

    # ── normalise into event objects ────────────────────────────────────────
    events: List[Dict] = []
    for item in raw_items:
        title = item.get("title", "").strip()
        if not title or len(title) < 10:
            continue

        scoring = score_event_relevance(title)

        # Stable ID from URL or title hash
        id_src = item.get("link") or item.get("permalink") or item.get("url") or title
        event_id = hashlib.md5(id_src.encode()).hexdigest()[:16]

        events.append({
            "id": event_id,
            "title": title,
            "source": item.get("source", "Unknown"),
            "category": scoring["category"],
            "relevance_score": scoring["relevance_score"],
            "sentiment": scoring["sentiment"],
            "affected_assets": scoring["affected_assets"],
            "impact_level": scoring["impact_level"],
            "published_at": item.get("published") or item.get("created_utc") or datetime.now(timezone.utc).isoformat(),
            "url": item.get("link") or item.get("permalink") or item.get("url") or "",
        })

    # ── dedup ───────────────────────────────────────────────────────────────
    events = _dedup_events(events)

    # ── sort by relevance ────────────────────────────────────────────────────
    events.sort(key=lambda e: e["relevance_score"], reverse=True)

    # ── category counts ──────────────────────────────────────────────────────
    category_counts: Dict[str, int] = {
        "geopolitical": 0, "macro": 0, "crypto": 0,
        "equity": 0, "commodity": 0, "forex": 0,
    }
    for evt in events:
        cat = evt.get("category", "macro")
        category_counts[cat] = category_counts.get(cat, 0) + 1

    # ── market temperature ───────────────────────────────────────────────────
    high_impact_count = sum(1 for e in events if e["impact_level"] == "HIGH")
    bearish_count = sum(1 for e in events if e["sentiment"] == "bearish")
    total = len(events)

    if high_impact_count >= 3 or (total > 0 and bearish_count / max(total, 1) > 0.55):
        market_temperature = "HOT"
    elif high_impact_count >= 1 or (total > 0 and bearish_count / max(total, 1) > 0.35):
        market_temperature = "WARM"
    else:
        market_temperature = "COOL"

    # ── top themes ───────────────────────────────────────────────────────────
    theme_asset_map = {
        "Fed policy":        ["macro", "forex"],
        "Crypto market":     ["crypto"],
        "Geopolitical risk": ["geopolitical"],
        "Equity earnings":   ["equity"],
        "Commodity prices":  ["commodity"],
        "Currency markets":  ["forex"],
    }
    top_themes: List[str] = []
    for theme, cats in theme_asset_map.items():
        if any(category_counts.get(c, 0) > 0 for c in cats):
            top_themes.append(theme)
    # Enrich with most common keywords from top events
    top_5_titles = " ".join(e["title"].lower() for e in events[:5])
    if "china" in top_5_titles or "taiwan" in top_5_titles:
        top_themes.insert(0, "US-China tensions")
    if "ukraine" in top_5_titles or "russia" in top_5_titles:
        top_themes.insert(0, "Russia-Ukraine conflict")
    if "bitcoin" in top_5_titles or "crypto" in top_5_titles:
        top_themes.insert(0, "Crypto rally/correction")
    top_themes = list(dict.fromkeys(top_themes))[:5]  # deduplicate, keep order

    result = {
        "events": events,
        "total": len(events),
        "categories": category_counts,
        "market_temperature": market_temperature,
        "top_themes": top_themes,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

    _cache_set(cache_key, result, ttl=use_cache_seconds)
    logger.info(
        f"World events aggregated: {len(events)} events, temp={market_temperature}, themes={top_themes[:3]}"
    )
    return result
