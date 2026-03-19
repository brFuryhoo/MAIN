from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Header, WebSocket, WebSocketDisconnect
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import httpx
import asyncio
from emergentintegrations.llm.chat import LlmChat, UserMessage
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest, CheckoutSessionResponse
from emergentintegrations.llm.openai import OpenAITextToSpeech, OpenAISpeechToText
from fastapi import UploadFile, File
from fastapi.responses import Response
import base64
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT config
JWT_SECRET = os.environ.get('JWT_SECRET', 'aureos_ai_secure_secret')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Create the main app
limiter = Limiter(key_func=get_remote_address, default_limits=["120/minute"])
app = FastAPI(title="Aureos AI API", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s | %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger("aureos")

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = datetime.now(timezone.utc)
    response = await call_next(request)
    duration = (datetime.now(timezone.utc) - start).total_seconds()
    if request.url.path.startswith("/api") and request.url.path not in ("/api/health", "/api/ws"):
        level = "WARNING" if response.status_code >= 400 else "INFO"
        logger.log(
            logging.WARNING if response.status_code >= 400 else logging.INFO,
            f"{request.method} {request.url.path} -> {response.status_code} ({duration:.2f}s) [{request.client.host if request.client else 'unknown'}]"
        )
    return response

# ==================== MODELS ====================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    subscription_plan: str = "free"
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class PasswordReset(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

class PortfolioPosition(BaseModel):
    symbol: str
    asset_type: str
    quantity: float
    avg_price: float
    current_price: Optional[float] = None

class CopilotMessage(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None

class CopilotResponse(BaseModel):
    id: str
    response: str
    trade_suggestion: Optional[Dict[str, Any]] = None
    confidence_score: Optional[float] = None
    timestamp: str

class TutorialProgress(BaseModel):
    step: int
    completed: bool

class CheckoutRequest(BaseModel):
    plan_id: str
    origin_url: str

class PaymentStatusResponse(BaseModel):
    status: str
    payment_status: str
    plan_id: Optional[str] = None

# Subscription Plans (Updated Pricing)
SUBSCRIPTION_PLANS = {
    "essential": {
        "id": "essential",
        "name": "Essential",
        "price": 39.00,
        "currency": "usd",
        "features": ["Core charts & live data", "Basic AI predictions", "10 watchlist items", "Daily market brief", "Email support"]
    },
    "pro": {
        "id": "pro",
        "name": "Pro",
        "price": 99.00,
        "currency": "usd",
        "features": ["All Essential features", "Advanced analytics", "Portfolio insights", "Real-time risk alerts", "100 watchlist items", "Priority support", "Historical backtesting"]
    },
    "elite": {
        "id": "elite",
        "name": "Elite",
        "price": 239.00,
        "currency": "usd",
        "features": ["All Pro features", "Institutional-grade analytics", "Full API access", "Dedicated AI guidance", "Unlimited watchlist", "Personal account manager", "Custom alerts", "White-glove onboarding"]
    }
}

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_optional_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        return user
    except:
        return None

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/register", response_model=TokenResponse)
@limiter.limit("5/minute")
async def register(request: Request, data: UserCreate):
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": data.email,
        "password_hash": hash_password(data.password),
        "full_name": data.full_name,
        "subscription_plan": "free",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "watchlist": [],
        "portfolio": [],
        "tutorial_progress": {"step": 0, "completed": False}
    }
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id, data.email)
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            email=data.email,
            full_name=data.full_name,
            subscription_plan="free",
            created_at=user_doc["created_at"]
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(request: Request, data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"], user["email"])
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            full_name=user["full_name"],
            subscription_plan=user.get("subscription_plan", "free"),
            created_at=user["created_at"]
        )
    )

@api_router.post("/auth/password-reset")
async def request_password_reset(data: PasswordReset):
    user = await db.users.find_one({"email": data.email})
    if user:
        reset_token = str(uuid.uuid4())
        await db.password_resets.insert_one({
            "token": reset_token,
            "email": data.email,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "used": False
        })
    return {"message": "If email exists, reset link will be sent"}

