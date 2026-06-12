"""Replace href="#" in 'Inscrição On-line' button anchors with the inscription page URL."""
import re
import sys
from pathlib import Path

target_url = "/inscricao.html"

def patch(path):
    p = Path(path)
    html = p.read_text(encoding="utf-8")
    # Pattern: <a href=#><img ... alt="Inscrição On-line" ...></a>
    # We match the opening anchor that is immediately followed (anywhere before </a>) by an <img with that alt.
    # Use a non-greedy match up to </a>
    pattern = re.compile(
        r'<a\s+href=#>(\s*<img\b[^>]*?alt="Inscri[çc][aã]o\s*On-line"[^>]*?>\s*)</a>',
        flags=re.IGNORECASE,
    )
    new_html, n = pattern.subn(
        lambda m: f'<a href="{target_url}" data-testid="btn-inscricao-online">{m.group(1)}</a>',
        html,
    )
    p.write_text(new_html, encoding="utf-8")
    print(f"{path}: replaced {n} button(s)")

for f in sys.argv[1:]:
    patch(f)
