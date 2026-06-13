"""Admin panel routes + tracking + JWT auth."""
import os
import jwt
import bcrypt
import logging
import asyncio
import ipaddress
import httpx
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends, Request, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from collections import Counter

logger = logging.getLogger(__name__)
admin_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

JWT_SECRET = os.environ.get('JWT_SECRET', 'change-me')
JWT_ALGO = 'HS256'
JWT_EXP_HOURS = 8
ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', 'donas')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'Seinao10@@')

# DB reference (set by main app)
_db = None
def set_db(db):
    global _db
    _db = db


# ------------ Auth ------------
def make_token(username: str) -> str:
    payload = {
        'sub': username,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXP_HOURS),
        'iat': datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)

async def require_admin(creds: HTTPAuthorizationCredentials = Depends(security)):
    if not creds:
        raise HTTPException(401, "Missing token")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGO])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except Exception:
        raise HTTPException(401, "Invalid token")


# ------------ Models ------------
class LoginIn(BaseModel):
    username: str
    password: str

class TrackIn(BaseModel):
    page: str = ""
    user_agent: str = ""
    extra: Dict[str, Any] = {}


# ------------ Helpers ------------
def now_iso():
    return datetime.now(timezone.utc).isoformat()

def iso_utc(dt):
    """Serialize datetime as ISO with Z suffix (UTC) so JS parses it correctly."""
    if not isinstance(dt, datetime):
        return dt
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%f') + 'Z'

def _is_private_ip(ip: str) -> bool:
    try:
        return ipaddress.ip_address(ip).is_private or ipaddress.ip_address(ip).is_loopback
    except Exception:
        return True

def get_real_ip(request: Request) -> str:
    """Extract the real client IP from proxy headers (X-Forwarded-For / X-Real-IP)."""
    xff = request.headers.get('x-forwarded-for', '')
    if xff:
        # XFF is a comma-separated list. The first non-private IP is the real client.
        for candidate in [p.strip() for p in xff.split(',')]:
            if candidate and not _is_private_ip(candidate):
                return candidate
        # fallback to first
        first = xff.split(',')[0].strip()
        if first:
            return first
    xri = request.headers.get('x-real-ip', '')
    if xri and not _is_private_ip(xri):
        return xri
    return request.client.host if request.client else ''

async def geolocate_ip(ip: str) -> Dict[str, str]:
    """Lookup geolocation via ip-api.com (free, no key required)."""
    if not ip or _is_private_ip(ip):
        return {'city': '', 'uf': '', 'country': '', 'lat': None, 'lon': None}
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            r = await client.get(
                f'http://ip-api.com/json/{ip}',
                params={'fields': 'status,country,countryCode,regionName,region,city,lat,lon,query'},
            )
            if r.status_code == 200:
                d = r.json()
                if d.get('status') == 'success':
                    return {
                        'city': d.get('city', '') or '',
                        'uf': d.get('region', '') or '',
                        'region_name': d.get('regionName', '') or '',
                        'country': d.get('country', '') or '',
                        'country_code': d.get('countryCode', '') or '',
                        'lat': d.get('lat'),
                        'lon': d.get('lon'),
                    }
    except Exception as e:
        logger.warning(f"geolocate_ip failed for {ip}: {e}")
    return {'city': '', 'uf': '', 'country': '', 'lat': None, 'lon': None}

async def insert_event(kind: str, description: str, meta: Dict[str, Any] = None):
    doc = {
        'kind': kind,
        'description': description,
        'meta': meta or {},
        'created_at': datetime.now(timezone.utc),
    }
    await _db.events.insert_one(doc)


# ------------ Seed admin ------------
async def seed_admin():
    existing = await _db.admins.find_one({'username': ADMIN_USERNAME})
    if not existing:
        pwd_hash = bcrypt.hashpw(ADMIN_PASSWORD.encode(), bcrypt.gensalt()).decode()
        await _db.admins.insert_one({
            'username': ADMIN_USERNAME,
            'password_hash': pwd_hash,
            'role': 'root',
            'created_at': datetime.now(timezone.utc),
        })
        logger.info(f"Seeded admin user: {ADMIN_USERNAME}")
    else:
        # backfill role for legacy seed entries
        if not existing.get('role'):
            await _db.admins.update_one({'username': ADMIN_USERNAME}, {'$set': {'role': 'root'}})


# ------------ TRACKING (públicos) ------------
@admin_router.post('/track/access')
async def track_access(data: TrackIn, request: Request):
    # Ignore admin panel paths defensively
    page = data.page or '/'
    if page.startswith('/donaspainel'):
        return {'ok': True, 'skipped': 'admin'}

    ip = get_real_ip(request)
    ua = (data.user_agent or request.headers.get('user-agent', '')).lower()
    is_mobile = any(k in ua for k in ['mobi', 'android', 'iphone', 'ipad', 'ipod'])

    # Geolocate IP (non-fatal if fails)
    geo = await geolocate_ip(ip)

    doc = {
        'page': page,
        'user_agent': data.user_agent or request.headers.get('user-agent', ''),
        'ip': ip,
        'city': geo.get('city', '') or data.extra.get('city', ''),
        'uf': geo.get('uf', '') or data.extra.get('uf', ''),
        'region_name': geo.get('region_name', ''),
        'country': geo.get('country', ''),
        'country_code': geo.get('country_code', ''),
        'lat': geo.get('lat'),
        'lon': geo.get('lon'),
        'device': 'mobile' if is_mobile else 'desktop',
        'created_at': datetime.now(timezone.utc),
    }
    await _db.accesses.insert_one(doc)
    loc = f"{doc['city']}/{doc['uf']}" if doc['city'] else (doc['country'] or '')
    desc = f"Novo acesso {'mobile' if is_mobile else 'desktop'}" + (f" - {loc}" if loc else '')
    await insert_event('access', desc, {'page': doc['page'], 'city': doc['city'], 'uf': doc['uf'], 'device': doc['device'], 'location': loc, 'ip': ip})
    return {'ok': True}

