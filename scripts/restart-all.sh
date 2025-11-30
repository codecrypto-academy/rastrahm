#!/bin/bash

# Script para reiniciar todos los servicios del proyecto
# Incluye: Anvil, y todas las aplicaciones Next.js

set -e

# Cargar nvm si está disponible
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
# Usar Node.js v22 (requerido por Next.js 16)
nvm use 22 > /dev/null 2>&1 || true

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Directorio raíz del proyecto
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Función para matar procesos en un puerto
kill_port() {
    local port=$1
    local pids=$(lsof -ti:$port 2>/dev/null || true)
    if [ -n "$pids" ]; then
        echo "$pids" | while read pid; do
            # Verificar que el proceso sea de Node.js/Next.js, no de Chrome
            local cmd=$(ps -p $pid -o comm= 2>/dev/null || echo "")
            if [[ "$cmd" == *"node"* ]] || [[ "$cmd" == *"next"* ]]; then
                echo -e "${YELLOW}Deteniendo proceso en puerto ${port} (PID: ${pid}, Comando: ${cmd})...${NC}"
                kill -9 $pid 2>/dev/null || true
            fi
        done
        sleep 2
    fi
}

# Función para matar TODOS los procesos de Node.js relacionados con el proyecto
kill_all_node_processes() {
    echo -e "${YELLOW}Deteniendo todos los procesos de Node.js/Next.js...${NC}"
    
    # Matar procesos que contengan rutas del proyecto
    pkill -9 -f "next.*dev" 2>/dev/null || true
    pkill -9 -f "next.*3000" 2>/dev/null || true
    pkill -9 -f "next.*3001" 2>/dev/null || true
    pkill -9 -f "next.*3002" 2>/dev/null || true
    pkill -9 -f "next.*3003" 2>/dev/null || true
    
    # Esperar un poco más para que los puertos se liberen
    sleep 3
}

