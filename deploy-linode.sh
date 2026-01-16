#!/bin/bash

###############################################################################
# Script de Deployment Automático para Linode/Akamai
# Gestor de Vacaciones - Prayaga
###############################################################################

set -e  # Exit on error

echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║   🚀  DEPLOYMENT AUTOMÁTICO - GESTOR DE VACACIONES         ║"
echo "║       Akamai Connected Cloud (Linode)                      ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para mensajes
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Verificar si se está ejecutando como root
if [ "$EUID" -ne 0 ]; then 
    print_error "Por favor ejecuta este script como root (sudo bash deploy-linode.sh)"
    exit 1
fi

print_info "Iniciando instalación..."
sleep 2

###############################################################################
# PASO 1: Actualizar Sistema
###############################################################################
echo ""
print_info "📦 PASO 1/8: Actualizando sistema..."
apt update -y && apt upgrade -y
print_success "Sistema actualizado"

###############################################################################
# PASO 2: Instalar Node.js
###############################################################################
echo ""
print_info "📦 PASO 2/8: Instalando Node.js 20 LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node_version=$(node -v)
print_success "Node.js instalado: $node_version"

###############################################################################
# PASO 3: Instalar Apache
###############################################################################
echo ""
print_info "📦 PASO 3/8: Instalando Apache..."
apt install -y apache2
systemctl start apache2
systemctl enable apache2
print_success "Apache instalado y habilitado"

###############################################################################
# PASO 4: Instalar MySQL
###############################################################################
echo ""
print_info "📦 PASO 4/8: Instalando MySQL..."
apt install -y mysql-server
systemctl start mysql
systemctl enable mysql
print_success "MySQL instalado y habilitado"

###############################################################################
# PASO 5: Instalar utilidades
###############################################################################
echo ""
print_info "📦 PASO 5/8: Instalando utilidades (PM2, Git)..."
npm install -g pm2
apt install -y git
print_success "Utilidades instaladas"

###############################################################################
# PASO 6: Configurar Apache
###############################################################################
echo ""
print_info "⚙️  PASO 6/8: Configurando módulos de Apache..."
a2enmod proxy
a2enmod proxy_http
a2enmod rewrite
a2enmod ssl
systemctl restart apache2
print_success "Módulos de Apache habilitados"

###############################################################################
# PASO 7: Configurar Firewall
###############################################################################
echo ""
print_info "🔒 PASO 7/8: Configurando firewall..."
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable
print_success "Firewall configurado"

###############################################################################
# PASO 8: Información final
###############################################################################
echo ""
print_info "📋 PASO 8/8: Resumen de instalación"
echo ""
echo "════════════════════════════════════════════════════════════"
print_success "Instalación base completada"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📊 SOFTWARE INSTALADO:"
echo "   • Node.js: $(node -v)"
echo "   • npm: $(npm -v)"
echo "   • Apache: $(apache2 -v | head -n 1)"
echo "   • MySQL: $(mysql --version)"
echo "   • PM2: $(pm2 -v)"
echo ""
echo "🔐 PRÓXIMOS PASOS MANUALES:"
echo ""
echo "1️⃣  CONFIGURAR MYSQL:"
echo "   $ mysql_secure_installation"
echo ""
echo "2️⃣  CREAR BASE DE DATOS:"
echo "   $ mysql -u root -p"
echo "   > CREATE DATABASE gestorvacaciones;"
echo "   > CREATE USER 'vacaciones_user'@'localhost' IDENTIFIED BY 'TuPassword';"
echo "   > GRANT ALL PRIVILEGES ON gestorvacaciones.* TO 'vacaciones_user'@'localhost';"
echo "   > FLUSH PRIVILEGES;"
echo "   > EXIT;"
echo ""
echo "3️⃣  CLONAR REPOSITORIO:"
echo "   $ cd /var/www"
echo "   $ git clone https://github.com/Nicolas0903/Gestion-de-Vacaciones.git"
echo ""
echo "4️⃣  VER GUÍA COMPLETA:"
echo "   📖 DEPLOYMENT_LINODE.md"
echo ""
echo "════════════════════════════════════════════════════════════"
print_success "¡Script completado! 🎉"
echo "════════════════════════════════════════════════════════════"
