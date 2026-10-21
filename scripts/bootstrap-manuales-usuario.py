# -*- coding: utf-8 -*-
"""Copia manuales-portal a manuales-usuario con secciones formales para Word."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "docs" / "manuales-portal"
DST = ROOT / "docs" / "manuales-usuario"

SKIP = {"readme.md"}

PREFIJO = """## 1. Propósito del documento

Este manual describe el uso del módulo en el **Portal Prayaga Interno** (aplicación web de RRHH y operaciones). Está pensado para capacitación, auditoría y consulta fuera del sistema.

## 2. Antes de empezar

- Cuenta activa en el portal (correo corporativo y contraseña).
- Módulo visible en **Inicio** o enlace directo autorizado por administración.
- Si el módulo muestra **RESTRINGIDO**, solicite activación en **Administración de usuarios**.

---

"""

SUFIJO = """

---

## Soporte

Ante errores, indique: **módulo**, **acción**, **captura de pantalla** y **hora aproximada**. Contacte a administración del portal o TI interno.

*Documento alineado con la guía en pantalla «Ayuda del módulo».*
"""


PUBLIC_MANUALES = ROOT / "frontend" / "public" / "manuales"


def sync_to_public():
    """Copia .md al frontend para servir en /manuales/*.md"""
    PUBLIC_MANUALES.mkdir(parents=True, exist_ok=True)
    for path in sorted(DST.glob("*.md")):
        if path.name.lower() == "readme.md":
            continue
        dest = PUBLIC_MANUALES / path.name
        dest.write_text(path.read_text(encoding="utf-8"), encoding="utf-8")
        print("PUBLIC", dest.name)


def main():
    DST.mkdir(parents=True, exist_ok=True)
    for path in sorted(SRC.glob("*.md")):
        if path.name.lower() in SKIP:
            continue
        body = path.read_text(encoding="utf-8")
        if (DST / path.name).exists():
            continue
        out = PREFIJO + body.strip() + SUFIJO
        (DST / path.name).write_text(out, encoding="utf-8")
        print("OK", path.name)
    readme = DST / "README.md"
    readme.write_text(
        """# Manuales de usuario (exportación Word)

Contenido formal para entregar a colaboradores. No reemplaza la guía en pantalla del portal.

## Generar Word (.docx)

```bash
pip install python-docx
python scripts/generar-manuales-usuario-docx.py
```

Archivos en: `Downloads/Manuales-Portal-Prayaga/`

## Edición

- Un archivo `.md` por módulo.
- Tras editar, vuelva a ejecutar el script de generación.
""",
        encoding="utf-8",
    )
    sync_to_public()


if __name__ == "__main__":
    main()