@api_router.post("/auth/google-session")
async def google_oauth_session(request: Request):
    """Exchange Emergent OAuth session_id for JWT token."""
    import aiohttp
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing session_id")

    # REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id},
                timeout=aiohttp.ClientTimeout(total=10),
            ) as resp:
                if resp.status != 200:
                    raise HTTPException(status_code=401, detail="Invalid session")
                google_data = await resp.json()

        email = google_data.get("email")
        name = google_data.get("name", "")
        picture = google_data.get("picture", "")

        # Find or create user
        existing = await db.users.find_one({"email": email}, {"_id": 0})
        if existing:
            user_id = existing["id"]
            # Update name/picture if needed
            await db.users.update_one({"email": email}, {"$set": {"picture": picture, "full_name": name or existing.get("full_name", "")}})
        else:
            user_id = str(uuid.uuid4())
            user_doc = {
                "id": user_id,
                "email": email,
                "password_hash": "",
                "full_name": name,
                "picture": picture,
                "subscription_plan": "free",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "auth_provider": "google",
            }
            await db.users.insert_one(user_doc)

        token = create_token(user_id, email)
        return {
            "access_token": token,
            "user": {
                "id": user_id,
                "email": email,
                "full_name": name,
                "picture": picture,
                "subscription_plan": existing.get("subscription_plan", "free") if existing else "free",
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Google OAuth error: {e}")
        raise HTTPException(status_code=500, detail="OAuth error")

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(
        id=user["id"],
        email=user["email"],
        full_name=user["full_name"],
        subscription_plan=user.get("subscription_plan", "free"),
        created_at=user["created_at"]
    )

# ==================== MARKET DATA ENDPOINTS ====================

# Mock market data for MVP
MOCK_STOCKS = {
    "AAPL": {"name": "Apple Inc.", "price": 178.52, "change": 2.34, "change_percent": 1.33, "volume": 52340000},
    "GOOGL": {"name": "Alphabet Inc.", "price": 141.80, "change": -1.22, "change_percent": -0.85, "volume": 18920000},
    "MSFT": {"name": "Microsoft Corp.", "price": 378.91, "change": 4.56, "change_percent": 1.22, "volume": 21450000},
    "TSLA": {"name": "Tesla Inc.", "price": 248.50, "change": -5.30, "change_percent": -2.09, "volume": 89230000},
    "NVDA": {"name": "NVIDIA Corp.", "price": 495.22, "change": 12.45, "change_percent": 2.58, "volume": 45670000},
    "BHP": {"name": "BHP Group (ASX)", "price": 45.80, "change": 0.65, "change_percent": 1.44, "volume": 8920000},
    "CBA": {"name": "Commonwealth Bank (ASX)", "price": 112.30, "change": -0.85, "change_percent": -0.75, "volume": 5430000},
    "WES": {"name": "Wesfarmers (ASX)", "price": 58.45, "change": 1.20, "change_percent": 2.10, "volume": 3210000},
}

MOCK_CRYPTO = {
    "bitcoin": {"name": "Bitcoin", "symbol": "BTC", "price": 43250.00, "change_24h": 2.45, "market_cap": 847000000000, "volume_24h": 28500000000},
    "ethereum": {"name": "Ethereum", "symbol": "ETH", "price": 2280.50, "change_24h": 1.82, "market_cap": 274000000000, "volume_24h": 15200000000},
    "solana": {"name": "Solana", "symbol": "SOL", "price": 98.75, "change_24h": -3.21, "market_cap": 42000000000, "volume_24h": 2100000000},
    "cardano": {"name": "Cardano", "symbol": "ADA", "price": 0.52, "change_24h": 0.95, "market_cap": 18500000000, "volume_24h": 520000000},
    "ripple": {"name": "Ripple", "symbol": "XRP", "price": 0.62, "change_24h": -1.15, "market_cap": 33000000000, "volume_24h": 1200000000},
}

MOCK_FOREX = {
    "AUDUSD": {"name": "AUD/USD", "price": 0.6542, "change": 0.0012, "change_percent": 0.18},
    "EURUSD": {"name": "EUR/USD", "price": 1.0865, "change": -0.0023, "change_percent": -0.21},
    "GBPUSD": {"name": "GBP/USD", "price": 1.2645, "change": 0.0034, "change_percent": 0.27},
    "USDJPY": {"name": "USD/JPY", "price": 148.52, "change": 0.45, "change_percent": 0.30},
}

def generate_chart_data(base_price: float, points: int = 100) -> List[Dict]:
    import random
    data = []
    price = base_price * 0.95
    for i in range(points):
        open_price = price
        high = price * (1 + random.uniform(0.001, 0.02))
        low = price * (1 - random.uniform(0.001, 0.02))
        close = price * (1 + random.uniform(-0.015, 0.015))
        volume = random.randint(1000000, 10000000)
        timestamp = (datetime.now(timezone.utc) - timedelta(hours=points - i)).isoformat()
        data.append({
            "timestamp": timestamp,
            "open": round(open_price, 2),
            "high": round(high, 2),
            "low": round(low, 2),
            "close": round(close, 2),
            "volume": volume
        })
        price = close
    return data

@api_router.get("/market/stocks")
async def get_stocks():
    stocks = []
    for symbol, data in MOCK_STOCKS.items():
        stocks.append({
            "symbol": symbol,
            **data
        })
    return {"stocks": stocks, "source": "mock", "timestamp": datetime.now(timezone.utc).isoformat()}

@api_router.get("/market/stocks/{symbol}")
async def get_stock(symbol: str):
    symbol = symbol.upper()
    if symbol not in MOCK_STOCKS:
        raise HTTPException(status_code=404, detail="Stock not found")
    return {
        "symbol": symbol,
        **MOCK_STOCKS[symbol],
        "chart_data": generate_chart_data(MOCK_STOCKS[symbol]["price"]),
        "source": "mock"
    }

@api_router.get("/market/crypto")
async def get_crypto():
    cryptos = []
    for coin_id, data in MOCK_CRYPTO.items():
        cryptos.append({
            "id": coin_id,
            **data
        })
    return {"crypto": cryptos, "source": "mock", "timestamp": datetime.now(timezone.utc).isoformat()}

@api_router.get("/market/crypto/{coin_id}")
async def get_crypto_detail(coin_id: str):
    coin_id = coin_id.lower()
    if coin_id not in MOCK_CRYPTO:
        raise HTTPException(status_code=404, detail="Cryptocurrency not found")
    return {
        "id": coin_id,
        **MOCK_CRYPTO[coin_id],
        "chart_data": generate_chart_data(MOCK_CRYPTO[coin_id]["price"]),
        "source": "mock"
    }

@api_router.get("/market/forex")
async def get_forex():
    pairs = []
    for pair, data in MOCK_FOREX.items():
        pairs.append({
            "pair": pair,
            **data
        })
    return {"forex": pairs, "source": "mock", "timestamp": datetime.now(timezone.utc).isoformat()}

@api_router.get("/market/overview")
async def get_market_overview():
    return {
        "indices": [
            {"name": "S&P 500", "value": 4785.23, "change": 0.82, "change_percent": 0.02},
            {"name": "NASDAQ", "value": 15032.48, "change": 125.67, "change_percent": 0.84},
            {"name": "ASX 200", "value": 7456.80, "change": -23.45, "change_percent": -0.31},
            {"name": "DOW", "value": 37468.90, "change": 145.23, "change_percent": 0.39},
        ],
        "trending_stocks": list(MOCK_STOCKS.keys())[:5],
        "trending_crypto": list(MOCK_CRYPTO.keys())[:5],
        "market_sentiment": "bullish",
        "fear_greed_index": 68,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@api_router.get("/market/heatmap")
async def get_heatmap():
    heatmap_data = []
    for symbol, data in MOCK_STOCKS.items():
        heatmap_data.append({
            "symbol": symbol,
            "name": data["name"],
            "change_percent": data["change_percent"],
            "volume": data["volume"],
            "sector": "Technology" if symbol in ["AAPL", "GOOGL", "MSFT", "NVDA", "TSLA"] else "Resources"
        })
    return {"heatmap": heatmap_data}

# ==================== AI COPILOT ENDPOINTS ====================

@api_router.post("/copilot/chat", response_model=CopilotResponse)
@limiter.limit("20/minute")
async def chat_with_copilot(request: Request, data: CopilotMessage, user: dict = Depends(get_current_user)):
    try:
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="AI service not configured")
        
        # System message for trading copilot
        system_message = """You are Aureos AI Copilot, an advanced trading intelligence assistant. You provide:
1. Market analysis with probability-based trade suggestions (bullish/bearish percentages)
2. Best entry and exit point recommendations with clear reasoning
3. Risk assessment and position sizing guidance
4. Educational explanations for each recommendation

Always be precise, data-driven, and explain your reasoning clearly. Format your responses with clear sections.
When making trade suggestions, include:
- Direction: Bullish/Bearish with confidence percentage
- Entry Zone: Specific price range
- Target: Price target with timeframe
- Stop Loss: Risk management level
- Reasoning: Brief explanation of the analysis

Remember: This is for educational purposes. Always recommend users do their own research."""

        chat = LlmChat(
            api_key=api_key,
            session_id=f"aureos_{user['id']}_{datetime.now().strftime('%Y%m%d')}",
            system_message=system_message
        ).with_model("openai", "gpt-5.2")
        
        # Build context message
        context_info = ""
        if data.context:
            if "symbol" in data.context:
                context_info = f"\nContext: Analyzing {data.context.get('symbol', '')} - Current price: ${data.context.get('price', 'N/A')}"
        
        user_message = UserMessage(text=f"{data.message}{context_info}")
        response = await chat.send_message(user_message)
        
        # Parse response for trade suggestion
        trade_suggestion = None
        confidence = None
        
        response_lower = response.lower()
        if "bullish" in response_lower:
            confidence = 0.65 + (0.2 * (response_lower.count("strong") + response_lower.count("high")))
            trade_suggestion = {"direction": "bullish", "confidence": min(confidence, 0.92)}
        elif "bearish" in response_lower:
            confidence = 0.65 + (0.2 * (response_lower.count("strong") + response_lower.count("high")))
            trade_suggestion = {"direction": "bearish", "confidence": min(confidence, 0.92)}
        
        # Store conversation
        conversation_doc = {
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "message": data.message,
            "response": response,
            "trade_suggestion": trade_suggestion,
            "confidence_score": confidence,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        await db.copilot_conversations.insert_one(conversation_doc)
        
        return CopilotResponse(
            id=conversation_doc["id"],
            response=response,
            trade_suggestion=trade_suggestion,
            confidence_score=confidence,
            timestamp=conversation_doc["timestamp"]
        )
        
    except Exception as e:
        logger.error(f"Copilot error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")

@api_router.get("/copilot/history")
async def get_copilot_history(limit: int = 20, user: dict = Depends(get_current_user)):
    conversations = await db.copilot_conversations.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(limit)
    return {"conversations": conversations}

@api_router.get("/copilot/quick-analysis/{symbol}")
async def get_quick_analysis(symbol: str, user: dict = Depends(get_current_user)):
    symbol = symbol.upper()
    
    # Get market data
    stock_data = MOCK_STOCKS.get(symbol)
    crypto_data = MOCK_CRYPTO.get(symbol.lower())
    
    if not stock_data and not crypto_data:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    asset_data = stock_data if stock_data else crypto_data
    price = asset_data.get("price", 0)
    change = asset_data.get("change_percent", asset_data.get("change_24h", 0))
    
    # Generate quick analysis
    direction = "bullish" if change > 0 else "bearish"
    confidence = min(0.55 + abs(change) / 20, 0.85)
    
    return {
        "symbol": symbol,
        "current_price": price,
        "change_percent": change,
        "quick_analysis": {
            "direction": direction,
            "confidence": round(confidence, 2),
            "entry_zone": {"low": round(price * 0.98, 2), "high": round(price * 1.01, 2)},
            "target": round(price * (1.05 if direction == "bullish" else 0.95), 2),
            "stop_loss": round(price * (0.97 if direction == "bullish" else 1.03), 2),
            "risk_reward_ratio": "1:2.5"
        },
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

# ==================== PORTFOLIO ENDPOINTS ====================

@api_router.get("/portfolio")
async def get_portfolio(user: dict = Depends(get_current_user)):
    portfolio = user.get("portfolio", [])
    total_value = 0
    total_pnl = 0
    
    for position in portfolio:
        symbol = position["symbol"]
        stock = MOCK_STOCKS.get(symbol)
        crypto = MOCK_CRYPTO.get(symbol.lower())
        
        current_price = 0
        if stock:
            current_price = stock["price"]
        elif crypto:
            current_price = crypto["price"]
        
        position["current_price"] = current_price
        position["current_value"] = current_price * position["quantity"]
        position["pnl"] = (current_price - position["avg_price"]) * position["quantity"]
        position["pnl_percent"] = ((current_price / position["avg_price"]) - 1) * 100 if position["avg_price"] > 0 else 0
        
        total_value += position["current_value"]
        total_pnl += position["pnl"]
    
    return {
        "positions": portfolio,
        "total_value": round(total_value, 2),
        "total_pnl": round(total_pnl, 2),
        "total_pnl_percent": round((total_pnl / (total_value - total_pnl)) * 100, 2) if (total_value - total_pnl) > 0 else 0
    }

@api_router.post("/portfolio/add")
async def add_position(position: PortfolioPosition, user: dict = Depends(get_current_user)):
    portfolio = user.get("portfolio", [])
    
    # Check if position exists
    for i, p in enumerate(portfolio):
        if p["symbol"] == position.symbol:
            # Update existing position with average price
            old_qty = p["quantity"]
            old_avg = p["avg_price"]
            new_qty = old_qty + position.quantity
            new_avg = ((old_qty * old_avg) + (position.quantity * position.avg_price)) / new_qty
            portfolio[i]["quantity"] = new_qty
            portfolio[i]["avg_price"] = new_avg
            await db.users.update_one({"id": user["id"]}, {"$set": {"portfolio": portfolio}})
            return {"message": "Position updated", "portfolio": portfolio}
    
    # Add new position
    portfolio.append(position.model_dump())
    await db.users.update_one({"id": user["id"]}, {"$set": {"portfolio": portfolio}})
    return {"message": "Position added", "portfolio": portfolio}

@api_router.delete("/portfolio/{symbol}")
async def remove_position(symbol: str, user: dict = Depends(get_current_user)):
    portfolio = user.get("portfolio", [])
    portfolio = [p for p in portfolio if p["symbol"].upper() != symbol.upper()]
    await db.users.update_one({"id": user["id"]}, {"$set": {"portfolio": portfolio}})
    return {"message": "Position removed", "portfolio": portfolio}

# ==================== WATCHLIST ENDPOINTS (handled by routes/watchlist.py) ====================

# ==================== SUBSCRIPTION ENDPOINTS ====================

@api_router.get("/subscription/plans")
async def get_plans():
    return {"plans": list(SUBSCRIPTION_PLANS.values())}

@api_router.post("/subscription/checkout")
async def create_checkout(data: CheckoutRequest, request: Request, user: dict = Depends(get_current_user)):
    if data.plan_id not in SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan")
    
    plan = SUBSCRIPTION_PLANS[data.plan_id]
    
    try:
        api_key = os.environ.get('STRIPE_API_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="Payment service not configured")
        
        host_url = str(request.base_url).rstrip('/')
        webhook_url = f"{host_url}/api/webhook/stripe"
        
        stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
        
        success_url = f"{data.origin_url}/subscription/success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{data.origin_url}/pricing"
        
        checkout_request = CheckoutSessionRequest(
            amount=plan["price"],
            currency=plan["currency"],
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "user_id": user["id"],
                "plan_id": data.plan_id,
                "user_email": user["email"]
            }
        )
        
        session = await stripe_checkout.create_checkout_session(checkout_request)
        
        # Store payment transaction
        await db.payment_transactions.insert_one({
            "id": str(uuid.uuid4()),
            "session_id": session.session_id,
            "user_id": user["id"],
            "plan_id": data.plan_id,
            "amount": plan["price"],
            "currency": plan["currency"],
            "status": "initiated",
            "payment_status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        return {"checkout_url": session.url, "session_id": session.session_id}
        
    except Exception as e:
        logger.error(f"Checkout error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Payment error: {str(e)}")

@api_router.get("/subscription/status/{session_id}")
async def get_payment_status(session_id: str, user: dict = Depends(get_current_user)):
    try:
        api_key = os.environ.get('STRIPE_API_KEY')
        host_url = "https://ai-quantica.preview.emergentagent.com"
        webhook_url = f"{host_url}/api/webhook/stripe"
        
        stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
        status = await stripe_checkout.get_checkout_status(session_id)
        
        # Update transaction
        transaction = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
        
        if transaction and status.payment_status == "paid" and transaction.get("status") != "completed":
            # Update user subscription
            await db.users.update_one(
                {"id": user["id"]},
                {"$set": {"subscription_plan": transaction["plan_id"]}}
            )
            
            # Update transaction
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {"status": "completed", "payment_status": "paid", "completed_at": datetime.now(timezone.utc).isoformat()}}
            )
        
        return PaymentStatusResponse(
            status=status.status,
            payment_status=status.payment_status,
            plan_id=transaction["plan_id"] if transaction else None
        )
        
    except Exception as e:
        logger.error(f"Payment status error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Payment status error: {str(e)}")

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    try:
        body = await request.body()
        signature = request.headers.get("Stripe-Signature")
        
        api_key = os.environ.get('STRIPE_API_KEY')
        host_url = str(request.base_url).rstrip('/')
        webhook_url = f"{host_url}/api/webhook/stripe"
        
        stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        if webhook_response.payment_status == "paid":
            transaction = await db.payment_transactions.find_one(
                {"session_id": webhook_response.session_id},
                {"_id": 0}
            )
            
            if transaction and transaction.get("status") != "completed":
                await db.users.update_one(
                    {"id": transaction["user_id"]},
                    {"$set": {"subscription_plan": transaction["plan_id"]}}
                )
                
                await db.payment_transactions.update_one(
                    {"session_id": webhook_response.session_id},
                    {"$set": {"status": "completed", "payment_status": "paid"}}
                )
        
        return {"status": "received"}
        
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        return {"status": "error", "message": str(e)}

# ==================== TUTORIAL/LEARNING HUB ENDPOINTS ====================

TUTORIAL_STEPS = [
    {
        "step": 1,
        "title": "Welcome to Aureos AI",
        "description": "Your AI-powered trading intelligence platform. Let's get you started with the essentials.",
        "content": "Aureos AI combines advanced AI analytics with real-time market data to give you an edge in trading. Our platform covers ASX, NASDAQ, Forex, and Crypto markets."
    },
    {
        "step": 2,
        "title": "Market Dashboard",
        "description": "Your command center for market intelligence.",
        "content": "The dashboard shows real-time prices, charts, and market trends. Use the heatmap to quickly identify opportunities across sectors."
    },
    {
        "step": 3,
        "title": "AI Copilot",
        "description": "Your intelligent trading assistant.",
        "content": "Ask the AI Copilot about any asset, market condition, or trading strategy. It provides probability-based suggestions with entry/exit points and risk analysis."
    },
    {
        "step": 4,
        "title": "Portfolio & Watchlist",
        "description": "Track your investments and interests.",
        "content": "Add positions to track your portfolio performance. Use the watchlist to monitor assets you're interested in without committing."
    },
    {
        "step": 5,
        "title": "Start Trading Smarter",
        "description": "You're ready to begin your journey.",
        "content": "Remember: Aureos AI is for educational purposes. Always do your own research and consider your risk tolerance before trading."
    }
]

@api_router.get("/tutorial/steps")
async def get_tutorial_steps():
    return {"steps": TUTORIAL_STEPS, "total": len(TUTORIAL_STEPS)}

@api_router.get("/tutorial/progress")
async def get_tutorial_progress(user: dict = Depends(get_current_user)):
    progress = user.get("tutorial_progress", {"step": 0, "completed": False})
    return progress

@api_router.post("/tutorial/progress")
async def update_tutorial_progress(progress: TutorialProgress, user: dict = Depends(get_current_user)):
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"tutorial_progress": progress.model_dump()}}
    )
    return {"message": "Progress updated", "progress": progress}

# ==================== ANALYTICS ENDPOINTS ====================

@api_router.get("/analytics/risk-score")
async def get_risk_score(user: dict = Depends(get_current_user)):
    portfolio = user.get("portfolio", [])
    
    if not portfolio:
        return {"risk_score": 50, "risk_level": "moderate", "breakdown": {}}
    
    # Calculate risk based on asset diversity and volatility
    crypto_weight = sum(p["quantity"] * (MOCK_CRYPTO.get(p["symbol"].lower(), {}).get("price", 0)) for p in portfolio if p["asset_type"] == "crypto")
    stock_weight = sum(p["quantity"] * (MOCK_STOCKS.get(p["symbol"], {}).get("price", 0)) for p in portfolio if p["asset_type"] == "stock")
    total = crypto_weight + stock_weight
    
    if total == 0:
        return {"risk_score": 50, "risk_level": "moderate", "breakdown": {}}
    
    crypto_ratio = crypto_weight / total
    risk_score = int(50 + (crypto_ratio * 40))  # Crypto adds risk
    
    risk_level = "low" if risk_score < 40 else "moderate" if risk_score < 70 else "high"
    
    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "breakdown": {
            "crypto_weight": round(crypto_ratio * 100, 1),
            "stock_weight": round((1 - crypto_ratio) * 100, 1),
            "diversification": "good" if len(portfolio) >= 5 else "poor"
        }
    }

