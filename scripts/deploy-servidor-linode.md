# Subida al servidor (Linode) — guías + rendición presupuesto

IP documentada: **96.126.124.60** · dominio: **vacaciones.prayaga.biz**  
Frontend: `/var/www/html` · Backend: PM2 `gestor-vacaciones-backend` (puerto **3002**)

## 0. Código en GitHub (obligatorio para backend)

El servidor suele hacer `git pull`. Sube antes tu rama o merge a `main`:

```powershell
# En tu PC (PowerShell), desde la raíz del repo
git add backend frontend docs scripts
git status
git commit -m "Guías por módulo, manuales y solicitud de presupuesto en rendición"
git push origin HEAD:main
```

(Ajusta archivos si no quieres subir `.tmp-msapp-analisis` ni zips.)

## 1. Frontend (build en PC → zip → servidor)

En PC (ya generado con `npm run build` en `frontend/`):

```powershell
cd c:\Users\Nicolas\gestor-vacaciones\frontend\build
Compress-Archive -Path * -DestinationPath ..\..\frontend-build-portal-guias.zip -Force
```

Subir y desplegar:

```powershell
scp c:\Users\Nicolas\gestor-vacaciones\frontend-build-portal-guias.zip root@96.126.124.60:/tmp/
```

En el **servidor** (SSH):

```bash
rm -rf /var/www/html/*
unzip -o /tmp/frontend-build-portal-guias.zip -d /var/www/html/
chmod -R a+rX /var/www/html
test -f /var/www/html/manuales/portal-general.md && echo "Manuales OK" || echo "FALTA manuales/"
test -f /var/www/html/index.html && echo "index OK"
```

Verificar en navegador: `https://vacaciones.prayaga.biz/manuales/portal-general.md` (debe devolver markdown).

## 2. Backend

Ruta típica (confirmar en el servidor con `pm2 show gestor-vacaciones-backend`):

```bash
cd /var/www/Gestion-de-Vacaciones   # o /var/www/gestion-vacaciones
git pull origin main
cd backend
npm install --production
pm2 restart gestor-vacaciones-backend
pm2 logs gestor-vacaciones-backend --lines 30
```

Health: `curl -s http://127.0.0.1:3002/api/health`

## 3. Base de datos — solicitudes de presupuesto

En el servidor, con credenciales del `.env` del backend:

```bash
cd /var/www/Gestion-de-Vacaciones/backend
node scripts/run-solicitudes-presupuesto-migration.js
```

Si la tabla `rendiciones_presupuesto` ya existe en producción, el script añade la columna `solicitud_presupuesto_id`.  
Si nunca existió rendiciones en esa BD, aplicar antes `sql/rendiciones_presupuesto.sql` con mysql.

Comprobar:

```bash
mysql -u vacaciones_user -p gestorvacaciones -e "SHOW TABLES LIKE 'solicitudes_presupuesto';"
```

## 4. Smoke test

1. Login portal.
2. Inicio → expandir **Guía de uso** → **Manual completo** / PDF.
3. Rendición presupuesto → pestaña solicitud → enviar (Magali recibe correo si SMTP OK).
4. Gestión → pestaña solicitudes presupuesto.

## 5. Si algo falla

- **Manual no carga:** falta carpeta `manuales` en `/var/www/html` → repetir paso 1.
- **502 / login:** `pm2 status`, logs backend, Apache proxy `/api`.
- **Error al rendir:** migración BD no corrida o solicitud no aprobada.
