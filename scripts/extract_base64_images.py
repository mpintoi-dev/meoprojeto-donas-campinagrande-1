"""Extract inline base64 images from an HTML file to separate files and replace
data URIs with relative paths. Drastically reduces HTML size and allows parallel
image downloads + browser caching + native lazy-loading."""
import base64
import hashlib
import re
import sys
from pathlib import Path

src = Path(sys.argv[1])
assets_dir = Path(sys.argv[2])
assets_url_prefix = sys.argv[3]  # e.g. "/assets"

assets_dir.mkdir(parents=True, exist_ok=True)
html = src.read_text(encoding="utf-8")

EXT_MAP = {
    "jpeg": "jpg", "jpg": "jpg", "png": "png",
    "webp": "webp", "gif": "gif", "svg+xml": "svg",
}

extracted = 0
total_bytes_in = 0

def replace_base64(match):
    global extracted, total_bytes_in
    mime_sub = match.group(1).lower()
    b64 = match.group(2)
    ext = EXT_MAP.get(mime_sub, "bin")
    try:
        raw = base64.b64decode(b64, validate=False)
    except Exception:
        return match.group(0)
    total_bytes_in += len(match.group(0))
    digest = hashlib.sha1(raw).hexdigest()[:16]
    fname = f"{digest}.{ext}"
    out_path = assets_dir / fname
    if not out_path.exists():
        out_path.write_bytes(raw)
    extracted += 1
    return f"{assets_url_prefix}/{fname}"

# Match data:image/<sub>;base64,<data>  inside src="..." or src=...
# Use a robust pattern that captures until quote or whitespace/>
pattern = re.compile(
    r'data:image/([a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)',
)
new_html = pattern.sub(replace_base64, html)

src.write_text(new_html, encoding="utf-8")

print(f"Extracted images: {extracted}")
print(f"Bytes of base64 (incl. prefix) replaced: {total_bytes_in}")
print(f"New HTML size: {src.stat().st_size} bytes")
print(f"Assets dir: {assets_dir}")