@api_router.get("/analytics/performance")
async def get_performance(user: dict = Depends(get_current_user)):
    # Generate mock performance data
    import random
    
    days = 30
    performance = []
    value = 10000
    
    for i in range(days):
        change = random.uniform(-0.03, 0.035)
        value *= (1 + change)
        performance.append({
            "date": (datetime.now(timezone.utc) - timedelta(days=days - i)).strftime("%Y-%m-%d"),
            "value": round(value, 2),
            "change_percent": round(change * 100, 2)
        })
    
    return {
        "performance": performance,
        "total_return": round(((value / 10000) - 1) * 100, 2),
        "best_day": max(p["change_percent"] for p in performance),
        "worst_day": min(p["change_percent"] for p in performance)
    }

# ==================== CONTACT ENDPOINTS ====================

class ContactForm(BaseModel):
    name: str
    email: EmailStr
    subject: str
    message: str

@api_router.post("/contact")
async def submit_contact(data: ContactForm):
    contact_doc = {
        "id": str(uuid.uuid4()),
        **data.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "new"
    }
    await db.contacts.insert_one(contact_doc)
    return {"message": "Thank you for contacting us. We'll get back to you soon."}

# ==================== VOICE INTERACTION ENDPOINTS ====================

class TTSRequest(BaseModel):
    text: str
    voice: str = "onyx"  # Professional voice for trading
    speed: float = 1.0

