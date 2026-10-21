# -*- coding: utf-8
"""Copia docs/manuales-usuario/*.md → frontend/public/manuales/ (portal web + PDF)."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "docs" / "manuales-usuario"
DST = ROOT / "frontend" / "public" / "manuales"

def main():
    DST.mkdir(parents=True, exist_ok=True)
    n = 0
    for path in sorted(SRC.glob("*.md")):
        if path.name.lower() == "readme.md":
            continue
        (DST / path.name).write_text(path.read_text(encoding="utf-8"), encoding="utf-8")
        print("OK", path.name)
        n += 1
    print(f"Sincronizados {n} manuales en {DST}")

if __name__ == "__main__":
    main()
