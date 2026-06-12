from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import logging
import asyncio
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional

import aiohttp
import bcrypt
import jwt
from cryptography.fernet import Fernet
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field

# ---------- Config ----------
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
JWT_SECRET = os.environ['JWT_SECRET']
FERNET_KEY = os.environ['FERNET_KEY']
ADMIN_USERNAME = os.environ['ADMIN_USERNAME']
ADMIN_PASSWORD = os.environ['ADMIN_PASSWORD']
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24 * 7  # 7 days for a personal tool
HEALTH_CHECK_INTERVAL = 120  # seconds

fernet = Fernet(FERNET_KEY.encode())

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("vault")

app = FastAPI(title="Project Vault API")
api_router = APIRouter(prefix="/api")
bearer_scheme = HTTPBearer(auto_error=False)


# ---------- Crypto helpers ----------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def encrypt_str(value: Optional[str]) -> Optional[str]:
    if value is None or value == "":
        return None
    return fernet.encrypt(value.encode("utf-8")).decode("utf-8")


def decrypt_str(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    try:
        return fernet.decrypt(value.encode("utf-8")).decode("utf-8")
    except Exception:
        return None


def create_token(username: str) -> str:
    payload = {
        "sub": username,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)) -> str:
    if credentials is None or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        username = payload.get("sub")
        if username != ADMIN_USERNAME:
            raise HTTPException(status_code=401, detail="Invalid user")
        return username
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ---------- Models ----------
class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    token: str
    username: str


class ProjectBase(BaseModel):
    name: str
    site_url: str
    admin_url: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    category: Optional[str] = None
    icon_url: Optional[str] = None
    notes: Optional[str] = None
    color: Optional[str] = "#10B981"


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    site_url: Optional[str] = None
    admin_url: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    category: Optional[str] = None
    icon_url: Optional[str] = None
    notes: Optional[str] = None
    color: Optional[str] = None


class Project(ProjectBase):
    id: str
    status: str = "unknown"  # online | offline | unknown
    last_checked: Optional[str] = None
    response_time_ms: Optional[int] = None
    http_status: Optional[int] = None
    created_at: str
    updated_at: str


# ---------- DB helpers ----------
def doc_to_project(doc: dict) -> Project:
    return Project(
        id=doc["id"],
        name=doc["name"],
        site_url=doc["site_url"],
        admin_url=doc.get("admin_url"),
        username=decrypt_str(doc.get("username_enc")),
        password=decrypt_str(doc.get("password_enc")),
        category=doc.get("category"),
        icon_url=doc.get("icon_url"),
        notes=doc.get("notes"),
        color=doc.get("color") or "#10B981",
        status=doc.get("status", "unknown"),
        last_checked=doc.get("last_checked"),
        response_time_ms=doc.get("response_time_ms"),
        http_status=doc.get("http_status"),
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    )


# ---------- Auth routes ----------
@api_router.post("/auth/login", response_model=LoginResponse)
async def login(body: LoginRequest):
    user = await db.users.find_one({"username": body.username})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Usuário ou senha inválidos")
    token = create_token(user["username"])
    return LoginResponse(token=token, username=user["username"])


@api_router.get("/auth/me")
async def me(current_user: str = Depends(get_current_user)):
    return {"username": current_user}


# ---------- Project routes ----------
@api_router.get("/projects", response_model=List[Project])
async def list_projects(current_user: str = Depends(get_current_user)):
    docs = await db.projects.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [doc_to_project(d) for d in docs]


@api_router.post("/projects", response_model=Project)
async def create_project(body: ProjectCreate, current_user: str = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": str(uuid.uuid4()),
        "name": body.name,
        "site_url": body.site_url,
        "admin_url": body.admin_url,
        "username_enc": encrypt_str(body.username),
        "password_enc": encrypt_str(body.password),
        "category": body.category,
        "icon_url": body.icon_url,
        "notes": body.notes,
        "color": body.color or "#10B981",
        "status": "unknown",
        "last_checked": None,
        "response_time_ms": None,
        "http_status": None,
        "created_at": now,
        "updated_at": now,
    }
    await db.projects.insert_one(doc)
    # kick off an immediate check (non-blocking)
    asyncio.create_task(check_project_status(doc["id"]))
    return doc_to_project(doc)