class VoiceSettings(BaseModel):
    tts_enabled: bool = True
    stt_enabled: bool = True
    voice: str = "onyx"
    auto_narrate: bool = False

@api_router.post("/voice/text-to-speech")
async def text_to_speech(data: TTSRequest, user: dict = Depends(get_current_user)):
    """Convert text to speech audio using OpenAI TTS"""
    try:
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="Voice service not configured")
        
        # Limit text length
        text = data.text[:4000]  # TTS has 4096 char limit
        
        tts = OpenAITextToSpeech(api_key=api_key)
        audio_bytes = await tts.generate_speech(
            text=text,
            model="tts-1",
            voice=data.voice,
            speed=data.speed,
            response_format="mp3"
        )
        
        # Return audio as base64 for easy frontend handling
        audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
        
        return {
            "audio_base64": audio_base64,
            "format": "mp3",
            "voice": data.voice,
            "text_length": len(text)
        }
        
    except Exception as e:
        logger.error(f"TTS error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Voice synthesis error: {str(e)}")


class NarrateReportRequest(BaseModel):
    text: str
    language: str = "en"

@api_router.post("/voice/narrate-report")
@limiter.limit("5/minute")
async def narrate_report(request: Request, data: NarrateReportRequest):
    """Generate a natural-sounding AI narration of an executive report, in the chosen language. Returns audio/mpeg blob."""
    try:
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="Voice service not configured")
        
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        lang_map = {"en": "English", "pt": "Portuguese", "es": "Spanish", "fr": "French", "de": "German", "zh": "Chinese", "ja": "Japanese"}
        lang_name = lang_map.get(data.language, "English")
        
        # Step 1: Use AI to create a polished narration script in the target language
        chat = LlmChat(
            api_key=api_key,
            session_id=f"narrate_{datetime.now().strftime('%Y%m%d%H%M')}",
            system_message=f"You are JARVIS, a professional financial AI narrator. Convert the following report data into a smooth, natural-sounding narration script IN {lang_name}. Keep it under 2500 characters. Speak as if you are a senior analyst delivering a voice briefing. Use clear pronunciation-friendly numbers and terms. Do not use markdown or special symbols."
        ).with_model("openai", "gpt-5.2")
        
        narration_script = await chat.send_message(UserMessage(text=data.text[:4000]))
        narration_script = narration_script[:4000]
        
        # Step 2: Convert to speech
        tts = OpenAITextToSpeech(api_key=api_key)
        audio_bytes = await tts.generate_speech(
            text=narration_script,
            model="tts-1",
            voice="onyx",
            speed=1.0,
            response_format="mp3"
        )
        
        from fastapi.responses import Response as RawResponse
        return RawResponse(content=audio_bytes, media_type="audio/mpeg", headers={"Content-Disposition": "inline; filename=jarvis_narration.mp3"})
        
    except Exception as e:
        logger.error(f"Report narration error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Narration error: {str(e)}")


