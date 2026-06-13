#!/usr/bin/env python3
"""
Popula o Painel Admin com 60 inscrições realistas (20 por concurso),
acessos com IPs reais (faixas brasileiras) + cidades/UFs, eventos de
PIX gerado/copiado/baixado e o histórico de atividade.

Uso:
    python3 /app/scripts/seed_admin_data.py
"""
import os
import sys
import random
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path

# carrega .env do backend
from dotenv import load_dotenv
ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / 'backend' / '.env')

from pymongo import MongoClient

MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']

client = MongoClient(MONGO_URL)
db = client[DB_NAME]

# -------------------------------------------------------------------
# Dados realistas
# -------------------------------------------------------------------
NOMES = [
    "Ana Beatriz Souza", "Carlos Eduardo Lima", "Mariana Oliveira Santos", "Rafael Mendes Costa",
    "Juliana Pereira Alves", "Pedro Henrique Rocha", "Camila Ferreira Dias", "Lucas Gabriel Martins",
    "Beatriz Carvalho Nunes", "Felipe Augusto Ribeiro", "Larissa Almeida Castro", "Gustavo Henrique Silva",
    "Patrícia Gomes Barbosa", "Thiago Vinícius Araújo", "Renata Cristina Moreira", "Diego Alves Pinheiro",
    "Vanessa Lopes Cardoso", "Bruno Henrique Teixeira", "Aline Cristine Borges", "Marcelo Antônio Freitas",
    "Letícia Maria Andrade", "Rodrigo Silva Machado", "Tatiana Regina Cunha", "Eduardo Costa Vieira",
    "Priscila Rosa Magalhães", "André Luiz Fernandes", "Carolina Santos Bezerra", "Fernando Augusto Melo",
    "Isabela Cristina Tavares", "Vinícius Oliveira Brito", "Natália Gonçalves Pires", "Ricardo José Moura",
    "Sabrina Aparecida Cordeiro", "Henrique Macedo Soares", "Débora Vieira Camargo", "Leandro Pacheco Maia",
    "Amanda Caroline Sales", "José Cláudio Damasceno", "Bianca Helena Antunes", "Wesley Roberto Cavalcante",
    "Mirella Luana Sampaio", "Otávio Augusto Bittencourt", "Karen Rebeca Figueiredo", "Sérgio Murilo Pontes",
    "Bárbara Helena Lacerda", "Roberto Daniel Quintela", "Cíntia Aparecida Drummond", "Murilo Cesar Vasconcelos",
    "Helena Beatriz Marques", "Igor Vinícius Esteves", "Carla Patrícia Negrão", "Bruno Aurélio Furtado",
    "Tânia Mara Bittencourt", "Alexandre Filipe Mascarenhas", "Daniele Cristine Pacheco", "Fábio Henrique Resende",
    "Roberta Ferreira Galvão", "Antônio Marcos Pereira", "Suelen Aparecida Borba", "Caio César Pimentel",
]

# Faixas de IP reais brasileiras (operadoras: Vivo, Claro, TIM, Oi, NET, etc.)
# Cada tupla: (prefixo IP, cidade, UF, lat, lon)
IP_LOCATIONS = [
    ("200.158",  "São Paulo",        "SP", -23.5505, -46.6333),
    ("189.6",    "Rio de Janeiro",   "RJ", -22.9068, -43.1729),
    ("177.32",   "Belo Horizonte",   "MG", -19.9167, -43.9345),
    ("191.32",   "Salvador",         "BA", -12.9714, -38.5014),
    ("177.139",  "Brasília",         "DF", -15.7975, -47.8919),
    ("187.45",   "Fortaleza",        "CE", -3.7172,  -38.5433),
    ("201.6",    "Recife",           "PE", -8.0476,  -34.8770),
    ("179.184",  "Porto Alegre",     "RS", -30.0346, -51.2177),
    ("177.79",   "Curitiba",         "PR", -25.4284, -49.2733),
    ("186.215",  "Manaus",           "AM", -3.1190,  -60.0217),
    ("201.17",   "Goiânia",          "GO", -16.6864, -49.2643),
    ("189.45",   "Campina Grande",   "PB", -7.2306,  -35.8811),
    ("177.103",  "João Pessoa",      "PB", -7.1195,  -34.8450),
    ("189.124",  "Natal",            "RN", -5.7945,  -35.2110),
    ("189.91",   "Teresina",         "PI", -5.0892,  -42.8019),
    ("177.55",   "Belém",            "PA", -1.4558,  -48.5039),
    ("201.55",   "Florianópolis",    "SC", -27.5954, -48.5480),
    ("191.252",  "Vitória",          "ES", -20.3155, -40.3128),
    ("177.45",   "Campinas",         "SP", -22.9099, -47.0626),
    ("187.121",  "Maceió",           "AL", -9.6498,  -35.7089),
    ("186.249",  "Aracaju",          "SE", -10.9472, -37.0731),
    ("201.46",   "Cuiabá",           "MT", -15.6014, -56.0979),
    ("177.94",   "Campo Grande",     "MS", -20.4697, -54.6201),
    ("177.137",  "São Luís",         "MA", -2.5297,  -44.3028),
    ("189.6",    "Niterói",          "RJ", -22.8830, -43.1036),
    ("200.180",  "Sorocaba",         "SP", -23.5015, -47.4526),
    ("177.190",  "Uberlândia",       "MG", -18.9128, -48.2755),
    ("189.115",  "Joinville",        "SC", -26.3045, -48.8487),
    ("201.84",   "Londrina",         "PR", -23.3045, -51.1696),
    ("187.50",   "Caruaru",          "PE", -8.2829,  -35.9756),
]

