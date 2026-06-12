"""Extrai a tabela de cargos do quadro-geral.html e gera um JSON."""
import json
import math
import re
from pathlib import Path

src = Path("/app/frontend/public/quadro-geral.html")
dst = Path("/app/frontend/public/data/cargos-quadro-geral.json")
dst.parent.mkdir(parents=True, exist_ok=True)

html = src.read_text(encoding="utf-8")

# Each row pattern: <tr bgcolor=#FFFFFF><td>CARGO_FULL<td align=center>...SECRETARIA...<td align=center>R$ X.XXX,XX<td align=center>VAGAS<td align=center>-<td align=center>R$ TAXA
row_re = re.compile(
    r'<tr bgcolor=#FFFFFF><td>'
    r'(?P<cargo>[^<]+?)<span class=txt1>(?:<br>(?P<jornada>[^<]+))?<br>(?P<requisito>[^<]+)</span>'
    r'<td align=center>(?:<span class=txt1>(?P<sec>[^<]*)</span>)?'
    r'<td align=center>R\$\s*(?P<remun>[\d.,]+)'
    r'<td align=center>(?P<vagas>[\d-]+)'
    r'<td align=center>(?P<reserva>[\d.\-]+)'
    r'<td align=center>R\$\s*(?P<taxa>[\d.,]+)',
    flags=re.IGNORECASE,
)

cargos = []
for m in row_re.finditer(html):
    cargo_full = m.group("cargo").strip().rstrip(',').strip()
    codigo = ""
    titulo = cargo_full
    code_match = re.match(r'^(C[ÓO]D\s*\d+)\s*-\s*(.+)$', cargo_full, flags=re.IGNORECASE)
    if code_match:
        codigo = code_match.group(1).upper().replace("CÓD", "COD")
        titulo = code_match.group(2).strip()
    vagas_str = m.group("vagas")
    vagas = int(vagas_str) if vagas_str.isdigit() else 0
    # Compute PCD / Indigena (regra simulada)
    vagas_pcd = max(1, math.floor(vagas * 0.20)) if vagas >= 5 else (1 if vagas >= 3 else 0)
    vagas_ind = math.floor(vagas * 0.03) if vagas >= 30 else 0
    cargos.append({
        "codigo": codigo,
        "titulo": titulo,
        "jornada": (m.group("jornada") or "").strip(),
        "secretaria": (m.group("sec") or "").strip(),
        "remuneracao": "R$ " + m.group("remun"),
        "vagas": vagas,
        "vagasPCD": vagas_pcd,
        "vagasIndigenas": vagas_ind,
        "vagasPPP": 0,
        "cadastroReserva": 0,
        "taxa": "R$ " + m.group("taxa"),
    })

dst.write_text(json.dumps({"localidade": "CAMPINA GRANDE/PB", "cargos": cargos}, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"Cargos extraídos: {len(cargos)}")
print(f"Exemplo: {cargos[0] if cargos else 'NONE'}")
print(f"Salvo em: {dst}")