@api_router.get("/voice/daily-briefing-audio")
@limiter.limit("3/minute")
async def daily_briefing_audio(request: Request):
    """Auto-generated daily voice briefing — JARVIS narrates the market overnight summary. Returns audio/mpeg."""
    try:
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="Voice service not configured")

        from emergentintegrations.llm.chat import LlmChat, UserMessage
        from routes.intelligence import get_market_pulse, get_performance_highlights, GEOPOLITICAL_REGIONS, GLOBAL_EVENTS

        pulse = get_market_pulse()
        highlights = get_performance_highlights()[:5]
        high_risk = [r for r in GEOPOLITICAL_REGIONS if r["risk_score"] > 50]
        critical_events = [e for e in GLOBAL_EVENTS if e["severity"] in ("critical", "high")][:4]

        market_ctx = ", ".join([f"{p['symbol']} at {p['value']:.0f} ({'+' if p['change']>0 else ''}{p['change']:.1f}%)" for p in pulse[:6]])
        risk_ctx = ", ".join([f"{r['name']} risk {r['risk_score']}" for r in high_risk[:4]])
        events_ctx = " | ".join([f"{e['title']}" for e in critical_events])
        top_ctx = ", ".join([f"{h['asset']} +{h['performance']:.0f}%" for h in highlights])

        prompt = f"""You are JARVIS, the AI intelligence core of Aureos AI. Record a 60-second morning voice briefing for an investor.

Current markets: {market_ctx}
High-risk regions: {risk_ctx}
Critical events: {events_ctx}
Top performers: {top_ctx}

Rules:
- Speak naturally and confidently, like a senior analyst at Goldman Sachs delivering a morning note
- Start with "Good morning. This is JARVIS, your Aureos AI intelligence briefing for today."
- Cover: overnight market moves, key geopolitical risks, top opportunities, and a one-sentence outlook
- Keep it under 180 words for ~60 seconds of speech
- Use specific numbers and tickers
- End with "Stay sharp. JARVIS out."
- Do NOT use markdown, bullets, or special characters — this is a voice script"""

        chat = LlmChat(
            api_key=api_key,
            session_id=f"daily_voice_{datetime.now().strftime('%Y%m%d%H')}",
            system_message="You are JARVIS, a professional financial AI. Write natural voice scripts only."
        ).with_model("openai", "gpt-5.2")

        script = await chat.send_message(UserMessage(text=prompt))
        script = script[:3000]

        tts = OpenAITextToSpeech(api_key=api_key)
        audio_bytes = await tts.generate_speech(
            text=script,
            model="tts-1",
            voice="onyx",
            speed=1.0,
            response_format="mp3"
        )

        from fastapi.responses import Response as RawResponse
        return RawResponse(
            content=audio_bytes,
            media_type="audio/mpeg",
            headers={"Content-Disposition": "inline; filename=jarvis_daily_briefing.mp3"}
        )

    except Exception as e:
        logger.error(f"Daily voice briefing error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Voice briefing error: {str(e)}")



