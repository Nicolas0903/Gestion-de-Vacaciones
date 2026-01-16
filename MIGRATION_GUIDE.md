# 🔄 Guía de Migración: MySQL → PostgreSQL

## 📌 ¿Por qué migrar?

Tu aplicación actualmente usa **MySQL** en desarrollo local, pero **Render.com Free** solo soporta **PostgreSQL**.

---

## 🎯 OPCIÓN 1: Usar PostgreSQL en Producción (Recomendado)

### Ventajas:
- ✅ **Completamente GRATIS** para siempre
- ✅ Render maneja backups automáticos
- ✅ No requiere tarjeta de crédito

### Desventajas:
- ⚠️ Necesitas ejecutar un script de migración
- ⚠️ Tendrás que re-crear tus usuarios y datos en producción

---

## 🛠️ **PASO A PASO: MIGRAR A POSTGRESQL**

### **PASO 1: Crear Base de Datos en Render**

1. Ve a [dashboard.render.com](https://dashboard.render.com)
2. Click "New +" → "PostgreSQL"
3. Configuración:
   - **Name**: `gestor-vacaciones-db`
   - **Database**: `gestor_vacaciones`
   - **Region**: `Oregon (West US)`
   - **PostgreSQL Version**: `16`
   - **Plan**: **Free** ✅
4. Click "Create Database"

### **PASO 2: Obtener Credenciales**

Una vez creada, Render te mostrará:

```
Internal Database URL:
postgres://gestor_vacaciones_user:xxxxx@dpg-xxxxx-a.oregon-postgres.render.com/gestor_vacaciones
```

**Guarda esta información:**
- **Host**: `dpg-xxxxx-a.oregon-postgres.render.com`
- **Port**: `5432`
- **Database**: `gestor_vacaciones`
- **Username**: `gestor_vacaciones_user`
- **Password**: `xxxxxxxxxxxxxxxx`

### **PASO 3: Conectar a la Base de Datos**

**Opción A: Desde línea de comandos (PostgreSQL instalado)**

```bash
# Descargar PostgreSQL: https://www.postgresql.org/download/

# Conectar (reemplaza con tus valores)
psql -h dpg-xxxxx-a.oregon-postgres.render.com \
     -U gestor_vacaciones_user \
     -d gestor_vacaciones
```

**Opción B: Desde Render Dashboard (más fácil)**

1. En tu base de datos → Tab "Shell"
2. Se abrirá una terminal web
3. Ya estás conectado ✅

### **PASO 4: Ejecutar Schema**

Copia TODO el contenido del archivo `backend/sql/schema-postgresql.sql` y pégalo en la terminal.

Deberías ver algo como:

```
CREATE TABLE
CREATE TABLE
CREATE TABLE
...
INSERT 0 11
INSERT 0 1
```

✅ **¡Listo!** Tu base de datos está configurada.

### **PASO 5: Verificar Instalación**

Ejecuta en la terminal PostgreSQL:

```sql
-- Ver tablas creadas
\dt

-- Ver roles insertados
SELECT * FROM roles;

-- Ver usuario admin
SELECT nombres, apellidos, email FROM empleados;
```

Deberías ver:
- 6 tablas creadas
- 11 roles insertados
- 1 empleado (Admin Sistema)

---

## 📊 **DIFERENCIAS: MySQL vs PostgreSQL**

| Característica | MySQL | PostgreSQL |
|----------------|-------|------------|
| AUTO_INCREMENT | ✅ | `SERIAL` ✅ |
| BOOLEAN | `TINYINT(1)` | `BOOLEAN` ✅ |
| DATETIME | `DATETIME` | `TIMESTAMP` ✅ |
| NOW() | `NOW()` | `CURRENT_TIMESTAMP` ✅ |
| Generadas | `GENERATED ALWAYS` ✅ | `GENERATED ALWAYS` ✅ |

**Buena noticia:** Las diferencias ya están manejadas en `schema-postgresql.sql` ✅

---

## 🔄 **MIGRAR DATOS EXISTENTES**

Si ya tienes usuarios y vacaciones en tu MySQL local y quieres pasarlos a producción:

### **OPCIÓN A: Exportar/Importar Manual (Pequeña cantidad de datos)**

```bash
# 1. Exportar de MySQL (local)
mysqldump -u root -p gestor_vacaciones > backup.sql

# 2. Convertir a PostgreSQL
# (Requiere herramientas como pgloader o conversión manual)

# 3. Importar a PostgreSQL (Render)
psql -h tu-host.render.com -U user -d db < backup_convertido.sql
```

### **OPCIÓN B: Re-crear Usuarios en Producción (Recomendado)**

Usa tus scripts existentes (`crear-*.js`, `actualizar-*.js`) pero **modificados** para PostgreSQL:

1. Cambia `mysql2` por `pg` en los scripts
2. Ajusta sintaxis de queries (ejemplo: `?` → `$1, $2, $3`)
3. Ejecuta los scripts contra la DB de Render

**Ejemplo de cambio:**

```javascript
// Antes (MySQL)
const mysql = require('mysql2/promise');
const [result] = await pool.execute(
  'INSERT INTO empleados (nombres, apellidos) VALUES (?, ?)',
  ['Juan', 'Perez']
);

// Después (PostgreSQL)
const { Pool } = require('pg');
const result = await pool.query(
  'INSERT INTO empleados (nombres, apellidos) VALUES ($1, $2) RETURNING id',
  ['Juan', 'Perez']
);
```

---

## 🎯 **OPCIÓN 2: Mantener MySQL (Pago)**

Si prefieres NO migrar a PostgreSQL, puedes usar:

### **A) Railway.app** ($5-10/mes)
- ✅ Soporta MySQL nativo
- ✅ Muy fácil de configurar
- ✅ Incluye backend + DB

**Pasos:**
1. [railway.app](https://railway.app) → New Project
2. Deploy from GitHub repo
3. Add MySQL database
4. Configurar variables de entorno
5. Listo ✅

### **B) PlanetScale** (Gratis limitado, luego $29/mes)
- ✅ MySQL serverless
- ✅ 5GB storage gratis
- ⚠️ Solo 1 database en plan free

### **C) Clever Cloud** (€4/mes)
- ✅ Soporta MySQL
- ✅ Servidores en Europa

---

## ❓ **¿QUÉ OPCIÓN ELEGIR?**

| Situación | Recomendación |
|-----------|---------------|
| **Presupuesto $0** | PostgreSQL en Render ⭐ |
| **Ya tienes muchos datos** | Railway + MySQL ($5-10/mes) |
| **Quieres máxima facilidad** | Railway |
| **Necesitas compatibilidad** | Mantener MySQL en Railway |

---

## 🆘 **¿NECESITAS AYUDA?**

Si tienes problemas con:
- Ejecutar el schema
- Convertir scripts de datos
- Conectar desde tu PC

Avísame y te ayudo paso a paso ✅

---

**👉 Siguiente:** Una vez migrada la DB, continúa con `DEPLOY_GUIDE.md` - Paso 4
