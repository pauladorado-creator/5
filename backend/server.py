from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any

from data.recipes_seed import RECIPES, CCAA_LIST, SEED_VERSION

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
REGISTER_CODE = "0000"

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ---------- Models ----------
class RegisterRequest(BaseModel):
    code: str
    email: EmailStr
    username: str

class LoginRequest(BaseModel):
    email: EmailStr

class User(BaseModel):
    id: str
    email: str
    username: str
    magnets: List[str] = []
    created_at: str

class ChatRequest(BaseModel):
    session_id: str
    message: str

class CartItem(BaseModel):
    name: str
    quantity: int = 1
    recipe_name: Optional[str] = None
    kind: str = "recipe"  # or "personal"

class CartUpdate(BaseModel):
    user_id: str
    items: List[CartItem]

class MagnetGain(BaseModel):
    user_id: str
    ccaa: str
    photo_base64: Optional[str] = None

class CookRequest(BaseModel):
    user_id: str
    photo_base64: str

class SaveRequest(BaseModel):
    user_id: str
    recipe_id: str

# ---------- Startup ----------
@app.on_event("startup")
async def seed_recipes():
    meta = await db.app_meta.find_one({"key": "seed_version"})
    current_version = meta["value"] if meta else 0
    count = await db.recipes.count_documents({})
    if count == 0 or current_version != SEED_VERSION:
        await db.recipes.delete_many({})
        for r in RECIPES:
            r["id"] = str(uuid.uuid4())
        await db.recipes.insert_many([dict(r) for r in RECIPES])
        await db.app_meta.update_one(
            {"key": "seed_version"},
            {"$set": {"value": SEED_VERSION}},
            upsert=True,
        )
        # Reset cooked records & user magnets because recipe ids changed.
        await db.cooked_recipes.delete_many({})
        await db.users.update_many({}, {"$set": {"magnets": []}})
        logging.info(f"Reseeded {len(RECIPES)} recipes (version {SEED_VERSION})")

# ---------- Routes ----------
@api_router.get("/")
async def root():
    return {"message": "FRIGO API", "recipes": await db.recipes.count_documents({})}