class NarrateRequest(BaseModel):
    text: str
    language: str = "en"

LANG_VOICE_MAP = {
    'pt': 'nova', 'en': 'onyx', 'es': 'nova', 'fr': 'alloy',
    'de': 'echo', 'zh': 'alloy', 'ja': 'alloy', 'ko': 'alloy', 'ar': 'onyx',
}

LANG_NAMES = {
    'pt': 'Portuguese', 'en': 'English', 'es': 'Spanish', 'fr': 'French',
    'de': 'German', 'zh': 'Chinese', 'ja': 'Japanese', 'ko': 'Korean', 'ar': 'Arabic',
}

@api_router.post("/voice/narrate")
@limiter.limit("10/minute")
async def narrate_text(data: NarrateRequest, request: Request):
    """Universal JARVIS narration — converts any text to speech in any language."""
    try:
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="Voice service not configured")

        text = data.text[:4000]
        lang = data.language
        lang_name = LANG_NAMES.get(lang, 'English')
        voice = LANG_VOICE_MAP.get(lang, 'onyx')

        # If not English, translate the text first using GPT
        if lang != 'en':
            from emergentintegrations.llm.chat import LlmChat, UserMessage
            chat = LlmChat(
                api_key=api_key,
                session_id=f"translate_{uuid.uuid4().hex[:8]}",
                system_message=f"Translate the following text to {lang_name}. Keep numbers, tickers, and technical terms. Only output the translation, nothing else."
            ).with_model("openai", "gpt-5.2")
            text = await chat.send_message(UserMessage(text=text))
            text = text[:4000]

        tts = OpenAITextToSpeech(api_key=api_key)
        audio_bytes = await tts.generate_speech(
            text=text,
            model="tts-1",
            voice=voice,
            speed=1.0,
            response_format="mp3"
        )

        from fastapi.responses import Response as RawResponse
        return RawResponse(
            content=audio_bytes,
            media_type="audio/mpeg",
            headers={"Content-Disposition": "inline; filename=jarvis_narration.mp3"}
        )
    except Exception as e:
        logger.error(f"Narration error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Narration error: {str(e)}")