@admin_router.post('/track/registration')
async def track_registration(data: TrackIn):
    await _db.registrations.insert_one({
        'nome': data.extra.get('nome', ''),
        'cpf': data.extra.get('cpf', ''),
        'concurso': data.extra.get('concurso', ''),
        'created_at': datetime.now(timezone.utc),
    })
    nome = data.extra.get('nome', 'Candidato')
    await insert_event('registration', f"Nova inscrição: {nome}", data.extra)
    return {'ok': True}

async def _upsert_pix_status(extra: Dict[str, Any], pix_status: str):
    """Upsert pix_* collection by CPF and update inscription status."""
    cpf = (extra or {}).get('cpf', '')
    if cpf:
        await _db.inscricoes.update_one(
            {'cpf': cpf},
            {'$set': {'pix_status': pix_status, 'pix_status_at': datetime.now(timezone.utc)}}
        )

@admin_router.post('/track/pix-generated')
async def track_pix_gen(data: TrackIn, request: Request):
    cpf = data.extra.get('cpf', '')
    # Se temos CPF, busca a inscrição REAL e usa o valor verdadeiro (evita R$75 hardcoded)
    real_valor = None
    real_nome = ''
    real_concurso = ''
    if cpf:
        insc = await _db.inscricoes.find_one({'cpf': cpf}, {'valor': 1, 'nome': 1, 'concurso': 1})
        if insc:
            real_valor = insc.get('valor')
            real_nome = insc.get('nome', '')
            real_concurso = insc.get('concurso', '')
    valor_final = float(real_valor) if real_valor not in (None, 0) else float(data.extra.get('valor', 75.0) or 75.0)
    nome_final = real_nome or data.extra.get('nome', '')
    concurso_final = real_concurso or data.extra.get('concurso', '')
    payload = {
        '$set': {
            'nome': nome_final,
            'cpf': cpf,
            'concurso': concurso_final,
            'valor': valor_final,
            'extra': data.extra,
            'last_at': datetime.now(timezone.utc),
        },
        '$setOnInsert': {'created_at': datetime.now(timezone.utc)},
    }
    if cpf:
        await _db.pix_generated.update_one({'cpf': cpf}, payload, upsert=True)
    else:
        await _db.pix_generated.insert_one({**payload['$set'], **payload['$setOnInsert']})
    await _upsert_pix_status(data.extra, 'PIX gerado')
    await insert_event('pix_generated', f"PIX gerado por {nome_final or 'Candidato'}", {**data.extra, 'valor': valor_final, 'nome': nome_final})
    if cpf:
        await notify_or_update_telegram(cpf, request)
    return {'ok': True}

@admin_router.post('/track/pix-copied')
async def track_pix_copied(data: TrackIn, request: Request):
    cpf = data.extra.get('cpf', '')
    real_valor = None
    real_nome = ''
    real_concurso = ''
    if cpf:
        insc = await _db.inscricoes.find_one({'cpf': cpf}, {'valor': 1, 'nome': 1, 'concurso': 1})
        if insc:
            real_valor = insc.get('valor')
            real_nome = insc.get('nome', '')
            real_concurso = insc.get('concurso', '')
    valor_final = float(real_valor) if real_valor not in (None, 0) else float(data.extra.get('valor', 75.0) or 75.0)
    nome_final = real_nome or data.extra.get('nome', '')
    concurso_final = real_concurso or data.extra.get('concurso', '')
    payload = {
        '$set': {
            'nome': nome_final,
            'cpf': cpf,
            'concurso': concurso_final,
            'valor': valor_final,
            'extra': data.extra,
            'last_at': datetime.now(timezone.utc),
        },
        '$setOnInsert': {'created_at': datetime.now(timezone.utc)},
    }
    if cpf:
        await _db.pix_copied.update_one({'cpf': cpf}, payload, upsert=True)
    else:
        await _db.pix_copied.insert_one({**payload['$set'], **payload['$setOnInsert']})
    await _upsert_pix_status(data.extra, 'PIX copiado')
    await insert_event('pix_copied', f"PIX copiado por {nome_final or 'Candidato'}", {**data.extra, 'valor': valor_final, 'nome': nome_final})
    if cpf:
        await notify_or_update_telegram(cpf, request)
    return {'ok': True}

@admin_router.post('/track/pix-downloaded')
async def track_pix_dl(data: TrackIn, request: Request):
    cpf = data.extra.get('cpf', '')
    real_valor = None
    real_nome = ''
    real_concurso = ''
    if cpf:
        insc = await _db.inscricoes.find_one({'cpf': cpf}, {'valor': 1, 'nome': 1, 'concurso': 1})
        if insc:
            real_valor = insc.get('valor')
            real_nome = insc.get('nome', '')
            real_concurso = insc.get('concurso', '')
    valor_final = float(real_valor) if real_valor not in (None, 0) else float(data.extra.get('valor', 75.0) or 75.0)
    nome_final = real_nome or data.extra.get('nome', '')
    concurso_final = real_concurso or data.extra.get('concurso', '')
    payload = {
        '$set': {
            'nome': nome_final,
            'cpf': cpf,
            'concurso': concurso_final,
            'valor': valor_final,
            'extra': data.extra,
            'last_at': datetime.now(timezone.utc),
        },
        '$setOnInsert': {'created_at': datetime.now(timezone.utc)},
    }
    if cpf:
        await _db.pix_downloaded.update_one({'cpf': cpf}, payload, upsert=True)
    else:
        await _db.pix_downloaded.insert_one({**payload['$set'], **payload['$setOnInsert']})
    await _upsert_pix_status(data.extra, 'PIX baixado')
    await insert_event('pix_downloaded', f"Comprovante baixado por {nome_final or 'Candidato'}", {**data.extra, 'valor': valor_final, 'nome': nome_final})
    if cpf:
        await notify_or_update_telegram(cpf, request)
    return {'ok': True}


