#!/bin/bash

# Script para limpiar completamente el cache de Next.js de todos los proyectos
# Útil cuando hay problemas con builds corruptos

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Limpieza Completa de Cache${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Directorio raíz del proyecto
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Función para limpiar cache de un proyecto
clean_project_cache() {
    local app_dir=$1
    local app_name=$2
    
    if [ ! -d "$app_dir" ]; then
        echo -e "${YELLOW}⚠ Directorio no encontrado: ${app_dir}${NC}"
        return
    fi
    
    echo -e "${YELLOW}Limpiando cache de ${app_name}...${NC}"
    cd "$app_dir"
    
    # Detener cualquier proceso de Next.js en este directorio
    local port=$(grep -oP 'PORT=\K[0-9]+' package.json 2>/dev/null || echo "")
    if [ -n "$port" ]; then
        if lsof -ti:$port > /dev/null 2>&1; then
            echo -e "${YELLOW}  Deteniendo proceso en puerto ${port}...${NC}"
            lsof -ti:$port | xargs kill -9 2>/dev/null || true
            sleep 1
        fi
    fi
    
    # Limpiar todos los caches
    echo -e "${YELLOW}  Eliminando carpetas de cache...${NC}"
    rm -rf .next .nextjs .turbo node_modules/.cache .swc 2>/dev/null || true
    
    # Eliminar archivos de build
    echo -e "${YELLOW}  Eliminando archivos de build...${NC}"
    find . -name "*.tsbuildinfo" -delete 2>/dev/null || true
    find . -name ".next" -type d -exec rm -rf {} + 2>/dev/null || true
    find . -name ".turbo" -type d -exec rm -rf {} + 2>/dev/null || true
    
    # Eliminar archivos de Turbopack (usar patrón específico para evitar eliminar otros archivos)
    echo -e "${YELLOW}  Eliminando archivos de Turbopack...${NC}"
    # Buscar solo archivos que contengan "turbopack" como palabra completa (no usar corchetes que son clase de caracteres)
    # Excluir explícitamente package.json y otros archivos de configuración
    find . -type f -name "*turbopack*" ! -name "package.json" ! -name "*.json" ! -name "*.ts" ! -name "*.tsx" ! -name "*.js" ! -name "*.jsx" -delete 2>/dev/null || true
    find . -type d -name "*turbopack*" -exec rm -rf {} + 2>/dev/null || true
    
    # Verificar que se eliminó
    if [ ! -d ".next" ] && [ ! -d ".turbo" ]; then
        echo -e "${GREEN}  ✓ Cache limpiado de ${app_name}${NC}"
    else
        echo -e "${RED}  ✗ Algunos archivos de cache aún existen${NC}"
    fi
    
    cd "$PROJECT_ROOT"
    echo ""
}

# Limpiar cache de todos los proyectos
clean_project_cache "$PROJECT_ROOT/stablecoin/pasarela-de-pago/app" "Pasarela de Pago"
clean_project_cache "$PROJECT_ROOT/stablecoin/compra-stablecoin/app" "Compra de EuroToken"
clean_project_cache "$PROJECT_ROOT/abm-ecommerce/app" "ABM E-commerce"
clean_project_cache "$PROJECT_ROOT/tienda-online/app" "Tienda Online"

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓ Limpieza de cache completada${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}Próximos pasos:${NC}"
echo -e "1. Ejecuta ./scripts/init.sh para reiniciar todos los servicios"
echo -e "2. O inicia manualmente cada aplicación con: npm run dev"
echo ""