@api_router.put("/projects/{project_id}", response_model=Project)
async def update_project(project_id: str, body: ProjectUpdate, current_user: str = Depends(get_current_user)):
    existing = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    updates = {}
    for field in ["name", "site_url", "admin_url", "category", "icon_url", "notes", "color"]:
        val = getattr(body, field)
        if val is not None:
            updates[field] = val
    if body.username is not None:
        updates["username_enc"] = encrypt_str(body.username)
    if body.password is not None:
        updates["password_enc"] = encrypt_str(body.password)
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.projects.update_one({"id": project_id}, {"$set": updates})
    doc = await db.projects.find_one({"id": project_id}, {"_id": 0})
    return doc_to_project(doc)


@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str, current_user: str = Depends(get_current_user)):
    res = await db.projects.delete_one({"id": project_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    return {"ok": True}


@api_router.post("/projects/{project_id}/check", response_model=Project)
async def manual_check(project_id: str, current_user: str = Depends(get_current_user)):
    await check_project_status(project_id)
    doc = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    return doc_to_project(doc)


@api_router.post("/projects/check-all")
async def check_all(current_user: str = Depends(get_current_user)):
    await run_health_check_cycle()
    return {"ok": True}


# ---------- Health check engine ----------
async def check_project_status(project_id: str):
    doc = await db.projects.find_one({"id": project_id}, {"_id": 0, "id": 1, "site_url": 1})
    if not doc:
        return
    status, response_time_ms, http_status = await ping_url(doc["site_url"])
    await db.projects.update_one(
        {"id": project_id},
        {"$set": {
            "status": status,
            "last_checked": datetime.now(timezone.utc).isoformat(),
            "response_time_ms": response_time_ms,
            "http_status": http_status,
        }},
    )


async def ping_url(url: str) -> tuple[str, Optional[int], Optional[int]]:
    if not url:
        return "unknown", None, None
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    timeout = aiohttp.ClientTimeout(total=10)
    start = datetime.now(timezone.utc)
    try:
        async with aiohttp.ClientSession(timeout=timeout, trust_env=False) as session:
            async with session.get(url, allow_redirects=True, ssl=False) as resp:
                elapsed = int((datetime.now(timezone.utc) - start).total_seconds() * 1000)
                status_label = "online" if 200 <= resp.status < 500 else "offline"
                return status_label, elapsed, resp.status
    except Exception as e:
        logger.info(f"health check failed for {url}: {e}")
        return "offline", None, None


async def run_health_check_cycle():
    docs = await db.projects.find({}, {"_id": 0, "id": 1, "site_url": 1}).to_list(1000)
    await asyncio.gather(*[check_project_status(d["id"]) for d in docs], return_exceptions=True)


async def health_check_loop():
    while True:
        try:
            await run_health_check_cycle()
        except Exception as e:
            logger.exception(f"health loop error: {e}")
        await asyncio.sleep(HEALTH_CHECK_INTERVAL)


# ---------- Startup ----------
@app.on_event("startup")
async def startup():
    # seed admin user idempotently
    existing = await db.users.find_one({"username": ADMIN_USERNAME})
    if existing is None:
        await db.users.insert_one({
            "username": ADMIN_USERNAME,
            "password_hash": hash_password(ADMIN_PASSWORD),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f"admin user '{ADMIN_USERNAME}' seeded")
    elif not verify_password(ADMIN_PASSWORD, existing["password_hash"]):
        await db.users.update_one(
            {"username": ADMIN_USERNAME},
            {"$set": {"password_hash": hash_password(ADMIN_PASSWORD)}},
        )
        logger.info(f"admin user '{ADMIN_USERNAME}' password updated from .env")

    await db.users.create_index("username", unique=True)
    await db.projects.create_index("created_at")

    # spawn the periodic health check
    asyncio.create_task(health_check_loop())
    logger.info("health check loop started")


@app.on_event("shutdown")
async def shutdown():
    client.close()


@api_router.get("/")
async def root():
    return {"message": "Project Vault API", "ok": True}


app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=False,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