# ------------ AUTH ------------
@admin_router.post('/admin/auth/login')
async def admin_login(data: LoginIn):
    admin = await _db.admins.find_one({'username': data.username})
    if not admin:
        raise HTTPException(401, "Credenciais inválidas")
    if not bcrypt.checkpw(data.password.encode(), admin['password_hash'].encode()):
        raise HTTPException(401, "Credenciais inválidas")
    token = make_token(data.username)
    return {'token': token, 'user': {'username': data.username}}

@admin_router.get('/admin/auth/me')
async def admin_me(user=Depends(require_admin)):
    me = await _db.admins.find_one({'username': user['sub']}, {'_id': 0, 'password_hash': 0})
    if not me:
        return {'username': user['sub'], 'role': 'admin'}
    if isinstance(me.get('created_at'), datetime):
        me['created_at'] = iso_utc(me['created_at'])
    me.setdefault('role', 'admin')
    return me


# ------------ ADMINS CRUD ------------
class AdminCreateIn(BaseModel):
    username: str
    password: str

class ProfileUpdateIn(BaseModel):
    new_username: Optional[str] = None
    current_password: str
    new_password: Optional[str] = None

@admin_router.get('/admin/admins')
async def list_admins(user=Depends(require_admin)):
    cursor = _db.admins.find({}, {'password_hash': 0, '_id': 0}).sort('created_at', 1)
    items = []
    async for doc in cursor:
        doc.setdefault('role', 'admin')
        doc['created_at'] = iso_utc(doc.get('created_at'))
        items.append(doc)
    return {'items': items, 'total': len(items)}

@admin_router.post('/admin/admins')
async def create_admin(data: AdminCreateIn, user=Depends(require_admin)):
    uname = (data.username or '').strip().lower()
    if len(uname) < 3:
        raise HTTPException(400, 'Nome de usuário muito curto (mínimo 3 caracteres).')
    if not uname.replace('_', '').replace('.', '').replace('-', '').isalnum():
        raise HTTPException(400, 'Use apenas letras, números, _ . -')
    if len(data.password) < 6:
        raise HTTPException(400, 'Senha muito curta (mínimo 6 caracteres).')
    if await _db.admins.find_one({'username': uname}):
        raise HTTPException(409, 'Já existe um administrador com esse usuário.')
    pwd_hash = bcrypt.hashpw(data.password.encode(), bcrypt.gensalt()).decode()
    await _db.admins.insert_one({
        'username': uname,
        'password_hash': pwd_hash,
        'role': 'admin',
        'created_by': user['sub'],
        'created_at': datetime.now(timezone.utc),
    })
    return {'ok': True, 'username': uname}

@admin_router.delete('/admin/admins/{username}')
async def delete_admin(username: str, user=Depends(require_admin)):
    target = await _db.admins.find_one({'username': username})
    if not target:
        raise HTTPException(404, 'Administrador não encontrado.')
    if target.get('role') == 'root':
        raise HTTPException(403, 'Não é possível excluir o administrador root.')
    if username == user['sub']:
        raise HTTPException(403, 'Você não pode excluir a si mesmo.')
    res = await _db.admins.delete_one({'username': username})
    return {'ok': True, 'deleted': res.deleted_count}

@admin_router.put('/admin/auth/profile')
async def update_profile(data: ProfileUpdateIn, user=Depends(require_admin)):
    me = await _db.admins.find_one({'username': user['sub']})
    if not me:
        raise HTTPException(404, 'Administrador não encontrado.')
    if not bcrypt.checkpw(data.current_password.encode(), me['password_hash'].encode()):
        raise HTTPException(401, 'Senha atual incorreta.')
    update = {}
    new_token = None
    if data.new_username:
        new_uname = data.new_username.strip().lower()
        if len(new_uname) < 3:
            raise HTTPException(400, 'Nome de usuário muito curto.')
        if new_uname != user['sub']:
            if await _db.admins.find_one({'username': new_uname}):
                raise HTTPException(409, 'Já existe um administrador com esse usuário.')
            update['username'] = new_uname
            new_token = make_token(new_uname)
    if data.new_password:
        if len(data.new_password) < 6:
            raise HTTPException(400, 'Nova senha muito curta (mínimo 6 caracteres).')
        update['password_hash'] = bcrypt.hashpw(data.new_password.encode(), bcrypt.gensalt()).decode()
    if not update:
        return {'ok': True, 'changed': False}
    update['updated_at'] = datetime.now(timezone.utc)
    await _db.admins.update_one({'username': user['sub']}, {'$set': update})
    return {'ok': True, 'changed': True, 'token': new_token, 'username': update.get('username', user['sub'])}


# ------------ DASHBOARD ------------
async def count_today(col: str) -> int:
    start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    return await _db[col].count_documents({'created_at': {'$gte': start}})

