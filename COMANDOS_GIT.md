# 📦 Comandos Git para Subir a GitHub

## ✅ PASO 1: Verificar Git instalado

```bash
git --version
```

Si no tienes Git, descárgalo de: https://git-scm.com/downloads

---

## ✅ PASO 2: Inicializar repositorio

```bash
# Desde la carpeta raíz: gestor-vacaciones/
git init
```

---

## ✅ PASO 3: Agregar todos los archivos

```bash
git add .
```

---

## ✅ PASO 4: Hacer commit inicial

```bash
git commit -m "Initial commit - Gestor de Vacaciones Prayaga"
```

---

## ✅ PASO 5: Crear repositorio en GitHub

1. Ve a [github.com](https://github.com)
2. Login con tu cuenta
3. Click en el **+** (arriba derecha) → "New repository"
4. Configuración:
   - **Repository name**: `gestor-vacaciones-prayaga`
   - **Description**: Sistema de gestión de vacaciones para Prayaga
   - **Visibility**: 
     - ✅ **Private** (recomendado - solo tú lo ves)
     - ⚠️ Public (cualquiera puede verlo)
   - **NO MARCAR** "Initialize this repository with a README"
   - **NO MARCAR** "Add .gitignore"
   - **NO MARCAR** "Choose a license"
5. Click "Create repository"

---

## ✅ PASO 6: Conectar con GitHub

GitHub te mostrará comandos. Usa estos (reemplaza TU_USUARIO con tu usuario):

```bash
git remote add origin https://github.com/TU_USUARIO/gestor-vacaciones-prayaga.git
git branch -M main
git push -u origin main
```

---

## 🔑 AUTENTICACIÓN

### Opción A: HTTPS (Recomendado)

GitHub ya NO acepta contraseñas. Usa un **Personal Access Token**:

1. GitHub → Settings (tu perfil)
2. Developer settings (abajo a la izquierda)
3. Personal access tokens → Tokens (classic)
4. Generate new token (classic)
5. Configuración:
   - **Note**: "Gestor Vacaciones Deploy"
   - **Expiration**: 90 días (o más)
   - **Scopes**: Marcar `repo` (acceso completo a repositorios)
6. Generate token
7. **COPIAR EL TOKEN** (solo se muestra una vez)

Cuando te pida password en git push, usa el TOKEN (no tu contraseña).

### Opción B: SSH (Avanzado)

Si prefieres SSH:

```bash
# Generar llave SSH
ssh-keygen -t ed25519 -C "tu-email@example.com"

# Copiar llave pública
cat ~/.ssh/id_ed25519.pub

# Agregar en GitHub → Settings → SSH and GPG keys → New SSH key
```

---

## ✅ PASO 7: Verificar subida

```bash
# Ver remotes configurados
git remote -v

# Ver status
git status
```

Luego ve a tu repositorio en GitHub y verifica que los archivos estén ahí ✅

---

## 🔄 COMANDOS ÚTILES PARA EL FUTURO

### Subir cambios nuevos:

```bash
git add .
git commit -m "Descripción de los cambios"
git push origin main
```

### Ver historial:

```bash
git log --oneline
```

### Descargar cambios (si trabajas desde otra PC):

```bash
git pull origin main
```

### Ver estado actual:

```bash
git status
```

---

## ⚠️ PROBLEMAS COMUNES

### Error: "remote origin already exists"

```bash
git remote remove origin
git remote add origin https://github.com/TU_USUARIO/gestor-vacaciones-prayaga.git
```

### Error: "failed to push some refs"

```bash
git pull origin main --rebase
git push origin main
```

### Error: Authentication failed

- Asegúrate de usar el **Personal Access Token** como password
- NO uses tu contraseña de GitHub

---

## 📋 CHECKLIST FINAL

Antes de continuar con el deployment:

- ✅ Repositorio creado en GitHub
- ✅ Código subido (ver archivos en github.com)
- ✅ Archivo `.gitignore` funciona (no debería haber node_modules/ ni .env)
- ✅ README.md visible en GitHub
- ✅ Guías de deployment incluidas

---

**👉 Siguiente paso:** Continuar con `DEPLOY_GUIDE.md` para deployment en Render
