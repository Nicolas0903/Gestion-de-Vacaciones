#!/bin/bash
# Restaura /var/www/html cuando quedó vacío (404 Not Found).
# Uso en el servidor después de subir frontend-build-restore.zip:
#   unzip -o /tmp/frontend-build-restore.zip -d /var/www/html/
#   chmod -R a+rX /var/www/html
#   ls -la /var/www/html/index.html

set -e
HTML="/var/www/html"
ZIP="${1:-/tmp/frontend-build-restore.zip}"

if [ ! -f "$ZIP" ]; then
  echo "No existe $ZIP"
  echo "Sube el zip desde tu PC: scp frontend-build-restore.zip root@96.126.124.60:/tmp/"
  exit 1
fi

mkdir -p "$HTML"
rm -rf "${HTML:?}"/*
unzip -o "$ZIP" -d "$HTML"
chmod -R a+rX "$HTML"

if [ -f "$HTML/index.html" ]; then
  echo "OK: index.html restaurado en $HTML"
  ls -la "$HTML/index.html"
else
  echo "ERROR: falta index.html tras descomprimir"
  exit 1
fi

cd /var/www/gestion-vacaciones/backend 2>/dev/null && pm2 restart gestor-vacaciones-backend || true
echo "Listo. Abre http://96.126.124.60/"
