# Migración del SPA: quitar el prefijo /gestion-vacaciones

Antes:

```
http://96.126.124.60/gestion-vacaciones/portal
http://96.126.124.60/gestion-vacaciones/login
http://96.126.124.60/gestion-vacaciones/permisos/gestion
```

Después:

```
http://96.126.124.60/portal
http://96.126.124.60/login
http://96.126.124.60/permisos/gestion
```

La base de datos no se toca. Solo cambian:

- `homepage` y `basename` del frontend React.
- Las rutas de los logos hardcodeadas en componentes.
- La URL por defecto del backend para enlaces en correos (`FRONTEND_URL`).
- La configuración de Apache (un cambio de `Alias` por `DocumentRoot`).

---

## Pasos en el servidor Linode (Apache)

> Si tu instalación está bajo otro path o sirvió el SPA con un alias, ajustá las rutas. Lo de abajo cubre el caso del repo: build copiada a `/var/www/html` (que es lo que indicaba `DEPLOYMENT_LINODE.md` originalmente).

### 1. Backup de la VirtualHost actual

```bash
sudo cp /etc/apache2/sites-available/gestor-vacaciones.conf \
        /etc/apache2/sites-available/gestor-vacaciones.conf.bak.$(date +%Y%m%d)
```

### 2. Pull del repo y rebuild

```bash
cd /var/www/gestor-vacaciones    # ajustá si tu clone está en otra ruta
git fetch origin && git checkout main && git pull origin main

cd frontend
npm install
npm run build

# Vacía el directorio servido por Apache y copia la nueva build:
sudo rm -rf /var/www/html/*
sudo cp -r build/* /var/www/html/
```

### 3. Actualizar `/etc/apache2/sites-available/gestor-vacaciones.conf`

Dejá la VirtualHost tal cual el `DEPLOYMENT_LINODE.md`, **agregando** el bloque de redirección para enlaces viejos:

```apache
<VirtualHost *:80>
    ServerAdmin admin@prayaga.biz
    ServerName 96.126.124.60

    DocumentRoot /var/www/html

    # Compatibilidad: si alguien entra por el path viejo, lo mandamos al nuevo
    RedirectMatch 301 ^/gestion-vacaciones$       /
    RedirectMatch 301 ^/gestion-vacaciones/(.*)$  /$1

    <Directory /var/www/html>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted

        # React Router - SPA en raíz
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>

    # Proxy para Backend API
    ProxyPreserveHost On
    ProxyPass        /api http://localhost:3002/api
    ProxyPassReverse /api http://localhost:3002/api

    ErrorLog ${APACHE_LOG_DIR}/gestor-vacaciones-error.log
    CustomLog ${APACHE_LOG_DIR}/gestor-vacaciones-access.log combined
</VirtualHost>
```

Si tu config actual tenía un `Alias /gestion-vacaciones ...`, **elimínalo**: ahora la build se sirve desde el `DocumentRoot`.

### 4. Variables de entorno del backend

Editá `/var/www/gestor-vacaciones/backend/.env` (o donde lo tengas):

```
FRONTEND_URL=http://96.126.124.60
FRONTEND_APP_URL=http://96.126.124.60
```

(Si antes tenías `FRONTEND_APP_URL=http://96.126.124.60/gestion-vacaciones`, sacale el sufijo.)

### 5. Recargar Apache y reiniciar Node

```bash
sudo apachectl configtest && sudo systemctl reload apache2

# Reiniciar el proceso Node como lo tengas montado, p. ej.:
pm2 restart gestor-api
# o:
sudo systemctl restart gestor-vacaciones-api
```

### 6. Verificación

- `http://96.126.124.60/` debería redirigir / cargar el portal (o el login si no hay sesión).
- `http://96.126.124.60/login`, `/portal`, `/control-proyectos` cargan normal.
- `http://96.126.124.60/gestion-vacaciones/portal` debería **redirigir** a `http://96.126.124.60/portal` (301).
- Los correos que se manden ahora apuntan a URLs sin `/gestion-vacaciones`.

### 7. Rollback rápido

```bash
sudo cp /etc/apache2/sites-available/gestor-vacaciones.conf.bak.YYYYMMDD \
        /etc/apache2/sites-available/gestor-vacaciones.conf
git checkout HEAD~1 -- frontend backend
cd frontend && npm run build
sudo rm -rf /var/www/html/* && sudo cp -r build/* /var/www/html/
sudo systemctl reload apache2
pm2 restart gestor-api
```
