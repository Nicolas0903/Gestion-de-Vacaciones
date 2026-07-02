#!/usr/bin/env bash
# Verifica que el backend exponga las rutas de Rendición de Presupuesto.
set -euo pipefail

BASE="${1:-http://localhost:3002/api}"

echo "=== Health ==="
curl -sf "$BASE/health" | head -c 500
echo ""
echo ""

echo "=== Ping rendiciones (debe ser 200) ==="
HTTP=$(curl -s -o /tmp/rdp-ping.json -w "%{http_code}" "$BASE/rendiciones-presupuesto/ping")
echo "HTTP $HTTP"
cat /tmp/rdp-ping.json
echo ""
echo ""

if [ "$HTTP" != "200" ]; then
  echo "ERROR: El backend NO tiene el módulo rendiciones-presupuesto."
  echo "Ejecute: cd /var/www/gestion-vacaciones && git pull && cd backend && pm2 restart gestor-vacaciones-backend"
  exit 1
fi

echo "OK: API de rendición disponible en $BASE/rendiciones-presupuesto"
