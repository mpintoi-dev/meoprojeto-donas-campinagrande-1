"""Remove external links from the user's HTML file."""
import re
from pathlib import Path

SRC = Path("/app/uploaded/idecan.html")
DST = Path("/app/frontend/public/idecan.html")

html = SRC.read_text(encoding="utf-8", errors="ignore")

# Remove <link rel=...> tags that point to external URLs
# Matches <link ... href=...idecan.org.br...> or gmpg.org, etc.
html = re.sub(
    r'<link\b[^>]*href=(?:"[^"]*(?:gmpg\.org|idecan\.org\.br|wp-json|xmlrpc|w\.org)[^"]*"|(?:https?://)[^\s>]+)[^>]*>',
    '',
    html,
    flags=re.IGNORECASE,
)

# Neutralize all href links that point to external URLs (http/https)
# 1. quoted form: href="https://..."  -> href="#"
html = re.sub(r'href="https?://[^"]*"', 'href="#"', html, flags=re.IGNORECASE)
# 2. unquoted form: href=https://...
html = re.sub(r'href=https?://[^\s>]+', 'href="#"', html, flags=re.IGNORECASE)

# Remove src attributes pointing to external URLs (if any)
html = re.sub(r'src="https?://[^"]*"', 'src=""', html, flags=re.IGNORECASE)
html = re.sub(r'src=https?://[^\s>]+', 'src=""', html, flags=re.IGNORECASE)

# Remove action attributes pointing to external URLs (forms)
html = re.sub(r'action="https?://[^"]*"', 'action="#"', html, flags=re.IGNORECASE)
html = re.sub(r'action=https?://[^\s>]+', 'action="#"', html, flags=re.IGNORECASE)

DST.parent.mkdir(parents=True, exist_ok=True)
DST.write_text(html, encoding="utf-8")

print(f"Original size: {SRC.stat().st_size} bytes")
print(f"Cleaned size:  {DST.stat().st_size} bytes")
print(f"Saved to: {DST}")