# Función para verificar si un puerto está en uso
check_port() {
    local port=$1
    if lsof -ti:$port > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Función para esperar a que un servicio esté listo
wait_for_service() {
    local url=$1
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 1
    done
    
    return 1
}

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Reiniciando Todos los Servicios${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Detener servicios existentes
echo -e "${YELLOW}Deteniendo servicios existentes...${NC}"

# Primero matar todos los procesos de Node.js relacionados
kill_all_node_processes

# Luego matar procesos en puertos específicos
kill_port 8545  # Anvil
kill_port 3000  # Pasarela de Pago
kill_port 3001  # Compra de EuroToken
kill_port 3002  # ABM E-commerce
kill_port 3003  # Tienda Online

# Verificar que los puertos estén libres
echo -e "${YELLOW}Verificando que los puertos estén libres...${NC}"
for port in 3000 3001 3002 3003; do
    remaining_pids=$(lsof -ti:$port 2>/dev/null | grep -v "$(pgrep -f chrome 2>/dev/null)" || true)
    if [ -n "$remaining_pids" ]; then
        echo -e "${YELLOW}Forzando detención de procesos restantes en puerto ${port}...${NC}"
        echo "$remaining_pids" | xargs kill -9 2>/dev/null || true
    fi
done

sleep 2
echo -e "${GREEN}✓ Servicios detenidos${NC}"
echo ""

# Crear directorio de logs antes de iniciar servicios
mkdir -p "$PROJECT_ROOT/logs"

# Iniciar Anvil
echo -e "${BLUE}Iniciando Anvil...${NC}"
if check_port 8545; then
    echo -e "${YELLOW}Anvil ya está corriendo en puerto 8545${NC}"
else
    anvil > "$PROJECT_ROOT/logs/anvil.log" 2>&1 &
    ANVIL_PID=$!
    echo -e "${GREEN}Anvil iniciado (PID: ${ANVIL_PID})${NC}"
    
    # Esperar a que Anvil esté listo
    echo -e "${YELLOW}Esperando a que Anvil esté listo...${NC}"
    if wait_for_service "http://localhost:8545"; then
        echo -e "${GREEN}✓ Anvil está listo${NC}"
    else
        echo -e "${RED}Error: Anvil no respondió a tiempo${NC}"
        exit 1
    fi
fi
echo ""

# Verificar si existe .env
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    echo -e "${YELLOW}Archivo .env no encontrado. Ejecutando script de inicialización...${NC}"
    "$PROJECT_ROOT/scripts/init.sh"
    echo ""
fi

# Cargar variables de entorno
export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs)

# Iniciar aplicaciones Next.js
start_nextjs_app() {
    local app_name=$1
    local app_path=$2
    local port=$3
    
    echo -e "${BLUE}Iniciando ${app_name} en puerto ${port}...${NC}"
    
    cd "$app_path"
    
    # Determinar qué variables necesita cada app
    local stripe_vars=""
    if [[ "$app_name" == *"Compra de EuroToken"* ]] || \
       [[ "$app_name" == *"Pasarela de Pago"* ]] || \
       [[ "$app_name" == *"Tienda Online"* ]]; then
        stripe_vars="STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY:-}
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:-}
# STRIPE_WEBHOOK_SECRET se obtiene de Stripe CLI (ver instrucciones abajo)
STRIPE_WEBHOOK_SECRET="
    fi
    
    # Variables de contratos según la app
    local contract_vars=""
    if [[ "$app_name" == *"Compra de EuroToken"* ]]; then
        contract_vars="NEXT_PUBLIC_EURO_TOKEN_ADDRESS=${EURO_TOKEN_ADDRESS}
NEXT_PUBLIC_STABLECOIN_PURCHASE_ADDRESS=${STABLECOIN_PURCHASE_ADDRESS}
NEXT_PUBLIC_API_URL=http://localhost:3001/api"
    elif [[ "$app_name" == *"Pasarela de Pago"* ]]; then
        contract_vars="NEXT_PUBLIC_PAYMENT_GATEWAY_ADDRESS=${PAYMENT_GATEWAY_ADDRESS}
NEXT_PUBLIC_EURO_TOKEN_ADDRESS=${EURO_TOKEN_ADDRESS}
NEXT_PUBLIC_ECOMMERCE_ADDRESS=${ECOMMERCE_ADDRESS}"
    elif [[ "$app_name" == *"Tienda Online"* ]]; then
        contract_vars="NEXT_PUBLIC_ECOMMERCE_ADDRESS=${ECOMMERCE_ADDRESS}
NEXT_PUBLIC_PAYMENT_GATEWAY_ADDRESS=${PAYMENT_GATEWAY_ADDRESS}
NEXT_PUBLIC_EURO_TOKEN_ADDRESS=${EURO_TOKEN_ADDRESS}
NEXT_PUBLIC_STABLECOIN_PURCHASE_ADDRESS=${STABLECOIN_PURCHASE_ADDRESS}"
    elif [[ "$app_name" == *"ABM E-commerce"* ]]; then
        contract_vars="NEXT_PUBLIC_ECOMMERCE_ADDRESS=${ECOMMERCE_ADDRESS}
NEXT_PUBLIC_EURO_TOKEN_ADDRESS=${EURO_TOKEN_ADDRESS}
NEXT_PUBLIC_PAYMENT_GATEWAY_ADDRESS=${PAYMENT_GATEWAY_ADDRESS}
NEXT_PUBLIC_STABLECOIN_PURCHASE_ADDRESS=${STABLECOIN_PURCHASE_ADDRESS}"
    fi
    
    # Crear o actualizar .env.local
    if [ ! -f ".env.local" ]; then
        echo -e "${YELLOW}Creando .env.local para ${app_name}...${NC}"
        cat > .env.local << EOF
# Configuración generada automáticamente por restart-all.sh
# Para desarrollo local con Stripe CLI

# Blockchain
NEXT_PUBLIC_CHAIN_ID=${NEXT_PUBLIC_CHAIN_ID:-31337}
NEXT_PUBLIC_RPC_URL=${NEXT_PUBLIC_RPC_URL:-http://localhost:8545}

# Contratos
${contract_vars}

# Stripe Configuration
${stripe_vars}

# IMPORTANTE: Para obtener STRIPE_WEBHOOK_SECRET:
# 1. Ejecuta: stripe listen --forward-to localhost:${port}/api/webhook
# 2. Copia el whsec_... que muestra Stripe CLI
# 3. Agrégalo aquí: STRIPE_WEBHOOK_SECRET=whsec_...
EOF
    else
        echo -e "${YELLOW}Actualizando .env.local para ${app_name}...${NC}"
        # Actualizar direcciones de contratos existentes usando sed
        if [[ -n "$contract_vars" ]]; then
            # Actualizar NEXT_PUBLIC_ECOMMERCE_ADDRESS
            if echo "$contract_vars" | grep -q "NEXT_PUBLIC_ECOMMERCE_ADDRESS="; then
                local ecommerce_addr=$(echo "$contract_vars" | grep "NEXT_PUBLIC_ECOMMERCE_ADDRESS=" | cut -d'=' -f2)
                if grep -q "^NEXT_PUBLIC_ECOMMERCE_ADDRESS=" .env.local 2>/dev/null; then
                    sed -i "s|^NEXT_PUBLIC_ECOMMERCE_ADDRESS=.*|NEXT_PUBLIC_ECOMMERCE_ADDRESS=${ecommerce_addr}|" .env.local
                fi
            fi
            
            # Actualizar NEXT_PUBLIC_EURO_TOKEN_ADDRESS
            if echo "$contract_vars" | grep -q "NEXT_PUBLIC_EURO_TOKEN_ADDRESS="; then
                local euro_token_addr=$(echo "$contract_vars" | grep "NEXT_PUBLIC_EURO_TOKEN_ADDRESS=" | cut -d'=' -f2)
                if grep -q "^NEXT_PUBLIC_EURO_TOKEN_ADDRESS=" .env.local 2>/dev/null; then
                    sed -i "s|^NEXT_PUBLIC_EURO_TOKEN_ADDRESS=.*|NEXT_PUBLIC_EURO_TOKEN_ADDRESS=${euro_token_addr}|" .env.local
                fi
            fi
            
            # Actualizar NEXT_PUBLIC_PAYMENT_GATEWAY_ADDRESS
            if echo "$contract_vars" | grep -q "NEXT_PUBLIC_PAYMENT_GATEWAY_ADDRESS="; then
                local gateway_addr=$(echo "$contract_vars" | grep "NEXT_PUBLIC_PAYMENT_GATEWAY_ADDRESS=" | cut -d'=' -f2)
                if grep -q "^NEXT_PUBLIC_PAYMENT_GATEWAY_ADDRESS=" .env.local 2>/dev/null; then
                    sed -i "s|^NEXT_PUBLIC_PAYMENT_GATEWAY_ADDRESS=.*|NEXT_PUBLIC_PAYMENT_GATEWAY_ADDRESS=${gateway_addr}|" .env.local
                fi
            fi
            
            # Actualizar NEXT_PUBLIC_STABLECOIN_PURCHASE_ADDRESS
            if echo "$contract_vars" | grep -q "NEXT_PUBLIC_STABLECOIN_PURCHASE_ADDRESS="; then
                local purchase_addr=$(echo "$contract_vars" | grep "NEXT_PUBLIC_STABLECOIN_PURCHASE_ADDRESS=" | cut -d'=' -f2)
                if grep -q "^NEXT_PUBLIC_STABLECOIN_PURCHASE_ADDRESS=" .env.local 2>/dev/null; then
                    sed -i "s|^NEXT_PUBLIC_STABLECOIN_PURCHASE_ADDRESS=.*|NEXT_PUBLIC_STABLECOIN_PURCHASE_ADDRESS=${purchase_addr}|" .env.local
                fi
            fi
            
            # Actualizar NEXT_PUBLIC_API_URL si existe
            if echo "$contract_vars" | grep -q "NEXT_PUBLIC_API_URL="; then
                local api_url=$(echo "$contract_vars" | grep "NEXT_PUBLIC_API_URL=" | cut -d'=' -f2)
                if grep -q "^NEXT_PUBLIC_API_URL=" .env.local 2>/dev/null; then
                    sed -i "s|^NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=${api_url}|" .env.local
                fi
            fi
        fi
    fi
    
    # Instalar dependencias si es necesario
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}Instalando dependencias para ${app_name}...${NC}"
        npm install --silent
    fi
    
    # Limpiar completamente el build antes de iniciar
    echo -e "${YELLOW}Limpiando build completo para ${app_name}...${NC}"
    rm -rf .next .turbo node_modules/.cache .swc 2>/dev/null || true
    find . -name "*.tsbuildinfo" -delete 2>/dev/null || true
    
    # Hacer un build limpio antes de iniciar en modo dev
    echo -e "${YELLOW}Compilando ${app_name}...${NC}"
    PORT=$port npm run build > /dev/null 2>&1 || {
        echo -e "${YELLOW}Build falló, continuando con dev mode...${NC}"
    }
    
    # Iniciar en background
    PORT=$port npm run dev > "$PROJECT_ROOT/logs/${app_name}.log" 2>&1 &
    local pid=$!
    echo -e "${GREEN}${app_name} iniciado (PID: ${pid}, Puerto: ${port})${NC}"
    
    # Esperar a que esté listo
    echo -e "${YELLOW}Esperando a que ${app_name} esté listo...${NC}"
    if wait_for_service "http://localhost:${port}"; then
        echo -e "${GREEN}✓ ${app_name} está listo${NC}"
    else
        echo -e "${YELLOW}⚠ ${app_name} puede no estar completamente listo aún${NC}"
    fi
    
    cd "$PROJECT_ROOT"
    echo ""
}

