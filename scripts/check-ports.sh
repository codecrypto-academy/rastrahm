#!/bin/bash

# Script para verificar qué aplicaciones están usando los puertos del proyecto

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Verificación de Puertos${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Función para verificar un puerto
check_port() {
    local port=$1
    local name=$2
    
    echo -e "${YELLOW}Puerto ${port} (${name}):${NC}"
    
    # Intentar con ss primero (más rápido y moderno)
    if command -v ss >/dev/null 2>&1; then
        local result=$(ss -tulpn 2>/dev/null | grep ":${port} ")
        if [ -n "$result" ]; then
            echo -e "${GREEN}✓ En uso:${NC}"
            echo "$result" | while read line; do
                # Extraer PID y comando
                local pid=$(echo "$line" | grep -oP 'pid=\K[0-9]+' | head -1)
                if [ -n "$pid" ]; then
                    local cmd=$(ps -p "$pid" -o comm= 2>/dev/null || echo "N/A")
                    local full_cmd=$(ps -p "$pid" -o args= 2>/dev/null | head -c 80 || echo "N/A")
                    echo "  PID: $pid | Comando: $cmd"
                    echo "  CMD: $full_cmd..."
                fi
                echo "  $line"
            done
        else
            echo -e "${RED}✗ No hay proceso en este puerto${NC}"
        fi
    # Fallback a lsof
    elif command -v lsof >/dev/null 2>&1; then
        local result=$(lsof -i :${port} 2>/dev/null)
        if [ -n "$result" ]; then
            echo -e "${GREEN}✓ En uso:${NC}"
            echo "$result"
        else
            echo -e "${RED}✗ No hay proceso en este puerto${NC}"
        fi
    # Fallback a netstat
    elif command -v netstat >/dev/null 2>&1; then
        local result=$(netstat -tulpn 2>/dev/null | grep ":${port} ")
        if [ -n "$result" ]; then
            echo -e "${GREEN}✓ En uso:${NC}"
            echo "$result"
        else
            echo -e "${RED}✗ No hay proceso en este puerto${NC}"
        fi
    else
        echo -e "${RED}✗ No se encontraron herramientas (ss, lsof, netstat)${NC}"
    fi
    echo ""
}

# Verificar puertos del proyecto
check_port 8545 "Anvil"
check_port 3000 "Pasarela de Pago"
check_port 3001 "Compra de EuroToken"
check_port 3002 "ABM E-commerce"
check_port 3003 "Tienda Online"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Resumen de Puertos Activos${NC}"
echo -e "${BLUE}========================================${NC}"

# Mostrar todos los puertos activos de una vez
if command -v ss >/dev/null 2>&1; then
    echo -e "${YELLOW}Todos los puertos en LISTEN:${NC}"
    ss -tulpn 2>/dev/null | grep LISTEN | grep -E ":(8545|3000|3001|3002|3003) " || echo "Ninguno de los puertos del proyecto está en uso"
elif command -v lsof >/dev/null 2>&1; then
    echo -e "${YELLOW}Todos los puertos en LISTEN:${NC}"
    lsof -i -P -n 2>/dev/null | grep LISTEN | grep -E ":(8545|3000|3001|3002|3003)" || echo "Ninguno de los puertos del proyecto está en uso"
fi

echo ""

