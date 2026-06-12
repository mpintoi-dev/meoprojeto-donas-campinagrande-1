"""Extract inline base64 fonts (woff/woff2) from an HTML file's @font-face rules
to separate files in the assets dir, and replace the data URIs with relative URLs."""
import base64
import hashlib
import re
import sys
from pathlib import Path

src = Path(sys.argv[1])
assets_dir = Path(sys.argv[2])
assets_url_prefix = sys.argv[3]

assets_dir.mkdir(parents=True, exist_ok=True)
html = src.read_text(encoding="utf-8")

EXT_MAP = {"woff2": "woff2", "woff": "woff", "otf": "otf", "ttf": "ttf"}

extracted = 0
bytes_in = 0

def repl(match):
    global extracted, bytes_in
    mime_sub = match.group(1).lower()
    b64 = match.group(2)
    ext = EXT_MAP.get(mime_sub, "bin")
    try:
        raw = base64.b64decode(b64, validate=False)
    except Exception:
        return match.group(0)
    bytes_in += len(match.group(0))
    digest = hashlib.sha1(raw).hexdigest()[:16]
    fname = f"{digest}.{ext}"
    out_path = assets_dir / fname
    if not out_path.exists():
        out_path.write_bytes(raw)
    extracted += 1
    return f"{assets_url_prefix}/{fname}"

# data:font/woff2;base64,... or data:application/font-woff2;base64,...
pattern = re.compile(
    r'data:(?:font/|application/(?:x-)?font-)([a-zA-Z0-9+-]+);base64,([A-Za-z0-9+/=]+)',
)
new_html = pattern.sub(repl, html)
src.write_text(new_html, encoding="utf-8")
print(f"Extracted fonts: {extracted}")
print(f"Bytes replaced: {bytes_in}")
print(f"New HTML size: {src.stat().st_size} bytes")