@admin_router.get('/admin/dashboard/kpis')
async def kpis(user=Depends(require_admin)):
    cols = ['accesses', 'registrations', 'pix_generated', 'pix_copied', 'pix_downloaded']
    total = {c: await _db[c].count_documents({}) for c in cols}
    today = {c: await count_today(c) for c in cols}
    # apenas inscrições FINALIZADAS
    inscricoes_total = await _db.inscricoes.count_documents({'finalized': True})
    start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    inscricoes_today = await _db.inscricoes.count_documents({'finalized': True, 'finalized_at': {'$gte': start}})
    today['registrations'] = inscricoes_today

    # ---- Cálculo de valores reais por inscrição (valor varia por concurso) ----
    # Coleta CPFs por estado (top-level cpf OR extra.cpf for legacy data)
    cpfs_gen = set()
    cpfs_copy = set()
    cpfs_down = set()
    async for d in _db.pix_generated.find({}, {'cpf': 1, 'extra.cpf': 1, '_id': 0}):
        cpf = d.get('cpf') or (d.get('extra') or {}).get('cpf')
        if cpf: cpfs_gen.add(cpf)
    async for d in _db.pix_copied.find({}, {'cpf': 1, 'extra.cpf': 1, '_id': 0}):
        cpf = d.get('cpf') or (d.get('extra') or {}).get('cpf')
        if cpf: cpfs_copy.add(cpf)
    async for d in _db.pix_downloaded.find({}, {'cpf': 1, 'extra.cpf': 1, '_id': 0}):
        cpf = d.get('cpf') or (d.get('extra') or {}).get('cpf')
        if cpf: cpfs_down.add(cpf)

    # valor default (fallback se inscrição não existir ou não tiver valor)
    settings = await _db.settings.find_one({'_id': 'main'}) or {}
    valor_default = float(settings.get('valor_inscricao', 75.0))

    # Mapeia CPF -> valor da inscrição
    cpf_to_valor = {}
    async for d in _db.inscricoes.find({}, {'cpf': 1, 'valor': 1, '_id': 0}):
        cpf = d.get('cpf')
        if cpf:
            cpf_to_valor[cpf] = float(d.get('valor') or valor_default)

    def sum_valor(cpfs):
        return sum(cpf_to_valor.get(c, valor_default) for c in cpfs)

    return {
        'acessos': total['accesses'],
        'inscricoes': inscricoes_total,
        'pix_gerados': total['pix_generated'],
        'pix_copiados': total['pix_copied'],
        'pix_baixados': total['pix_downloaded'],
        'valor_total': sum_valor(cpfs_gen),
        'valor_copiados': sum_valor(cpfs_copy),
        'valor_baixados': sum_valor(cpfs_down),
        'valor_unit': valor_default,
        'today': today,
    }

@admin_router.get('/admin/dashboard/funnel')
async def funnel(user=Depends(require_admin)):
    cols = [
        ('Acessos ao site', 'accesses', '#8b5cf6', None),
        ('Cadastros criados', 'cadastros', '#a78bfa', None),
        ('Inscrições finalizadas', 'inscricoes', '#10b981', {'finalized': True}),
        ('PIX gerado', 'pix_generated', '#f59e0b', None),
        ('PIX copiado', 'pix_copied', '#ec4899', None),
        ('PIX baixado', 'pix_downloaded', '#06b6d4', None),
    ]
    data = []
    counts = []
    for label, col, color, extra_filter in cols:
        c = await _db[col].count_documents(extra_filter or {})
        counts.append(c)
        data.append({'label': label, 'count': c, 'color': color})
    top = counts[0] if counts and counts[0] else 1
    for i, d in enumerate(data):
        d['percent'] = round(d['count'] / top * 100, 1)
        if i == 0:
            d['conversion'] = None
            d['dropped'] = 0
        else:
            prev = counts[i-1]
            d['conversion'] = round((d['count'] / prev * 100) if prev else 0, 1)
            d['dropped'] = max(prev - d['count'], 0)
    return data

@admin_router.get('/admin/dashboard/locations')
async def locations(user=Depends(require_admin)):
    cursor = _db.accesses.find({}, {'city': 1, 'uf': 1})
    counter = Counter()
    async for doc in cursor:
        if doc.get('city'):
            key = f"{doc['city']}|{doc.get('uf', '')}"
            counter[key] += 1
    items = []
    for key, c in counter.most_common(10):
        city, uf = key.split('|')
        items.append({'city': city, 'uf': uf, 'count': c})
    return items

@admin_router.get('/admin/dashboard/activity-7days')
async def activity_7days(user=Depends(require_admin)):
    days = []
    now = datetime.now(timezone.utc)
    for i in range(6, -1, -1):
        d = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        d_next = d + timedelta(days=1)
        acessos = await _db.accesses.count_documents({'created_at': {'$gte': d, '$lt': d_next}})
        inscr = await _db.registrations.count_documents({'created_at': {'$gte': d, '$lt': d_next}})
        days.append({'day': d.strftime('%d/%m'), 'acessos': acessos, 'inscricoes': inscr})
    return days

