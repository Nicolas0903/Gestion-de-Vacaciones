# Manuales de usuario (exportación Word)

Contenido formal para entregar a colaboradores. No reemplaza la guía en pantalla del portal.

## Publicar en el portal (web + PDF)

Tras editar los `.md`, ejecute también la sincronización a `frontend/public/manuales/` (incluida en bootstrap). En cada módulo el usuario verá **Manual completo** y **PDF**.

```bash
python scripts/sync-manuales-public.py
```

(O `bootstrap-manuales-usuario.py` solo crea `.md` faltantes desde `manuales-portal`; no sobrescribe los ya editados.)

Al desplegar el frontend (`npm run build`), copie la carpeta `public/manuales` en el build.

## Generar Word (.docx)

```bash
pip install python-docx
python scripts/generar-manuales-usuario-docx.py
```

Archivos en: `Downloads/Manuales-Portal-Prayaga/`

## Edición

- Un archivo `.md` por módulo.
- Tras editar, vuelva a ejecutar el script de generación.
