"""Clean external links from an HTML file and save it under public/."""
import re
import sys
from pathlib import Path

src = Path(sys.argv[1])
dst = Path(sys.argv[2])

html = src.read_text(encoding="utf-8", errors="ignore")

# Remove external <link> tags
html = re.sub(
    r'<link\b[^>]*href=(?:"[^"]*(?:gmpg\.org|idecan\.org\.br|wp-json|xmlrpc|w\.org)[^"]*"|(?:https?://)[^\s>]+)[^>]*>',
    '',
    html,
    flags=re.IGNORECASE,
)

# Neutralize all external href/src/action
html = re.sub(r'href="https?://[^"]*"', 'href="#"', html, flags=re.IGNORECASE)
html = re.sub(r'href=https?://[^\s>]+', 'href="#"', html, flags=re.IGNORECASE)
html = re.sub(r'src="https?://[^"]*"', 'src=""', html, flags=re.IGNORECASE)
html = re.sub(r'src=https?://[^\s>]+', 'src=""', html, flags=re.IGNORECASE)
html = re.sub(r'action="https?://[^"]*"', 'action="#"', html, flags=re.IGNORECASE)
html = re.sub(r'action=https?://[^\s>]+', 'action="#"', html, flags=re.IGNORECASE)

dst.parent.mkdir(parents=True, exist_ok=True)
dst.write_text(html, encoding="utf-8")
print(f"OK | {src.stat().st_size} -> {dst.stat().st_size} bytes")