@admin_router.get('/admin/dashboard/activity')
async def activity(rng: str = Query('7d', alias='range'), user=Depends(require_admin)):
    """Atividade com janelas dinâmicas:
    - 1h  → 12 buckets de 5 minutos
    - 24h → 24 buckets de 1 hora
    - 7d  → 7 buckets de 1 dia
    Retorna [{label, acessos, inscricoes}].
    """
    now = datetime.now(timezone.utc)
    buckets = []
    if rng == '1h':
        # alinhado ao próximo bucket de 5 min (futuro mais próximo) e volta 12 passos
        floor_min = (now.minute // 5) * 5
        anchor = now.replace(minute=floor_min, second=0, microsecond=0) + timedelta(minutes=5)
        for i in range(12, 0, -1):
            start = anchor - timedelta(minutes=i * 5)
            end = start + timedelta(minutes=5)
            buckets.append((start, end, start.strftime('%H:%M')))
    elif rng == '24h':
        anchor = now.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
        for i in range(24, 0, -1):
            start = anchor - timedelta(hours=i)
            end = start + timedelta(hours=1)
            buckets.append((start, end, start.strftime('%H:%M')))
    else:  # 7d (default)
        for i in range(6, -1, -1):
            start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
            end = start + timedelta(days=1)
            buckets.append((start, end, start.strftime('%d/%m')))

    out = []
    for start, end, label in buckets:
        acessos = await _db.accesses.count_documents({'created_at': {'$gte': start, '$lt': end}})
        inscr = await _db.registrations.count_documents({'created_at': {'$gte': start, '$lt': end}})
        out.append({'day': label, 'acessos': acessos, 'inscricoes': inscr})
    return out

@admin_router.get('/admin/dashboard/realtime')
async def realtime(limit: int = 50, user=Depends(require_admin)):
    cursor = _db.events.find({}, {'_id': 0}).sort('created_at', -1).limit(limit)
    items = []
    async for doc in cursor:
        doc['created_at'] = iso_utc(doc.get('created_at'))
        items.append(doc)
    return items

@admin_router.get('/admin/accesses')
async def list_accesses(skip: int = 0, limit: int = 200, q: str = '', user=Depends(require_admin)):
    filt = {}
    if q:
        filt['$or'] = [
            {'ip': {'$regex': q}},
            {'city': {'$regex': q, '$options': 'i'}},
            {'uf': {'$regex': q, '$options': 'i'}},
            {'user_agent': {'$regex': q, '$options': 'i'}},
        ]
    cursor = _db.accesses.find(filt, {'_id': 0}).sort('created_at', -1).skip(skip).limit(limit)
    items = []
    async for doc in cursor:
        doc['created_at'] = iso_utc(doc.get('created_at'))
        ua = (doc.get('user_agent') or '').lower()
        doc['device'] = 'mobile' if any(k in ua for k in ['mobi', 'android', 'iphone', 'ipad', 'ipod']) else 'desktop'
        items.append(doc)
    total = await _db.accesses.count_documents(filt)
    return {'items': items, 'total': total}

@admin_router.get('/admin/inscriptions')
async def list_inscriptions(skip: int = 0, limit: int = 100, q: str = '', status: str = '', user=Depends(require_admin)):
    # Apenas inscrições finalizadas (que clicaram em "Prosseguir Pré-Inscrição")
    filt = {'finalized': True}
    if q:
        filt['$or'] = [
            {'nome': {'$regex': q, '$options': 'i'}},
            {'cpf': {'$regex': q}},
            {'email': {'$regex': q, '$options': 'i'}},
            {'concurso': {'$regex': q, '$options': 'i'}},
        ]
    cursor = _db.inscricoes.find(filt, {'_id': 0, 'senha_hash': 0}).sort('created_at', -1).skip(skip).limit(limit)
    raw_items = []
    async for doc in cursor:
        doc['created_at'] = iso_utc(doc.get('created_at'))
        raw_items.append(doc)

    # status precomputado: usa pix_status da inscrição (último evento ganha), fallback por CPF/nome nas coleções
    cpfs = list({i.get('cpf') for i in raw_items if i.get('cpf')})
    downloaded = set()
    copied = set()
    generated = set()
    if cpfs:
        async for d in _db.pix_downloaded.find({'$or': [{'cpf': {'$in': cpfs}}, {'extra.cpf': {'$in': cpfs}}]}, {'cpf': 1, 'extra.cpf': 1, '_id': 0}):
            cpf = d.get('cpf') or (d.get('extra') or {}).get('cpf')
            if cpf: downloaded.add(cpf)
        async for d in _db.pix_copied.find({'$or': [{'cpf': {'$in': cpfs}}, {'extra.cpf': {'$in': cpfs}}]}, {'cpf': 1, 'extra.cpf': 1, '_id': 0}):
            cpf = d.get('cpf') or (d.get('extra') or {}).get('cpf')
            if cpf: copied.add(cpf)
        async for d in _db.pix_generated.find({'$or': [{'cpf': {'$in': cpfs}}, {'extra.cpf': {'$in': cpfs}}]}, {'cpf': 1, 'extra.cpf': 1, '_id': 0}):
            cpf = d.get('cpf') or (d.get('extra') or {}).get('cpf')
            if cpf: generated.add(cpf)
    # fallback by nome (algumas vezes só vem nome no extra)
    nomes_map = {}
    if raw_items:
        nomes_map = {i.get('nome', '').upper(): i.get('cpf') for i in raw_items if i.get('nome')}
        for col, target in [(_db.pix_downloaded, downloaded), (_db.pix_copied, copied), (_db.pix_generated, generated)]:
            async for d in col.find({'extra.nome': {'$in': list(nomes_map.keys())}}, {'extra.nome': 1, '_id': 0}):
                nm = ((d.get('extra') or {}).get('nome') or '').upper()
                cpf = nomes_map.get(nm)
                if cpf: target.add(cpf)

    def compute_status(doc):
        # PRIORIDADE 1: pix_status salvo na inscrição (reflete o ÚLTIMO evento)
        ps = doc.get('pix_status')
        if ps:
            return ps
        # FALLBACK: lógica antiga por prioridade (baixado > copiado > gerado)
        cpf = doc.get('cpf')
        if cpf in downloaded: return 'PIX baixado'
        if cpf in copied: return 'PIX copiado'
        if cpf in generated: return 'PIX gerado'
        return 'Aguardando pagamento'

    settings = await _db.settings.find_one({'_id': 'main'}) or {}
    valor_default = float(settings.get('valor_inscricao', 75.0))

    items = []
    for doc in raw_items:
        cpf = doc.get('cpf')
        ua = (doc.get('user_agent') or '').lower()
        device = 'mobile' if any(k in ua for k in ['mobi','android','iphone','ipad','ipod']) else 'desktop'
        # Valor: prioridade -> doc.valor (gravado no momento da inscrição), fallback -> default
        valor = doc.get('valor')
        if valor is None or valor == '':
            valor = valor_default
        item = {**doc}
        item.update({
            'valor': float(valor),
            'status': compute_status(doc),
            'device': device,
        })
        items.append(item)

    if status:
        items = [i for i in items if i['status'] == status]
    total = await _db.inscricoes.count_documents(filt)
    return {'items': items, 'total': total}

@admin_router.get('/admin/users')
async def list_users(skip: int = 0, limit: int = 50, q: str = '', user=Depends(require_admin)):
    filt = {}
    if q:
        filt['$or'] = [
            {'nome': {'$regex': q, '$options': 'i'}},
            {'cpf': {'$regex': q}},
            {'email': {'$regex': q, '$options': 'i'}},
        ]
    cursor = _db.inscricoes.find(filt, {'_id': 0, 'senha_hash': 0}).sort('created_at', -1).skip(skip).limit(limit)
    items = []
    async for doc in cursor:
        ca = doc.get('created_at')
        doc['created_at'] = ca.isoformat() if isinstance(ca, datetime) else ca
        items.append(doc)
    total = await _db.inscricoes.count_documents(filt)
    return {'items': items, 'total': total}

@admin_router.delete('/admin/inscriptions/{insc_id}')
async def delete_inscription(insc_id: str, user=Depends(require_admin)):
    res = await _db.inscricoes.delete_one({'id': insc_id})
    return {'deleted': res.deleted_count}

@admin_router.post('/admin/inscriptions/clear-all')
async def clear_all_inscriptions(user=Depends(require_admin)):
    res = await _db.inscricoes.delete_many({})
    await _db.registrations.delete_many({})
    return {'deleted': res.deleted_count}

@admin_router.delete('/admin/users/{user_id}')
async def delete_user(user_id: str, user=Depends(require_admin)):
    res = await _db.inscricoes.delete_one({'id': user_id})
    return {'deleted': res.deleted_count}


# ------------ CADASTROS (ficha única por CPF) ------------
def _format_cpf_admin(cpf: str) -> str:
    d = ''.join(c for c in (cpf or '') if c.isdigit())
    if len(d) != 11:
        return cpf or '—'
    return f"{d[:3]}.{d[3:6]}.{d[6:9]}-{d[9:]}"

@admin_router.get('/admin/cadastros')
async def list_cadastros(skip: int = 0, limit: int = 200, q: str = '', user=Depends(require_admin)):
    filt = {}
    if q:
        filt['$or'] = [
            {'nome': {'$regex': q, '$options': 'i'}},
            {'cpf': {'$regex': q}},
            {'email': {'$regex': q, '$options': 'i'}},
        ]
    cursor = _db.cadastros.find(filt, {'_id': 0}).sort('last_at', -1).skip(skip).limit(limit)
    items = []
    async for doc in cursor:
        for k in ('created_at', 'last_at'):
            if isinstance(doc.get(k), datetime):
                doc[k] = iso_utc(doc[k])
        items.append(doc)
    total = await _db.cadastros.count_documents(filt)
    return {'items': items, 'total': total}

@admin_router.get('/admin/cadastros/export.txt')
async def export_cadastros_txt(q: str = '', user=Depends(require_admin)):
    """Exporta a lista de cadastros como TXT organizado."""
    from fastapi.responses import PlainTextResponse
    filt = {}
    if q:
        filt['$or'] = [
            {'nome': {'$regex': q, '$options': 'i'}},
            {'cpf': {'$regex': q}},
            {'email': {'$regex': q, '$options': 'i'}},
        ]
    cursor = _db.cadastros.find(filt, {'_id': 0}).sort('last_at', -1)
    items = []
    async for doc in cursor:
        items.append(doc)

    now_br = (datetime.now(timezone.utc) - timedelta(hours=3)).strftime('%d/%m/%Y às %H:%M')
    total = len(items)

    lines = []
    lines.append("═" * 70)
    lines.append("                   CADASTROS — PORTAL")
    lines.append(f"           Exportado em: {now_br}")
    lines.append(f"           Total: {total} {'cadastro' if total == 1 else 'cadastros'}")
    if q:
        lines.append(f"           Filtro: \"{q}\"")
    lines.append("═" * 70)
    lines.append("")

    if not items:
        lines.append("   (nenhum cadastro encontrado)")
        lines.append("")
    else:
        for idx, c in enumerate(items, 1):
            cpf = _format_cpf_admin(c.get('cpf', ''))
            nome = c.get('nome') or '—'
            email = (c.get('email') or '—').lower() if c.get('email') else '—'
            dt = c.get('last_at') or c.get('created_at')
            if isinstance(dt, datetime):
                dt_str = (dt - timedelta(hours=3)).strftime('%d/%m/%Y às %H:%M')
            elif isinstance(dt, str):
                try:
                    parsed = datetime.fromisoformat(dt.replace('Z', '+00:00'))
                    dt_str = (parsed - timedelta(hours=3)).strftime('%d/%m/%Y às %H:%M')
                except Exception:
                    dt_str = dt
            else:
                dt_str = '—'
            device = 'Mobile' if c.get('device') == 'mobile' else 'Desktop'
            concurso = c.get('last_concurso') or '—'
            insc_count = c.get('inscricoes_count', 0)

            lines.append(f"  #{idx:03d}  {nome}")
            lines.append(f"  " + "─" * 66)
            lines.append(f"    CPF              : {cpf}")
            lines.append(f"    E-mail           : {email}")
            lines.append(f"    Data do cadastro : {dt_str}")
            lines.append(f"    Dispositivo      : {device}")
            lines.append(f"    Último concurso  : {concurso}")
            lines.append(f"    Inscrições       : {insc_count}")
            lines.append("")

    lines.append("═" * 70)
    lines.append(f"  Fim do relatório — {total} {'registro' if total == 1 else 'registros'}")
    lines.append("═" * 70)

    content = "\n".join(lines) + "\n"
    filename = f"cadastros_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M')}.txt"
    return PlainTextResponse(
        content=content,
        media_type='text/plain; charset=utf-8',
        headers={'Content-Disposition': f'attachment; filename="{filename}"'},
    )

@admin_router.delete('/admin/cadastros/{cpf}')
async def delete_cadastro(cpf: str, user=Depends(require_admin)):
    cpf_digits = ''.join(c for c in (cpf or '') if c.isdigit())
    res = await _db.cadastros.delete_one({'cpf': cpf_digits})
    return {'ok': True, 'deleted': res.deleted_count}


@admin_router.delete('/admin/cadastros')
async def delete_all_cadastros(user=Depends(require_admin)):
    """Apaga TODOS os cadastros da coleção 'cadastros' (não afeta inscrições)."""
    res = await _db.cadastros.delete_many({})
    return {'ok': True, 'deleted': res.deleted_count}

@admin_router.get('/admin/settings')
async def get_settings(user=Depends(require_admin)):
    s = await _db.settings.find_one({'_id': 'main'}, {'_id': 0})
    defaults = {
        'valor_inscricao': 75.0, 'mensagem': '', 'data_prova': '',
        'pix_key': '', 'pix_nome': '', 'pix_cidade': '',
        'telegram_bot_token': '', 'telegram_chat_id': '', 'telegram_enabled': False,
    }
    return {**defaults, **(s or {})}

@admin_router.put('/admin/settings')
async def put_settings(data: Dict[str, Any], user=Depends(require_admin)):
    await _db.settings.update_one({'_id': 'main'}, {'$set': data}, upsert=True)
    return {'ok': True}


# ------------ TELEGRAM ------------
async def _telegram_send(token: str, chat_id: str, text: str) -> Dict[str, Any]:
    """Send a Telegram message via Bot API. Returns dict with ok and details."""
    if not token or not chat_id:
        return {'ok': False, 'error': 'Token ou Chat ID não configurados.'}
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.post(url, json={
                'chat_id': chat_id,
                'text': text,
                'parse_mode': 'HTML',
                'disable_web_page_preview': True,
            })
            data = r.json()
            if r.status_code == 200 and data.get('ok'):
                return {'ok': True, 'message_id': data.get('result', {}).get('message_id')}
            return {'ok': False, 'error': data.get('description', f'HTTP {r.status_code}')}
    except Exception as e:
        return {'ok': False, 'error': str(e)}

async def notify_telegram_inscricao(insc: Dict[str, Any]):
    """DEPRECATED — mantida por compatibilidade. Use notify_or_update_telegram."""
    return


def _status_emoji(status: str) -> str:
    return {
        'Aguardando pagamento': '🟡',
        'PIX gerado': '🟠',
        'PIX copiado': '🟢',
        'PIX baixado': '✅',
    }.get(status or '', '🟡')


def _format_cpf_br(cpf: str) -> str:
    d = ''.join(c for c in (cpf or '') if c.isdigit())
    if len(d) != 11:
        return cpf or '—'
    return f"{d[:3]}.{d[3:6]}.{d[6:9]}-{d[9:]}"


def _format_data_hora_brt(dt) -> str:
    """Formata como 'dd/mm/YYYY às HH:MM' em horário de Brasília (UTC-3)."""
    if not dt:
        dt = datetime.now(timezone.utc)
    if isinstance(dt, str):
        try:
            dt = datetime.fromisoformat(dt.replace('Z', '+00:00'))
        except Exception:
            dt = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    brt = dt - timedelta(hours=3)
    return brt.strftime('%d/%m/%Y às %H:%M')


def _build_telegram_message(insc: Dict[str, Any], settings: Dict[str, Any] = None) -> str:
    """Constroi a mensagem do Telegram no formato definido pelo cliente."""
    settings = settings or {}
    titulo = settings.get('telegram_titulo') or 'NOVA INSCRIÇÃO'

    nome = (insc.get('nome') or 'Candidato').strip()
    cpf = _format_cpf_br(insc.get('cpf', ''))

    # Data/hora: prioriza telegram_sent_at (primeira notificação) para manter consistente
    dt_iso = insc.get('telegram_sent_at') or insc.get('atualizado_em') or insc.get('created_at')
    data_hora = _format_data_hora_brt(dt_iso)

    device_label = 'Mobile' if (insc.get('device') == 'mobile') else 'Desktop'

    city = (insc.get('city') or '').strip()
    region = (insc.get('region_name') or insc.get('uf') or '').strip()
    if city and region:
        local = f"{city}/{region}"
    elif city:
        local = city
    elif region:
        local = region
    else:
        local = '—'

    status = insc.get('pix_status') or 'Aguardando pagamento'
    emoji = _status_emoji(status)

    return (
        f"<b>{titulo}</b>\n"
        "━━━━━━━━━━━━━━━━━\n\n"
        f"👤 <b>Usuário:</b> {nome}\n"
        f"🔐 <b>CPF:</b> {cpf}\n"
        f"📅 <b>Data/hora:</b> {data_hora}\n"
        f"📱 <b>Dispositivo:</b> {device_label}\n"
        f"📍 <b>Local:</b> {local}\n"
        f"📊 <b>Status:</b> {emoji} {status}"
    )


async def _telegram_edit(token: str, chat_id: str, message_id: int, text: str) -> Dict[str, Any]:
    """Edita uma mensagem do Telegram via editMessageText."""
    url = f"https://api.telegram.org/bot{token}/editMessageText"
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.post(url, json={
                'chat_id': chat_id,
                'message_id': message_id,
                'text': text,
                'parse_mode': 'HTML',
                'disable_web_page_preview': True,
            })
            data = r.json()
            if r.status_code == 200 and data.get('ok'):
                return {'ok': True}
            err = (data.get('description') or '') if isinstance(data, dict) else ''
            # Se a mensagem está idêntica, o Telegram retorna erro — ignoramos
            if 'not modified' in err.lower():
                return {'ok': True, 'unchanged': True}
            return {'ok': False, 'error': err or f'HTTP {r.status_code}'}
    except Exception as e:
        return {'ok': False, 'error': str(e)}


async def notify_or_update_telegram(cpf: str, request: Request = None):
    """Envia notificação OU edita a mensagem existente para refletir o status atual.
    - Primeira chamada (sem telegram_message_id na inscrição): envia e salva o message_id.
    - Chamadas subsequentes: edita a mensagem original com o status atualizado.
    Best-effort — qualquer erro é logado mas não propaga.
    """
    if not cpf:
        return
    try:
        s = await _db.settings.find_one({'_id': 'main'}) or {}
        if not s.get('telegram_enabled'):
            return
        token = (s.get('telegram_bot_token') or '').strip()
        chat = str(s.get('telegram_chat_id') or '').strip()
        if not token or not chat:
            return

        insc = await _db.inscricoes.find_one({'cpf': cpf})
        if not insc:
            return

        # Enriquecimento (apenas na primeira vez ou se faltar info)
        needs_geo = not insc.get('city')
        needs_device = not insc.get('device')
        if request is not None and (needs_geo or needs_device):
            patch = {}
            ip = get_real_ip(request)
            if needs_geo:
                geo = await geolocate_ip(ip)
                patch['ip'] = ip
                patch['city'] = geo.get('city', '')
                patch['uf'] = geo.get('uf', '')
                patch['region_name'] = geo.get('region_name', '')
                patch['country'] = geo.get('country', '')
            if needs_device:
                ua = (insc.get('user_agent') or request.headers.get('user-agent', '') or '').lower()
                patch['device'] = 'mobile' if any(k in ua for k in ['mobi', 'android', 'iphone', 'ipad', 'ipod']) else 'desktop'
                if not insc.get('user_agent'):
                    patch['user_agent'] = request.headers.get('user-agent', '')
            if patch:
                await _db.inscricoes.update_one({'cpf': cpf}, {'$set': patch})
                insc.update(patch)

        msg_id = insc.get('telegram_message_id')
        text = _build_telegram_message(insc, s)

        if msg_id:
            res = await _telegram_edit(token, chat, int(msg_id), text)
            if not res.get('ok'):
                logger.warning(f"Telegram edit failed for cpf={cpf}: {res.get('error')}")
        else:
            # Primeira vez — registra telegram_sent_at antes do envio para usar na mensagem
            now = datetime.now(timezone.utc)
            insc['telegram_sent_at'] = now
            text = _build_telegram_message(insc, s)
            res = await _telegram_send(token, chat, text)
            if res.get('ok') and res.get('message_id'):
                await _db.inscricoes.update_one({'cpf': cpf}, {'$set': {
                    'telegram_message_id': res['message_id'],
                    'telegram_sent_at': now,
                }})
            else:
                logger.warning(f"Telegram send failed for cpf={cpf}: {res.get('error')}")
    except Exception as e:
        logger.warning(f"notify_or_update_telegram error: {e}")

class TelegramTestIn(BaseModel):
    bot_token: Optional[str] = None
    chat_id: Optional[str] = None

@admin_router.post('/admin/telegram/test')
async def telegram_test(data: TelegramTestIn, user=Depends(require_admin)):
    """Send a test message using either provided token/chat_id or saved settings."""
    s = await _db.settings.find_one({'_id': 'main'}) or {}
    token = (data.bot_token or s.get('telegram_bot_token') or '').strip()
    chat = str(data.chat_id or s.get('telegram_chat_id') or '').strip()
    if not token or not chat:
        raise HTTPException(400, 'Informe o Bot Token e o Chat ID antes de testar.')
    text = (
        "✅ <b>Teste de notificação</b>\n\n"
        "O painel administrativo está conectado ao Telegram com sucesso. "
        "A partir de agora você receberá uma mensagem aqui sempre que uma nova inscrição for criada."
    )
    res = await _telegram_send(token, chat, text)
    if not res.get('ok'):
        raise HTTPException(400, f"Falha ao enviar: {res.get('error', 'erro desconhecido')}")
    return res

@admin_router.post('/admin/reset-kpis')
async def reset_kpis(user=Depends(require_admin)):
    for c in ['accesses', 'registrations', 'pix_generated', 'pix_copied', 'pix_downloaded', 'events']:
        await _db[c].delete_many({})
    return {'ok': True}