@api_router.post("/auth/register")
async def register(req: RegisterRequest):
    if req.code != REGISTER_CODE:
        raise HTTPException(status_code=400, detail="Código incorrecto")
    existing = await db.users.find_one({"email": req.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email ya registrado")
    user = {
        "id": str(uuid.uuid4()),
        "email": req.email,
        "username": req.username,
        "magnets": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(dict(user))
    return user

@api_router.post("/auth/login")
async def login(req: LoginRequest):
    user = await db.users.find_one({"email": req.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado. Regístrate primero.")
    return user

@api_router.get("/user/{user_id}")
async def get_user(user_id: str):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="No encontrado")
    return user

@api_router.get("/recipes")
async def list_recipes(
    ccaa: Optional[str] = None,
    season: Optional[str] = None,
    exclude_gluten: bool = False,
    exclude_lactose: bool = False,
    exclude_nuts: bool = False,
    vegan: bool = False,
    ingredients: Optional[str] = None,
):
    q: Dict[str, Any] = {}
    if ccaa:
        q["ccaa"] = ccaa
    if season:
        q["$or"] = [{"temporada": season}, {"temporada": "Todo el año"}]
    if exclude_gluten:
        q["alergenos.gluten"] = False
    if exclude_lactose:
        q["alergenos.lactosa"] = False
    if exclude_nuts:
        q["alergenos.frutos_secos"] = False
    if vegan:
        q["alergenos.apto_vegano"] = True
    recipes = await db.recipes.find(q, {"_id": 0}).to_list(500)
    if ingredients:
        terms = [t.strip().lower() for t in ingredients.split(",") if t.strip()]
        if terms:
            def matches(r):
                blob = " ".join(r.get("ingredientes", [])).lower()
                return all(t in blob for t in terms)
            recipes = [r for r in recipes if matches(r)]
    return recipes

@api_router.get("/recipes/{recipe_id}")
async def get_recipe(recipe_id: str):
    r = await db.recipes.find_one({"id": recipe_id}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Receta no encontrada")
    return r

@api_router.get("/ccaa")
async def get_ccaa():
    return {"ccaa": CCAA_LIST}

@api_router.post("/magnets/earn")
async def earn_magnet(req: MagnetGain):
    user = await db.users.find_one({"id": req.user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    magnets = user.get("magnets", [])
    if req.ccaa not in magnets:
        magnets.append(req.ccaa)
        await db.users.update_one({"id": req.user_id}, {"$set": {"magnets": magnets}})
    if req.photo_base64:
        await db.photos.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": req.user_id,
            "ccaa": req.ccaa,
            "photo": req.photo_base64,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    return {"magnets": magnets}

@api_router.post("/recipes/{recipe_id}/cook")
async def cook_recipe(recipe_id: str, req: CookRequest):
    recipe = await db.recipes.find_one({"id": recipe_id})
    if not recipe:
        raise HTTPException(status_code=404, detail="Receta no encontrada")
    user = await db.users.find_one({"id": req.user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    ccaa = recipe["ccaa"]
    now = datetime.now(timezone.utc).isoformat()
    await db.cooked_recipes.update_one(
        {"user_id": req.user_id, "recipe_id": recipe_id},
        {"$set": {
            "user_id": req.user_id,
            "recipe_id": recipe_id,
            "ccaa": ccaa,
            "photo": req.photo_base64,
            "created_at": now,
        }},
        upsert=True,
    )
    total_ccaa = await db.recipes.count_documents({"ccaa": ccaa})
    cooked_count = await db.cooked_recipes.count_documents({"user_id": req.user_id, "ccaa": ccaa})
    magnets = user.get("magnets", [])
    awarded = False
    if cooked_count >= total_ccaa and ccaa not in magnets:
        magnets.append(ccaa)
        await db.users.update_one({"id": req.user_id}, {"$set": {"magnets": magnets}})
        awarded = True
    return {
        "ok": True,
        "ccaa": ccaa,
        "cooked_in_ccaa": cooked_count,
        "total_in_ccaa": total_ccaa,
        "awarded_magnet": awarded,
        "magnets": magnets,
    }

@api_router.get("/user/{user_id}/cooked")
async def get_user_cooked(user_id: str):
    items = await db.cooked_recipes.find(
        {"user_id": user_id}, {"_id": 0, "photo": 0}
    ).to_list(1000)
    recipe_ids = [i["recipe_id"] for i in items]
    return {"recipe_ids": recipe_ids, "items": items}

@api_router.get("/user/{user_id}/cooked/{recipe_id}")
async def get_user_cooked_photo(user_id: str, recipe_id: str):
    item = await db.cooked_recipes.find_one(
        {"user_id": user_id, "recipe_id": recipe_id}, {"_id": 0}
    )
    if not item:
        raise HTTPException(status_code=404, detail="Sin foto")
    return item

@api_router.post("/recipes/{recipe_id}/save")
async def save_recipe(recipe_id: str, req: SaveRequest):
    if req.recipe_id != recipe_id:
        raise HTTPException(status_code=400, detail="recipe_id no coincide")
    recipe = await db.recipes.find_one({"id": recipe_id})
    if not recipe:
        raise HTTPException(status_code=404, detail="Receta no encontrada")
    user = await db.users.find_one({"id": req.user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    await db.saved_recipes.update_one(
        {"user_id": req.user_id, "recipe_id": recipe_id},
        {"$set": {
            "user_id": req.user_id,
            "recipe_id": recipe_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    return {"ok": True, "saved": True, "recipe_id": recipe_id}

@api_router.delete("/recipes/{recipe_id}/save")
async def unsave_recipe(recipe_id: str, user_id: str):
    res = await db.saved_recipes.delete_one({"user_id": user_id, "recipe_id": recipe_id})
    return {"ok": True, "saved": False, "deleted": res.deleted_count}

@api_router.get("/user/{user_id}/saved")
async def get_user_saved(user_id: str):
    items = await db.saved_recipes.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(500)
    recipe_ids = [i["recipe_id"] for i in items]
    # Hydrate recipes
    if recipe_ids:
        recipes = await db.recipes.find({"id": {"$in": recipe_ids}}, {"_id": 0}).to_list(500)
        by_id = {r["id"]: r for r in recipes}
        ordered = [by_id[rid] for rid in recipe_ids if rid in by_id]
    else:
        ordered = []
    return {"recipe_ids": recipe_ids, "recipes": ordered}

@api_router.get("/cart/{user_id}")
async def get_cart(user_id: str):
    cart = await db.carts.find_one({"user_id": user_id}, {"_id": 0})
    return cart or {"user_id": user_id, "items": []}

@api_router.post("/cart")
async def update_cart(req: CartUpdate):
    items = [i.dict() for i in req.items]
    await db.carts.update_one(
        {"user_id": req.user_id},
        {"$set": {"user_id": req.user_id, "items": items}},
        upsert=True,
    )
    return {"user_id": req.user_id, "items": items}

@api_router.post("/chat/message")
async def chat_message(req: ChatRequest):
    import anthropic
    api_key = os.environ.get('ANTHROPIC_API_KEY', '')
    if not api_key:
        raise HTTPException(status_code=500, detail="API key no configurada")
    client_ai = anthropic.Anthropic(api_key=api_key)
    system = (
        "Eres el asistente culinario de FRIGO, una app española de recetas regionales. "
        "Responde siempre en español, con tono cercano y minimalista. "
        "Sugiere recetas de la cocina española por comunidad autónoma, temporada, o ingredientes. "
        "Sé conciso (máx 4 frases)."
    )
    try:
        message = client_ai.messages.create(
            model="claude-sonnet-4-5-20250514",
            max_tokens=1024,
            system=system,
            messages=[{"role": "user", "content": req.message}]
        )
        response = message.content[0].text
    except Exception as e:
        logging.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    await db.chat_messages.insert_many([
        {"session_id": req.session_id, "role": "user", "text": req.message, "ts": datetime.now(timezone.utc).isoformat()},
        {"session_id": req.session_id, "role": "assistant", "text": response, "ts": datetime.now(timezone.utc).isoformat()},
    ])
    return {"response": response, "session_id": req.session_id}

@api_router.get("/chat/{session_id}")
async def chat_history(session_id: str):
    msgs = await db.chat_messages.find({"session_id": session_id}, {"_id": 0}).sort("ts", 1).to_list(200)
    return {"messages": msgs}

app.include_router(api_router)
# Serve recipe images (and any other static asset) via /api/static/* so it goes through ingress to port 8001.
app.mount("/api/static", StaticFiles(directory=str(ROOT_DIR / "static")), name="static")
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