@api_router.post("/voice/speech-to-text")
async def speech_to_text(
    audio: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """Convert speech audio to text using OpenAI Whisper"""
    try:
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="Voice service not configured")
        
        # Validate file type
        allowed_types = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm', 'audio/m4a', 'audio/mp4']
        if audio.content_type and audio.content_type not in allowed_types:
            # Allow anyway as content_type detection can be unreliable
            pass
        
        # Read audio file
        audio_content = await audio.read()
        
        # Check file size (25MB limit)
        if len(audio_content) > 25 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Audio file too large (max 25MB)")
        
        stt = OpenAISpeechToText(api_key=api_key)
        
        # Create a file-like object
        import io
        audio_file = io.BytesIO(audio_content)
        audio_file.name = audio.filename or "audio.webm"
        
        response = await stt.transcribe(
            file=audio_file,
            model="whisper-1",
            response_format="json",
            language="en",
            prompt="This is a financial trading discussion about stocks, crypto, forex, market analysis, and investment strategies."
        )
        
        return {
            "text": response.text,
            "language": "en",
            "duration_estimate": len(audio_content) / 16000  # Rough estimate
        }
        
    except Exception as e:
        logger.error(f"STT error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Speech recognition error: {str(e)}")

@api_router.post("/voice/copilot-voice")
async def copilot_voice_interaction(
    audio: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """Full voice interaction: STT -> AI Copilot -> TTS"""
    try:
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="Voice service not configured")
        
        # Step 1: Speech to Text
        audio_content = await audio.read()
        stt = OpenAISpeechToText(api_key=api_key)
        
        import io
        audio_file = io.BytesIO(audio_content)
        audio_file.name = audio.filename or "audio.webm"
        
        stt_response = await stt.transcribe(
            file=audio_file,
            model="whisper-1",
            response_format="json",
            language="en",
            prompt="Financial trading discussion about stocks, crypto, forex analysis."
        )
        
        user_message = stt_response.text
        
        # Step 2: AI Copilot Processing
        system_message = """You are Aureos AI Copilot, an advanced trading intelligence assistant. 
        You are responding via voice, so keep responses concise (2-3 sentences max) and conversational.
        Provide probability-based trade suggestions when asked. Be direct and actionable."""
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"voice_{user['id']}_{datetime.now().strftime('%Y%m%d')}",
            system_message=system_message
        ).with_model("openai", "gpt-5.2")
        
        ai_response = await chat.send_message(UserMessage(text=user_message))
        
        # Truncate for voice (keep it concise)
        voice_response = ai_response[:500] if len(ai_response) > 500 else ai_response
        
        # Step 3: Text to Speech
        tts = OpenAITextToSpeech(api_key=api_key)
        audio_bytes = await tts.generate_speech(
            text=voice_response,
            model="tts-1",
            voice="onyx",
            speed=1.0,
            response_format="mp3"
        )
        
        audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
        
        # Store conversation
        conversation_doc = {
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "message": user_message,
            "response": ai_response,
            "voice_interaction": True,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        await db.copilot_conversations.insert_one(conversation_doc)
        
        return {
            "user_text": user_message,
            "ai_response": ai_response,
            "audio_base64": audio_base64,
            "format": "mp3"
        }
        
    except Exception as e:
        logger.error(f"Voice copilot error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Voice interaction error: {str(e)}")

@api_router.get("/voice/settings")
async def get_voice_settings(user: dict = Depends(get_current_user)):
    """Get user voice settings"""
    settings = user.get("voice_settings", {
        "tts_enabled": True,
        "stt_enabled": True,
        "voice": "onyx",
        "auto_narrate": False
    })
    return settings

@api_router.post("/voice/settings")
async def update_voice_settings(settings: VoiceSettings, user: dict = Depends(get_current_user)):
    """Update user voice settings"""
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"voice_settings": settings.model_dump()}}
    )
    return {"message": "Voice settings updated", "settings": settings}