# Iniciar aplicaciones
start_nextjs_app "Pasarela de Pago" \
    "$PROJECT_ROOT/stablecoin/pasarela-de-pago/app" \
    3000

start_nextjs_app "Compra de EuroToken" \
    "$PROJECT_ROOT/stablecoin/compra-stablecoin/app" \
    3001

start_nextjs_app "ABM E-commerce" \
    "$PROJECT_ROOT/abm-ecommerce/app" \
    3002

start_nextjs_app "Tienda Online" \
    "$PROJECT_ROOT/tienda-online/app" \
    3003

# Mostrar resumen
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Resumen de Servicios${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}✓ Anvil:${NC}        http://localhost:8545"
echo -e "${GREEN}✓ Pasarela de Pago:${NC}  http://localhost:3000"
echo -e "${GREEN}✓ Compra EuroToken:${NC}  http://localhost:3001"
echo -e "${GREEN}✓ ABM E-commerce:${NC}    http://localhost:3002"
echo -e "${GREEN}✓ Tienda Online:${NC}     http://localhost:3003"
echo ""
echo -e "${YELLOW}Logs disponibles en:${NC} $PROJECT_ROOT/logs/"
echo ""
echo -e "${BLUE}⚠️  IMPORTANTE: Configuración de Stripe Webhooks${NC}"
echo -e "${YELLOW}Para desarrollo local, usa Stripe CLI (NO el Dashboard):${NC}"
echo -e "  ${GREEN}stripe listen --forward-to localhost:3001/api/webhook${NC}  (Compra EURT)"
echo -e "  ${GREEN}stripe listen --forward-to localhost:3000/api/webhook${NC}  (Pasarela)"
echo -e "  ${GREEN}stripe listen --forward-to localhost:3003/api/webhook${NC}  (Tienda)"
echo -e ""
echo -e "${YELLOW}Copia el whsec_... que muestra Stripe CLI y agrégalo a .env.local${NC}"
echo ""
echo -e "${BLUE}Para detener todos los servicios, ejecuta:${NC}"
echo -e "${YELLOW}  ./scripts/stop-all.sh${NC}"
echo ""

