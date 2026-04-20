"""
WeasyPrint で output/health-check-mockup-2.html を PDF にする例。

  pip install weasyprint
  python scripts/render_health_mockup2_pdf.py

出力: output/health-check-mockup-2.pdf
"""
from pathlib import Path

try:
    from weasyprint import HTML
except ImportError as e:
    raise SystemExit("WeasyPrint が未インストールです: pip install weasyprint") from e

ROOT = Path(__file__).resolve().parents[1]
html_path = ROOT / "output" / "health-check-mockup-2.html"
pdf_path = ROOT / "output" / "health-check-mockup-2.pdf"

if not html_path.is_file():
    raise SystemExit(f"見つかりません: {html_path}")

HTML(filename=str(html_path)).write_pdf(str(pdf_path))
print(f"Wrote {pdf_path}")
