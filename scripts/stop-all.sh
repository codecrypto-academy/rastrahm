#!/bin/bash

# Script para detener todos los servicios del proyecto

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Deteniendo Todos los Servicios${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Función para matar procesos en un puerto
kill_port() {
    local port=$1
    local pid=$(lsof -ti:$port 2>/dev/null || true)
    if [ -n "$pid" ]; then
        echo -e "${YELLOW}Deteniendo proceso en puerto ${port} (PID: ${pid})...${NC}"
        kill -9 $pid 2>/dev/null || true
        echo -e "${GREEN}✓ Puerto ${port} liberado${NC}"
    else
        echo -e "${YELLOW}No hay proceso en puerto ${port}${NC}"
    fi
}

# Detener servicios
kill_port 8545  # Anvil
kill_port 3000  # Pasarela de Pago
kill_port 3001  # Compra de EuroToken
kill_port 3002  # ABM E-commerce
kill_port 3003  # Tienda Online

echo ""
echo -e "${YELLOW}Limpiando carpetas .next y cache de todos los proyectos...${NC}"

# Directorio raíz del proyecto
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Borrar carpetas .next y cache de cada proyecto
for app_dir in \
    "$PROJECT_ROOT/stablecoin/pasarela-de-pago/app" \
    "$PROJECT_ROOT/stablecoin/compra-stablecoin/app" \
    "$PROJECT_ROOT/abm-ecommerce/app" \
    "$PROJECT_ROOT/tienda-online/app"; do
    if [ -d "$app_dir" ]; then
        app_name=$(basename "$(dirname "$app_dir")")
        cd "$app_dir"
        # Limpiar todos los caches
        rm -rf .next .nextjs .turbo node_modules/.cache .swc 2>/dev/null || true
        find . -name "*.tsbuildinfo" -delete 2>/dev/null || true
        # Limpiar archivos de Turbopack, excluyendo package.json y archivos de configuración
        find . -type f -name "*turbopack*" ! -name "package.json" ! -name "*.json" ! -name "*.ts" ! -name "*.tsx" ! -name "*.js" ! -name "*.jsx" -delete 2>/dev/null || true
        find . -type d -name "*turbopack*" -exec rm -rf {} + 2>/dev/null || true
        if [ -d ".next" ] || [ -d ".turbo" ]; then
            rm -rf .next .turbo 2>/dev/null || true
        fi
        echo -e "${GREEN}✓ Cache limpiado de ${app_name}${NC}"
        cd "$PROJECT_ROOT"
    fi
done

echo ""
echo -e "${GREEN}✓ Todos los servicios han sido detenidos y cache limpiado${NC}"
echo ""