# ==================== ROOT ENDPOINT ====================

@api_router.get("/")
async def root():
    return {"message": "Aureos AI API", "version": "2.0.0", "status": "operational"}

# Include the router in the main app
app.include_router(api_router)

# Include modular analysis and asset routers
from routes.analysis import router as analysis_router
from routes.assets import router as assets_router
from routes.jarvis import router as jarvis_router
from routes.watchlist import router as watchlist_router
from routes.quant_lab import router as quant_lab_router
from routes.scanner import router as scanner_router
from routes.intelligence_map import router as intel_map_router
from routes.intelligence import router as intelligence_router
from routes.quantica import router as quantica_router
from routes.autonomous import router as autonomous_router
from routes.pdf_export import router as pdf_export_router
from routes.multi_agent import router as multi_agent_router
from routes.news_sentiment import router as news_router
from routes.paper_trading import router as paper_router
from routes.aureos_score import router as score_router
from routes.ultra_features import router as ultra_router
from routes.aureos_tokens import router as tokens_router
from routes.godmode import router as godmode_router
from routes.unfair_advantage import router as advantage_router
from routes.dominance import router as dominance_router
from routes.distribution import router as distribution_router
from routes.ecosystem import router as ecosystem_router
from routes.trust import router as trust_router
from routes.decision import router as decision_router
app.include_router(analysis_router)
app.include_router(assets_router)
app.include_router(jarvis_router)
app.include_router(watchlist_router)
app.include_router(quant_lab_router)
app.include_router(scanner_router)
app.include_router(intel_map_router)
app.include_router(intelligence_router)
app.include_router(quantica_router)
app.include_router(pdf_export_router)
app.include_router(multi_agent_router)
app.include_router(news_router)
app.include_router(paper_router)
app.include_router(score_router)
app.include_router(ultra_router)
app.include_router(tokens_router)
app.include_router(godmode_router)
app.include_router(advantage_router)
app.include_router(dominance_router)
app.include_router(distribution_router)
app.include_router(ecosystem_router)
app.include_router(trust_router)
app.include_router(decision_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


# ==================== WEBSOCKET REAL-TIME ====================

class ConnectionManager:
    """Manages WebSocket connections for real-time updates."""
    def __init__(self):
        self.active: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, channel: str = "general"):
        await websocket.accept()
        if channel not in self.active:
            self.active[channel] = []
        self.active[channel].append(websocket)

    def disconnect(self, websocket: WebSocket, channel: str = "general"):
        if channel in self.active:
            self.active[channel] = [ws for ws in self.active[channel] if ws != websocket]

    async def broadcast(self, channel: str, data: dict):
        if channel in self.active:
            disconnected = []
            for ws in self.active[channel]:
                try:
                    await ws.send_json(data)
                except Exception:
                    disconnected.append(ws)
            for ws in disconnected:
                self.active[channel] = [w for w in self.active[channel] if w != ws]

    @property
    def connection_count(self):
        return sum(len(v) for v in self.active.values())


ws_manager = ConnectionManager()


@app.websocket("/ws/{channel}")
async def websocket_endpoint(websocket: WebSocket, channel: str):
    await ws_manager.connect(websocket, channel)
    try:
        while True:
            data = await websocket.receive_json()
            action = data.get("action")

            if action == "ping":
                await websocket.send_json({"type": "pong", "timestamp": datetime.now(timezone.utc).isoformat()})

            elif action == "subscribe":
                sub_channel = data.get("channel", channel)
                await ws_manager.connect(websocket, sub_channel)
                await websocket.send_json({"type": "subscribed", "channel": sub_channel})

    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, channel)
    except Exception:
        ws_manager.disconnect(websocket, channel)


@app.get("/api/ws/status")
async def ws_status():
    return {"active_connections": ws_manager.connection_count, "channels": list(ws_manager.active.keys())}