USER_AGENTS_MOBILE = [
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Linux; Android 12; Moto G Power) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36",
]
USER_AGENTS_DESKTOP = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
]

CONCURSOS = [
    {
        "key": "quadro_geral",
        "nome": "Concurso Público IDECAN - Quadro Geral",
        "edital": "quadro-geral",
        "cargos": [
            ("COD 01100", "ADMINISTRADOR", "30H/S", "SAD", 150.0),
            ("COD 01123", "PROFESSOR DE EDUCAÇÃO BÁSICA 2", "30H", "SEDUC", 150.0),
            ("COD 01102", "ASSISTENTE SOCIAL", "30H/S", "SAD", 150.0),
            ("COD 01202", "TÉCNICO DE ENFERMAGEM", "30H", "SMS", 110.0),
            ("COD 01155", "FARMACÊUTICO", "30H", "SMS", 150.0),
            ("COD 01300", "AGENTE ADMINISTRATIVO", "30H/S", "SAD", 110.0),
            ("COD 01156", "FONOAUDIÓLOGO", "30H", "SMS", 150.0),
            ("COD 01401", "MÚSICO - CLARINETE", "30H/S", "SAD", 95.0),
        ],
    },
    {
        "key": "guarda_municipal",
        "nome": "Concurso Público IDECAN - Guarda Municipal",
        "edital": "guarda",
        "cargos": [
            ("COD 02100", "GUARDA MUNICIPAL MASCULINO", "40H", "SMSU", 110.0),
            ("COD 02101", "GUARDA MUNICIPAL FEMININO", "40H", "SMSU", 110.0),
        ],
    },
    {
        "key": "agente_transito",
        "nome": "Concurso Público IDECAN - Agente de Trânsito",
        "edital": "transito",
        "cargos": [
            ("COD 04300", "AGENTE DE TRÂNSITO", "30H", "STTP", 150.0),
        ],
    },
    {
        "key": "procuradoria",
        "nome": "Concurso Público IDECAN - Procurador Municipal",
        "edital": "procuradoria",
        "cargos": [
            ("COD 05100", "PROCURADOR MUNICIPAL", "40H", "PGM", 200.0),
        ],
    },
]


def gen_cpf():
    """Gera CPF válido (com dígitos verificadores corretos)."""
    n = [random.randint(0, 9) for _ in range(9)]

    def dv(arr, w_start):
        s = sum(v * w for v, w in zip(arr, range(w_start, 1, -1)))
        r = (s * 10) % 11
        return 0 if r == 10 else r

    n.append(dv(n, 10))
    n.append(dv(n, 11))
    d = ''.join(map(str, n))
    return f"{d[:3]}.{d[3:6]}.{d[6:9]}-{d[9:]}"


def gen_ip(prefix):
    return f"{prefix}.{random.randint(0, 255)}.{random.randint(1, 254)}"


def gen_protocolo():
    return f"IDC{random.randint(10_000_000, 99_999_999)}"


def random_past_dt(max_days=7):
    days_ago = random.uniform(0, max_days)
    return datetime.now(timezone.utc) - timedelta(days=days_ago, hours=random.randint(0, 23), minutes=random.randint(0, 59))


