# 🌐 Deployment en Akamai Connected Cloud (Linode)

## 📋 **RESUMEN**

Desplegar la aplicación Gestor de Vacaciones en un VPS de Linode con:
- Apache como servidor web y reverse proxy
- Node.js para el backend API
- MySQL para la base de datos
- PM2 para mantener Node.js corriendo
- SSL/HTTPS opcional (con Let's Encrypt)

---

## 💰 **COSTO MENSUAL**

- **Plan Recomendado**: Shared 2GB - **$12 USD/mes**
- Incluye: 2GB RAM, 1 CPU, 50GB Storage, 2TB Transferencia

---

## 🎯 **PASO 1: CREAR VPS EN LINODE**

### **1.1 Crear cuenta**
1. Ve a [linode.com](https://linode.com) o [akamai.com/products/cloud-computing](https://www.akamai.com/products/cloud-computing)
2. Sign Up / Crear cuenta
3. Verificar email
4. Agregar método de pago

### **1.2 Crear Linode (VPS)**

1. Dashboard → **Create** → **Linode**

2. **Distribución**: Ubuntu 22.04 LTS ⭐

3. **Región**: 
   - América: Dallas, Atlanta, Newark
   - Recomendado: **Dallas** (más cercano a Perú)

4. **Plan**: **Shared CPU - Nanode 2GB** ($12/mes)

5. **Label**: `gestor-vacaciones-prayaga`

6. **Root Password**: 
   - Crear una contraseña FUERTE
   - Guárdala en lugar seguro
   - Ejemplo: `Prayaga2026!VacacionesSeguras#`

7. Click **Create Linode**

8. **Espera ~1 minuto** mientras se aprovisiona

9. **Copia la IP pública** que aparece (ej: `172.105.XXX.XXX`)

---

## 🔐 **PASO 2: CONECTAR AL SERVIDOR**

### **Desde Windows:**

**Opción A: PowerShell/CMD**
```bash
ssh root@TU_IP_DE_LINODE
# Ejemplo: ssh root@172.105.123.456
```

**Opción B: PuTTY**
- Descargar PuTTY: https://www.putty.org/
- Host Name: Tu IP de Linode
- Port: 22
- Connection type: SSH
- Click Open
- User: `root`
- Password: (la que creaste)

---

## 🛠️ **PASO 3: INSTALACIÓN AUTOMÁTICA**

Una vez conectado al servidor por SSH, ejecuta estos comandos:

### **3.1 Actualizar sistema**
```bash
apt update && apt upgrade -y
```

### **3.2 Instalar dependencias**
```bash
# Instalar Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Instalar Apache
apt install -y apache2

# Instalar MySQL
apt install -y mysql-server

# Instalar PM2 (Process Manager)
npm install -g pm2

# Instalar Git
apt install -y git

# Habilitar módulos de Apache
a2enmod proxy
a2enmod proxy_http
a2enmod rewrite
a2enmod ssl
systemctl restart apache2
```

### **3.3 Configurar MySQL**
```bash
# Ejecutar configuración segura
mysql_secure_installation
```

**Responde:**
- VALIDATE PASSWORD COMPONENT: `N` (No por ahora)
- Remove anonymous users: `Y`
- Disallow root login remotely: `Y`
- Remove test database: `Y`
- Reload privilege tables: `Y`

**Crear base de datos:**
```bash
mysql -u root -p
```

```sql
CREATE DATABASE gestorvacaciones CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'vacaciones_user'@'localhost' IDENTIFIED BY 'TuPasswordSeguro123!';
GRANT ALL PRIVILEGES ON gestorvacaciones.* TO 'vacaciones_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## 📦 **PASO 4: CLONAR Y CONFIGURAR APLICACIÓN**

### **4.1 Clonar repositorio**
```bash
cd /var/www
git clone https://github.com/Nicolas0903/Gestion-de-Vacaciones.git
cd Gestion-de-Vacaciones
```

### **4.2 Configurar Backend**
```bash
cd backend

# Instalar dependencias
npm install --production

# Crear archivo .env
nano .env
```

**Contenido del .env:**
```env
NODE_ENV=production
PORT=3002

# Base de Datos
DB_HOST=localhost
DB_PORT=3306
DB_USER=vacaciones_user
DB_PASSWORD=TuPasswordSeguro123!
DB_NAME=gestorvacaciones

# JWT
JWT_SECRET=tu_secreto_super_seguro_cambia_esto_por_algo_aleatorio_largo

# Frontend URL (actualizar después con tu dominio/IP)
FRONTEND_URL=http://TU_IP_DE_LINODE
```

**Guardar:** `Ctrl+O`, Enter, `Ctrl+X`

### **4.3 Cargar Schema de Base de Datos**
```bash
mysql -u vacaciones_user -p gestorvacaciones < sql/schema.sql
```

### **4.4 Iniciar Backend con PM2**
```bash
pm2 start src/index.js --name gestor-vacaciones-backend
pm2 save
pm2 startup
# Ejecuta el comando que te muestre
```

### **4.5 Verificar Backend**
```bash
pm2 status
curl http://localhost:3002/
```

Deberías ver: `{"mensaje": "Gestor de Vacaciones API - Prayaga"...}`

---

## 🎨 **PASO 5: CONFIGURAR FRONTEND**

### **5.1 Preparar Frontend**
```bash
cd /var/www/Gestion-de-Vacaciones/frontend

# Crear .env para producción
nano .env.production
```

**Contenido:**
```env
REACT_APP_API_URL=http://TU_IP_DE_LINODE/api
```

### **5.2 Instalar y Build**
```bash
npm install
npm run build
```

### **5.3 Mover build a Apache**
```bash
rm -rf /var/www/html/*
cp -r build/* /var/www/html/
```

---

## ⚙️ **PASO 6: CONFIGURAR APACHE**

### **6.1 Crear configuración**
```bash
nano /etc/apache2/sites-available/gestor-vacaciones.conf
```

**Contenido:**
```apache
<VirtualHost *:80>
    ServerAdmin admin@prayaga.biz
    ServerName TU_IP_DE_LINODE
    # Si tienes dominio: ServerName vacaciones.prayaga.biz
    
    DocumentRoot /var/www/html
    
    <Directory /var/www/html>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
        
        # React Router - SPA
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>
    
    # Proxy para Backend API
    ProxyPreserveHost On
    ProxyPass /api http://localhost:3002/api
    ProxyPassReverse /api http://localhost:3002/api
    
    # Logs
    ErrorLog ${APACHE_LOG_DIR}/gestor-vacaciones-error.log
    CustomLog ${APACHE_LOG_DIR}/gestor-vacaciones-access.log combined
</VirtualHost>
```

### **6.2 Activar sitio**
```bash
a2dissite 000-default.conf
a2ensite gestor-vacaciones.conf
systemctl restart apache2
```

### **6.3 Configurar Firewall**
```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

---

## ✅ **PASO 7: PROBAR LA APLICACIÓN**

1. Abre tu navegador
2. Ve a: `http://TU_IP_DE_LINODE`
3. Deberías ver la pantalla de login
4. Prueba login:
   - Email: `admin@prayaga.com`
   - Password: `admin123`

**¡Si funciona, FELICIDADES! 🎉**

---

## 🔒 **PASO 8 (OPCIONAL): CONFIGURAR SSL/HTTPS**

Si tienes un dominio (ej: `vacaciones.prayaga.biz`):

### **8.1 Apuntar dominio a Linode**

En tu proveedor de dominios, crea un registro A:
```
Type: A
Host: vacaciones
Value: TU_IP_DE_LINODE
TTL: 300
```

### **8.2 Instalar Certbot (Let's Encrypt)**
```bash
apt install -y certbot python3-certbot-apache
```

### **8.3 Obtener certificado SSL**
```bash
certbot --apache -d vacaciones.prayaga.biz
```

**Responde:**
- Email: tu-email@prayaga.biz
- Términos: `Y`
- Newsletter: `N`
- Redirect HTTP to HTTPS: `2` (Yes)

**Renovación automática:**
```bash
certbot renew --dry-run
```

---

## 🔄 **ACTUALIZACIONES FUTURAS**

Cuando hagas cambios en tu código:

### **Actualizar Backend:**
```bash
cd /var/www/Gestion-de-Vacaciones
git pull origin main
cd backend
npm install
pm2 restart gestor-vacaciones-backend
```

### **Actualizar Frontend:**
```bash
cd /var/www/Gestion-de-Vacaciones/frontend
git pull origin main
npm install
npm run build
rm -rf /var/www/html/*
cp -r build/* /var/www/html/
```

---

## 📊 **COMANDOS ÚTILES**

```bash
# Ver logs del backend
pm2 logs gestor-vacaciones-backend

# Ver estado de servicios
systemctl status apache2
systemctl status mysql
pm2 status

# Reiniciar servicios
systemctl restart apache2
pm2 restart gestor-vacaciones-backend
systemctl restart mysql

# Ver logs de Apache
tail -f /var/log/apache2/gestor-vacaciones-error.log

# Monitorear servidor
htop
df -h
free -m
```

---

## 🆘 **PROBLEMAS COMUNES**

### **Error: Cannot connect to database**
```bash
# Verificar MySQL
systemctl status mysql
mysql -u vacaciones_user -p gestorvacaciones

# Verificar credenciales en .env
nano /var/www/Gestion-de-Vacaciones/backend/.env
```

### **Error: Backend no responde**
```bash
# Ver logs
pm2 logs gestor-vacaciones-backend

# Reiniciar
pm2 restart gestor-vacaciones-backend
```

### **Error: Frontend muestra página en blanco**
```bash
# Verificar archivos
ls -la /var/www/html/

# Ver logs de Apache
tail -f /var/log/apache2/gestor-vacaciones-error.log

# Verificar .env.production del frontend
cat /var/www/Gestion-de-Vacaciones/frontend/.env.production
```

---

## 📞 **RESUMEN DE ACCESO**

Una vez completado:

- **URL**: `http://TU_IP_DE_LINODE` o `https://vacaciones.prayaga.biz`
- **SSH**: `ssh root@TU_IP_DE_LINODE`
- **Costo**: $12/mes
- **Siempre activo**: ✅
- **Acceso global**: ✅

---

## ✨ **VENTAJAS DE ESTA CONFIGURACIÓN**

✅ **Control total** del servidor
✅ **No duerme** - siempre disponible 24/7
✅ **Rendimiento constante**
✅ **Acceso desde cualquier lugar** (oficina, casa, móvil)
✅ **SSL/HTTPS gratis** con Let's Encrypt
✅ **Escalable** - puedes aumentar recursos cuando quieras
✅ **Backups** - Linode ofrece backups automáticos ($2/mes extra)

---

**¡Tu aplicación estará en producción de manera profesional!** 🚀
