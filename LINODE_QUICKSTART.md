# ⚡ INICIO RÁPIDO - LINODE DEPLOYMENT

## 📋 **RESUMEN EN 5 PASOS**

### **ANTES DE EMPEZAR:**
- ✅ Código ya está en GitHub: https://github.com/Nicolas0903/Gestion-de-Vacaciones
- ✅ Costo: $12 USD/mes (Linode Shared 2GB)
- ⏱️ Tiempo estimado: 30-45 minutos

---

## 🚀 **PASO 1: CREAR VPS EN LINODE** (5 minutos)

1. Ve a [linode.com](https://linode.com)
2. Sign Up → Verificar email → Agregar tarjeta
3. Dashboard → **Create** → **Linode**
4. Configuración:
   - **Distribución**: Ubuntu 22.04 LTS
   - **Región**: Dallas o Newark
   - **Plan**: Shared CPU - **Nanode 2GB** ($12/mes)
   - **Label**: `gestor-vacaciones`
   - **Root Password**: Crear una contraseña FUERTE (guárdala)
5. Click **Create Linode**
6. **COPIA LA IP PÚBLICA** (ej: 172.105.123.456)

---

## 🔐 **PASO 2: CONECTAR AL SERVIDOR** (2 minutos)

### Windows:
```powershell
ssh root@TU_IP_DE_LINODE
```

### Primera vez te preguntará:
```
Are you sure you want to continue connecting (yes/no)?
```
Escribe: `yes` y Enter

Ingresa la contraseña que creaste.

**✅ Estás dentro del servidor**

---

## 🛠️ **PASO 3: INSTALAR TODO AUTOMÁTICAMENTE** (10 minutos)

Copia y pega estos comandos uno por uno:

### **3.1 Descargar script de instalación:**
```bash
wget https://raw.githubusercontent.com/Nicolas0903/Gestion-de-Vacaciones/main/deploy-linode.sh
chmod +x deploy-linode.sh
```

### **3.2 Ejecutar instalación:**
```bash
./deploy-linode.sh
```

⏳ **Espera ~10 minutos** mientras instala todo.

---

## 🗄️ **PASO 4: CONFIGURAR BASE DE DATOS** (5 minutos)

### **4.1 Configuración segura de MySQL:**
```bash
mysql_secure_installation
```

**Respuestas:**
- VALIDATE PASSWORD: `N`
- Remove anonymous users: `Y`
- Disallow root login remotely: `Y`
- Remove test database: `Y`
- Reload privilege tables: `Y`

### **4.2 Crear base de datos:**
```bash
mysql -u root -p
```
*(Ingresa la password de root que acabas de crear)*

**Ejecuta estos comandos SQL:**
```sql
CREATE DATABASE gestorvacaciones CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'vacaciones_user'@'localhost' IDENTIFIED BY 'Prayaga2026!Seguro';
GRANT ALL PRIVILEGES ON gestorvacaciones.* TO 'vacaciones_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

✅ **Base de datos creada**

---

## 📦 **PASO 5: DESPLEGAR APLICACIÓN** (15 minutos)

### **5.1 Clonar repositorio:**
```bash
cd /var/www
git clone https://github.com/Nicolas0903/Gestion-de-Vacaciones.git
cd Gestion-de-Vacaciones
```

### **5.2 Configurar Backend:**
```bash
cd backend
npm install --production
```

**Crear archivo de configuración:**
```bash
nano .env
```

**Pega esto (EDITA con tu IP):**
```env
NODE_ENV=production
PORT=3002
DB_HOST=localhost
DB_PORT=3306
DB_USER=vacaciones_user
DB_PASSWORD=Prayaga2026!Seguro
DB_NAME=gestorvacaciones
JWT_SECRET=cambiar_por_algo_super_seguro_aleatorio_muy_largo_12345
FRONTEND_URL=http://TU_IP_DE_LINODE
```

**Guardar:** `Ctrl+O` → Enter → `Ctrl+X`

### **5.3 Cargar datos iniciales:**
```bash
mysql -u vacaciones_user -p gestorvacaciones < sql/schema.sql
```
*(Password: Prayaga2026!Seguro)*

### **5.4 Iniciar Backend:**
```bash
pm2 start src/index.js --name gestor-vacaciones
pm2 save
pm2 startup
# Copia y ejecuta el comando que te muestre
```

✅ **Backend corriendo**

### **5.5 Configurar Frontend:**
```bash
cd /var/www/Gestion-de-Vacaciones/frontend
```

**Crear configuración de producción:**
```bash
nano .env.production
```

**Contenido (EDITA con tu IP):**
```env
REACT_APP_API_URL=http://TU_IP_DE_LINODE/api
```

**Guardar:** `Ctrl+O` → Enter → `Ctrl+X`

### **5.6 Compilar Frontend:**
```bash
npm install
npm run build
```

⏳ **Espera ~3 minutos...**

### **5.7 Mover a Apache:**
```bash
rm -rf /var/www/html/*
cp -r build/* /var/www/html/
```

✅ **Frontend listo**

---

## ⚙️ **PASO 6: CONFIGURAR APACHE** (5 minutos)

### **6.1 Crear configuración:**
```bash
nano /etc/apache2/sites-available/gestor-vacaciones.conf
```

**Pega esto (EDITA con tu IP):**
```apache
<VirtualHost *:80>
    ServerAdmin admin@prayaga.biz
    ServerName TU_IP_DE_LINODE
    
    DocumentRoot /var/www/html
    
    <Directory /var/www/html>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
        
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>
    
    ProxyPreserveHost On
    ProxyPass /api http://localhost:3002/api
    ProxyPassReverse /api http://localhost:3002/api
    
    ErrorLog ${APACHE_LOG_DIR}/gestor-vacaciones-error.log
    CustomLog ${APACHE_LOG_DIR}/gestor-vacaciones-access.log combined
</VirtualHost>
```

**Guardar:** `Ctrl+O` → Enter → `Ctrl+X`

### **6.2 Activar configuración:**
```bash
a2dissite 000-default.conf
a2ensite gestor-vacaciones.conf
systemctl restart apache2
```

✅ **Apache configurado**

---

## 🎉 **PASO 7: PROBAR LA APLICACIÓN**

1. Abre tu navegador
2. Ve a: `http://TU_IP_DE_LINODE`
3. **Deberías ver la pantalla de LOGIN** 🎊

### **Credenciales de prueba:**
- **Email:** `admin@prayaga.com`
- **Password:** `admin123`

---

## ✅ **SI TODO FUNCIONA:**

**¡FELICIDADES! Tu aplicación está en producción** 🎉

**Acceso:**
- URL: `http://TU_IP_DE_LINODE`
- Desde oficina: Todos pueden acceder con esa IP
- Desde casa: También funciona
- Desde móvil: También funciona

---

## 🆘 **SI ALGO NO FUNCIONA:**

### **Ver logs del backend:**
```bash
pm2 logs gestor-vacaciones
```

### **Ver logs de Apache:**
```bash
tail -f /var/log/apache2/gestor-vacaciones-error.log
```

### **Verificar servicios:**
```bash
systemctl status apache2
systemctl status mysql
pm2 status
```

### **Probar backend directamente:**
```bash
curl http://localhost:3002/
```

---

## 📞 **COMANDOS ÚTILES:**

```bash
# Reiniciar servicios
systemctl restart apache2
pm2 restart gestor-vacaciones

# Ver estado
pm2 status
systemctl status apache2
systemctl status mysql

# Actualizar código
cd /var/www/Gestion-de-Vacaciones
git pull
cd backend && pm2 restart gestor-vacaciones
cd ../frontend && npm run build && cp -r build/* /var/www/html/
```

---

## 💰 **COSTO MENSUAL:**

- **Linode Shared 2GB**: $12 USD/mes
- **Backups automáticos** (opcional): +$2 USD/mes
- **Total**: ~$12-14 USD/mes

---

## 🎯 **SIGUIENTE PASO (OPCIONAL):**

Si tienes un dominio (ej: `vacaciones.prayaga.biz`):
- Configura SSL/HTTPS gratis con Let's Encrypt
- Ver guía completa: `DEPLOYMENT_LINODE.md` - Paso 8

---

## 📖 **DOCUMENTACIÓN COMPLETA:**

Para configuración avanzada, SSL, troubleshooting, etc.:
- **Ver:** `DEPLOYMENT_LINODE.md`

---

**¡Listo! Tu aplicación está en la nube y accesible 24/7** 🚀