def main():
    print("🧹 Limpando dados antigos do dashboard...")
    for col in ["accesses", "registrations", "inscricoes", "pix_generated",
                "pix_copied", "pix_downloaded", "events", "cadastros"]:
        db[col].delete_many({})

    seeded_per_concurso = {c["key"]: 0 for c in CONCURSOS}
    inscricoes_doc = []
    eventos = []

    # Distribuição de status (80 inscrições — 20 por concurso × 4):
    # - 30% só inscritos (aguardando pagamento)
    # - 25% geraram PIX
    # - 25% copiaram PIX
    # - 20% baixaram comprovante
    status_pool = (
        ["aguardando"] * 24 +
        ["pix_gerado"] * 20 +
        ["pix_copiado"] * 20 +
        ["pix_baixado"] * 16
    )
    random.shuffle(status_pool)

    # Garante 20 por concurso
    cont = 0
    for concurso in CONCURSOS:
        for i in range(20):
            status = status_pool[cont]
            cont += 1

            nome = random.choice(NOMES)
            cpf = gen_cpf()
            cpf_digits = ''.join(c for c in cpf if c.isdigit())
            cargo = random.choice(concurso["cargos"])
            cod, titulo, jornada, secretaria, taxa = cargo

            loc = random.choice(IP_LOCATIONS)
            ip_prefix, city, uf, lat, lon = loc
            ip = gen_ip(ip_prefix)

            is_mobile = random.random() < 0.65  # 65% mobile
            ua = random.choice(USER_AGENTS_MOBILE if is_mobile else USER_AGENTS_DESKTOP)
            device = "mobile" if is_mobile else "desktop"

            created_at = random_past_dt(max_days=7)
            protocolo = gen_protocolo()

            # ---- Acesso inicial (sempre cria) ----
            db.accesses.insert_one({
                "page": "/idecan.html",
                "user_agent": ua,
                "ip": ip,
                "city": city,
                "uf": uf,
                "region_name": uf,
                "country": "Brazil",
                "country_code": "BR",
                "lat": lat,
                "lon": lon,
                "device": device,
                "created_at": created_at,
            })
            # acesso na página da inscrição
            db.accesses.insert_one({
                "page": f"/{concurso['edital']}.html",
                "user_agent": ua,
                "ip": ip,
                "city": city,
                "uf": uf,
                "region_name": uf,
                "country": "Brazil",
                "country_code": "BR",
                "lat": lat,
                "lon": lon,
                "device": device,
                "created_at": created_at + timedelta(minutes=1),
            })

            eventos.append({
                "kind": "access",
                "description": f"Novo acesso {device} - {city}/{uf}",
                "meta": {"page": "/idecan.html", "city": city, "uf": uf, "device": device, "location": f"{city}/{uf}", "ip": ip},
                "created_at": created_at,
            })

            # ---- Registration (legacy) ----
            reg_at = created_at + timedelta(minutes=random.randint(3, 15))
            db.registrations.insert_one({
                "nome": nome,
                "cpf": cpf_digits,
                "concurso": concurso["nome"],
                "created_at": reg_at,
            })

            # ---- Cadastro (ficha única por CPF) ----
            db.cadastros.update_one(
                {"cpf": cpf_digits},
                {
                    "$set": {
                        "nome": nome,
                        "cpf": cpf_digits,
                        "email": f"{nome.lower().replace(' ', '.').replace('ç', 'c').replace('ã', 'a').replace('é', 'e').replace('á', 'a').replace('í', 'i').replace('ó', 'o').replace('ú', 'u')}@gmail.com",
                        "last_concurso": concurso["nome"],
                        "device": device,
                        "last_at": reg_at,
                    },
                    "$setOnInsert": {"created_at": reg_at},
                    "$inc": {"inscricoes_count": 1},
                },
                upsert=True,
            )

            # ---- Inscrição finalizada (essencial para KPIs) ----
            pix_status_label = {
                "aguardando":  "Aguardando pagamento",
                "pix_gerado":  "PIX gerado",
                "pix_copiado": "PIX copiado",
                "pix_baixado": "PIX baixado",
            }[status]

            insc_id = str(uuid.uuid4())
            finalized_at = reg_at + timedelta(minutes=random.randint(2, 10))
            cidade_uf_email = nome.lower().replace(' ', '.')
            cidade_uf_email = ''.join(ch for ch in cidade_uf_email if ch.isalnum() or ch == '.')

            insc_doc = {
                "id": insc_id,
                "nome": nome,
                "cpf": cpf_digits,
                "email": f"{cidade_uf_email}@gmail.com",
                "concurso": concurso["nome"],
                "edital": concurso["edital"],
                "cargo_codigo": cod,
                "cargo_titulo": titulo,
                "jornada": jornada,
                "secretaria": secretaria,
                "valor": taxa,
                "taxa": f"R$ {taxa:.2f}".replace('.', ','),
                "protocolo": protocolo,
                "localidade": "CAMPINA GRANDE/PB",
                "ip": ip,
                "city": city,
                "uf": uf,
                "region_name": uf,
                "country": "Brazil",
                "device": device,
                "user_agent": ua,
                "finalized": True,
                "finalized_at": finalized_at,
                "created_at": reg_at,
                "pix_status": pix_status_label,
                "pix_status_at": finalized_at,
            }
            db.inscricoes.insert_one(insc_doc)

            eventos.append({
                "kind": "registration",
                "description": f"Nova inscrição: {nome}",
                "meta": {"nome": nome, "cpf": cpf_digits, "concurso": concurso["nome"]},
                "created_at": finalized_at,
            })

            # ---- PIX gerado/copiado/baixado conforme status ----
            base_extra = {
                "nome": nome,
                "cpf": cpf_digits,
                "concurso": concurso["nome"],
                "valor": taxa,
                "protocolo": protocolo,
            }

            if status in ("pix_gerado", "pix_copiado", "pix_baixado"):
                pix_gen_at = finalized_at + timedelta(minutes=random.randint(1, 5))
                db.pix_generated.insert_one({
                    "nome": nome,
                    "cpf": cpf_digits,
                    "concurso": concurso["nome"],
                    "valor": taxa,
                    "extra": base_extra,
                    "last_at": pix_gen_at,
                    "created_at": pix_gen_at,
                })
                eventos.append({
                    "kind": "pix_generated",
                    "description": f"PIX gerado por {nome}",
                    "meta": {**base_extra},
                    "created_at": pix_gen_at,
                })

            if status in ("pix_copiado", "pix_baixado"):
                pix_cp_at = finalized_at + timedelta(minutes=random.randint(6, 12))
                db.pix_copied.insert_one({
                    "nome": nome,
                    "cpf": cpf_digits,
                    "concurso": concurso["nome"],
                    "valor": taxa,
                    "extra": base_extra,
                    "last_at": pix_cp_at,
                    "created_at": pix_cp_at,
                })
                eventos.append({
                    "kind": "pix_copied",
                    "description": f"PIX copiado por {nome}",
                    "meta": {**base_extra},
                    "created_at": pix_cp_at,
                })

            if status == "pix_baixado":
                pix_dl_at = finalized_at + timedelta(minutes=random.randint(13, 25))
                db.pix_downloaded.insert_one({
                    "nome": nome,
                    "cpf": cpf_digits,
                    "concurso": concurso["nome"],
                    "valor": taxa,
                    "extra": base_extra,
                    "last_at": pix_dl_at,
                    "created_at": pix_dl_at,
                })
                eventos.append({
                    "kind": "pix_downloaded",
                    "description": f"Comprovante baixado por {nome}",
                    "meta": {**base_extra},
                    "created_at": pix_dl_at,
                })

            seeded_per_concurso[concurso["key"]] += 1

    # ---- Insere eventos em massa (ordenados por data) ----
    eventos.sort(key=lambda e: e["created_at"])
    if eventos:
        db.events.insert_many(eventos)

    # Adiciona alguns acessos extras "soltos" (visitantes que não finalizaram) – realismo
    print("👥 Adicionando 40 acessos extras (visitantes que só navegaram)...")
    for _ in range(40):
        loc = random.choice(IP_LOCATIONS)
        ip_prefix, city, uf, lat, lon = loc
        is_mobile = random.random() < 0.7
        ua = random.choice(USER_AGENTS_MOBILE if is_mobile else USER_AGENTS_DESKTOP)
        ts = random_past_dt(max_days=7)
        db.accesses.insert_one({
            "page": random.choice(["/idecan.html", "/quadro-geral.html", "/guarda-municipal.html", "/agente-transito.html"]),
            "user_agent": ua,
            "ip": gen_ip(ip_prefix),
            "city": city, "uf": uf, "region_name": uf,
            "country": "Brazil", "country_code": "BR",
            "lat": lat, "lon": lon,
            "device": "mobile" if is_mobile else "desktop",
            "created_at": ts,
        })

    # Resumo
    print("\n✅ Seed concluído!\n")
    print(f"   Inscrições finalizadas por concurso:")
    for k, v in seeded_per_concurso.items():
        print(f"      • {k}: {v}")
    print()
    print(f"   Totais no banco:")
    print(f"      • accesses        : {db.accesses.count_documents({})}")
    print(f"      • inscricoes      : {db.inscricoes.count_documents({'finalized': True})}")
    print(f"      • registrations   : {db.registrations.count_documents({})}")
    print(f"      • cadastros       : {db.cadastros.count_documents({})}")
    print(f"      • pix_generated   : {db.pix_generated.count_documents({})}")
    print(f"      • pix_copied      : {db.pix_copied.count_documents({})}")
    print(f"      • pix_downloaded  : {db.pix_downloaded.count_documents({})}")
    print(f"      • events          : {db.events.count_documents({})}")


if __name__ == "__main__":
    main()
