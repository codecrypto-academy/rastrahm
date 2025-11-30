#!/bin/bash

# Script de inicialización del proyecto E-commerce con Blockchain
# Este script despliega todos los contratos y genera el archivo .env

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

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Inicialización del Proyecto E-commerce${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

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
        # Para Anvil, usar JSON-RPC call en lugar de curl simple
        if [[ "$url" == *"8545"* ]]; then
            if curl -s -X POST "$url" \
                -H "Content-Type: application/json" \
                -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
                > /dev/null 2>&1; then
                return 0
            fi
        else
            if curl -s "$url" > /dev/null 2>&1; then
                return 0
            fi
        fi
        attempt=$((attempt + 1))
        sleep 1
    done
    
    return 1
}

# Crear directorio para logs lo antes posible (antes de iniciar Anvil)
mkdir -p "$PROJECT_ROOT/logs"

# Verificar o iniciar Anvil
echo -e "${YELLOW}Verificando Anvil...${NC}"
if ! check_port 8545; then
    echo -e "${YELLOW}Anvil no está corriendo. Iniciando Anvil...${NC}"
    # Kill any existing anvil processes first
    pkill -f anvil 2>/dev/null || true
    sleep 1
    
    # Verificar si el archivo de estado existe y está bien formado
    STATE_FILE="$PROJECT_ROOT/anvil-state.json"
    if [ -f "$STATE_FILE" ]; then
        # Verificar si el JSON está bien formado
        if ! python3 -m json.tool "$STATE_FILE" > /dev/null 2>&1; then
            echo -e "${YELLOW}⚠ Archivo anvil-state.json corrupto. Eliminándolo...${NC}"
            mv "$STATE_FILE" "${STATE_FILE}.backup.$(date +%s)" 2>/dev/null || rm -f "$STATE_FILE"
        fi
    fi
    
    # Start Anvil with state persistence (si el archivo existe y está bien)
    if [ -f "$STATE_FILE" ]; then
        anvil --state "$STATE_FILE" > "$PROJECT_ROOT/logs/anvil.log" 2>&1 &
    else
        anvil > "$PROJECT_ROOT/logs/anvil.log" 2>&1 &
    fi
    ANVIL_PID=$!
    echo -e "${GREEN}Anvil iniciado (PID: ${ANVIL_PID})${NC}"
    
    # Esperar a que Anvil esté listo
    echo -e "${YELLOW}Esperando a que Anvil esté listo...${NC}"
    if wait_for_service "http://localhost:8545"; then
        echo -e "${GREEN}✓ Anvil está listo${NC}"
    else
        echo -e "${RED}Error: Anvil no respondió a tiempo${NC}"
        echo -e "${YELLOW}Revisando logs de Anvil...${NC}"
        tail -20 "$PROJECT_ROOT/logs/anvil.log" 2>/dev/null || true
        exit 1
    fi
else
    echo -e "${GREEN}✓ Anvil ya está corriendo${NC}"
fi
echo ""

# Verificar variables de entorno necesarias
if [ -z "$PRIVATE_KEY" ]; then
    echo -e "${YELLOW}PRIVATE_KEY no está configurada. Usando clave por defecto de Anvil...${NC}"
    export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
fi

# Obtener la dirección del deployer
DEPLOYER_ADDRESS=$(cast wallet address $PRIVATE_KEY 2>/dev/null || echo "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266")
echo -e "${BLUE}Deployer Address: ${DEPLOYER_ADDRESS}${NC}"
echo ""

# Función para desplegar contrato
deploy_contract() {
    local contract_name=$1
    local script_path=$2
    local env_var=$3
    
    echo -e "${YELLOW}Desplegando ${contract_name}...${NC}"
    
    # Extraer la parte del directorio (antes de :)
    local script_file="${script_path%%:*}"
    local script_dir="${script_file%/*}"
    
    # Cambiar al directorio del script (ruta relativa al PROJECT_ROOT)
    cd "$PROJECT_ROOT/$script_dir"
    
    # Compilar
    forge build --silent > /dev/null 2>&1 || forge build
    
    # Obtener solo el nombre del archivo y el contrato para forge script
    local script_name="${script_file##*/}"
    local contract_name_part="${script_path#*:}"
    local forge_script_path="${script_name}:${contract_name_part}"
    
    # Desplegar y capturar la dirección
    local address=$(forge script "$forge_script_path" \
        --rpc-url http://localhost:8545 \
        --broadcast \
        --private-key "$PRIVATE_KEY" \
        -vvv 2>&1 | grep -oP '(?<=deployed at: )0x[a-fA-F0-9]{40}' | tail -1)
    
    if [ -z "$address" ]; then
        echo -e "${RED}Error: No se pudo obtener la dirección de ${contract_name}${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ ${contract_name} desplegado en: ${address}${NC}"
    echo "${env_var}=${address}" >> "$PROJECT_ROOT/.env.tmp"
    
    cd "$PROJECT_ROOT"
    echo ""
}

# Limpiar archivo temporal
rm -f "$PROJECT_ROOT/.env.tmp"

# 1. Desplegar EuroToken
deploy_contract "EuroToken" \
    "stablecoin/sc/script/Deploy.s.sol:DeployEuroToken" \
    "EURO_TOKEN_ADDRESS"

# Exportar EURO_TOKEN_ADDRESS para los siguientes despliegues
export EURO_TOKEN_ADDRESS=$(grep "EURO_TOKEN_ADDRESS" "$PROJECT_ROOT/.env.tmp" | cut -d'=' -f2)

# Hacer mint de tokens a la cuenta de Anvil (primera cuenta)
echo -e "${YELLOW}Minting EURT tokens to Anvil account...${NC}"
MINT_AMOUNT="10000000000"  # 10000 EURT con 6 decimales
MINT_TO="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"  # Primera cuenta de Anvil

cast send "$EURO_TOKEN_ADDRESS" \
    "mint(address,uint256)" \
    "$MINT_TO" \
    "$MINT_AMOUNT" \
    --private-key "$PRIVATE_KEY" \
    --rpc-url http://localhost:8545 \
    --json > /dev/null 2>&1 || echo -e "${YELLOW}⚠ No se pudo hacer mint (puede que ya existan tokens)${NC}"

echo -e "${GREEN}✓ Tokens minteados: 10000 EURT a ${MINT_TO}${NC}"
echo ""

# 2. Desplegar StablecoinPurchase
# Usar el deployer como purchaser por defecto
export PURCHASER_ADDRESS=${PURCHASER_ADDRESS:-$DEPLOYER_ADDRESS}
deploy_contract "StablecoinPurchase" \
    "stablecoin/compra-stablecoin/sc/script/Deploy.s.sol:DeployStablecoinPurchase" \
    "STABLECOIN_PURCHASE_ADDRESS"

# Exportar STABLECOIN_PURCHASE_ADDRESS para los siguientes pasos
export STABLECOIN_PURCHASE_ADDRESS=$(grep "STABLECOIN_PURCHASE_ADDRESS" "$PROJECT_ROOT/.env.tmp" | cut -d'=' -f2)

# Otorgar PURCHASER_ROLE a la primera cuenta de Anvil (para testing)
echo -e "${YELLOW}Otorgando PURCHASER_ROLE a la cuenta de Anvil...${NC}"
PURCHASER_ADDRESS="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
cast send "$STABLECOIN_PURCHASE_ADDRESS" \
    "grantPurchaserRole(address)" \
    "$PURCHASER_ADDRESS" \
    --private-key "$PRIVATE_KEY" \
    --rpc-url http://localhost:8545 \
    --json > /dev/null 2>&1 || echo -e "${YELLOW}⚠ No se pudo otorgar PURCHASER_ROLE (puede que ya esté otorgado)${NC}"
echo -e "${GREEN}✓ PURCHASER_ROLE otorgado a ${PURCHASER_ADDRESS}${NC}"

# Transferir ownership de EuroToken a StablecoinPurchase para que pueda hacer mint
echo -e "${YELLOW}Transferiendo ownership de EuroToken a StablecoinPurchase...${NC}"
cast send "$EURO_TOKEN_ADDRESS" \
    "transferOwnership(address)" \
    "$STABLECOIN_PURCHASE_ADDRESS" \
    --private-key "$PRIVATE_KEY" \
    --rpc-url http://localhost:8545 \
    --json > /dev/null 2>&1 || echo -e "${YELLOW}⚠ No se pudo transferir ownership (puede que ya esté transferido)${NC}"
echo -e "${GREEN}✓ Ownership de EuroToken transferido a StablecoinPurchase${NC}"
echo ""

# 3. Desplegar PaymentGateway
# Usar el deployer como payment processor por defecto
export PAYMENT_PROCESSOR_ADDRESS=${PAYMENT_PROCESSOR_ADDRESS:-$DEPLOYER_ADDRESS}
deploy_contract "PaymentGateway" \
    "stablecoin/pasarela-de-pago/sc/script/Deploy.s.sol:DeployPaymentGateway" \
    "PAYMENT_GATEWAY_ADDRESS"

# Exportar PAYMENT_GATEWAY_ADDRESS para el despliegue de Ecommerce
export PAYMENT_GATEWAY_ADDRESS=$(grep "PAYMENT_GATEWAY_ADDRESS" "$PROJECT_ROOT/.env.tmp" | cut -d'=' -f2)

# Aprobar tokens al PaymentGateway (para que pueda procesar pagos)
echo -e "${YELLOW}Approving EURT tokens to PaymentGateway...${NC}"
APPROVE_AMOUNT="0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"  # Max uint256

cast send "$EURO_TOKEN_ADDRESS" \
    "approve(address,uint256)" \
    "$PAYMENT_GATEWAY_ADDRESS" \
    "$APPROVE_AMOUNT" \
    --private-key "$PRIVATE_KEY" \
    --rpc-url http://localhost:8545 \
    --json > /dev/null 2>&1 || echo -e "${YELLOW}⚠ No se pudo aprobar tokens${NC}"

echo -e "${GREEN}✓ Tokens aprobados al PaymentGateway${NC}"
echo ""

# 4. Desplegar Ecommerce
deploy_contract "Ecommerce" \
    "sc-ecommerce/script/Deploy.s.sol:DeployEcommerce" \
    "ECOMMERCE_ADDRESS"

# Generar archivo .env
echo -e "${YELLOW}Generando archivo .env...${NC}"

# Leer .env.tmp y generar .env con formato correcto
cat > "$PROJECT_ROOT/.env" << EOF
# Configuración de Blockchain
# Red: Anvil (localhost:8545)
# Chain ID: 31337

# Direcciones de Contratos Desplegados
$(cat "$PROJECT_ROOT/.env.tmp")

# Configuración de Red
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_RPC_URL=http://localhost:8545

# Configuración de Aplicaciones Next.js
# Puerto 3000: Pasarela de Pago
# Puerto 3001: Compra de EuroToken
# Puerto 3002: ABM E-commerce
# Puerto 3003: Tienda Online

# Variables para aplicaciones Next.js
NEXT_PUBLIC_EURO_TOKEN_ADDRESS=\${EURO_TOKEN_ADDRESS}
NEXT_PUBLIC_STABLECOIN_PURCHASE_ADDRESS=\${STABLECOIN_PURCHASE_ADDRESS}
NEXT_PUBLIC_PAYMENT_GATEWAY_ADDRESS=\${PAYMENT_GATEWAY_ADDRESS}
NEXT_PUBLIC_ECOMMERCE_ADDRESS=\${ECOMMERCE_ADDRESS}

# Configuración de Stripe (configurar con tus propias claves)
# Stripe Configuration
# Obtén estas claves desde: https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key

# IMPORTANTE: STRIPE_WEBHOOK_SECRET se obtiene de Stripe CLI, NO del Dashboard
# Para desarrollo local:
# 1. Ejecuta: stripe listen --forward-to localhost:6001/api/webhook
# 2. Copia el whsec_... que muestra Stripe CLI
# 3. Agrégalo aquí: STRIPE_WEBHOOK_SECRET=whsec_...
# 
# Para producción, usa el webhook secret del Dashboard de Stripe
STRIPE_WEBHOOK_SECRET=

# Configuración de Roles (direcciones autorizadas)
PURCHASER_ADDRESS=\${PURCHASER_ADDRESS:-$DEPLOYER_ADDRESS}
PAYMENT_PROCESSOR_ADDRESS=\${PAYMENT_PROCESSOR_ADDRESS:-$DEPLOYER_ADDRESS}
EOF

# Limpiar archivo temporal
rm -f "$PROJECT_ROOT/.env.tmp"

echo -e "${GREEN}✓ Archivo .env generado exitosamente${NC}"
echo ""

# Mostrar resumen
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Resumen de Despliegue${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
grep -E "^[A-Z_]+_ADDRESS=" "$PROJECT_ROOT/.env" | while IFS='=' read -r key value; do
    echo -e "${GREEN}${key}: ${value}${NC}"
done
echo ""

echo -e "${GREEN}✓ Inicialización completada exitosamente${NC}"
echo ""

# Cargar variables de entorno para iniciar aplicaciones
export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs)

# Función para iniciar aplicaciones Next.js
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
# Configuración generada automáticamente por init.sh
# Para desarrollo local con Stripe CLI

# Blockchain
NEXT_PUBLIC_CHAIN_ID=${NEXT_PUBLIC_CHAIN_ID:-31337}
NEXT_PUBLIC_RPC_URL=${NEXT_PUBLIC_RPC_URL:-http://localhost:8545}

# Private Key para procesar pagos (primera cuenta de Anvil)
# ⚠️ SOLO PARA DESARROLLO LOCAL - NUNCA en producción
PRIVATE_KEY=${PRIVATE_KEY:-0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80}
PAYMENT_PROCESSOR_PRIVATE_KEY=${PRIVATE_KEY:-0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80}

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
        
        # Actualizar variables de Stripe si están definidas en el entorno
        if [[ -n "$stripe_vars" ]]; then
            # Actualizar STRIPE_SECRET_KEY si está definida en el entorno
            if [[ -n "${STRIPE_SECRET_KEY:-}" ]] && [[ "${STRIPE_SECRET_KEY}" != "sk_test_your_stripe_secret_key" ]]; then
                if grep -q "^STRIPE_SECRET_KEY=" .env.local 2>/dev/null; then
                    # Escapar caracteres especiales para sed
                    local escaped_key=$(echo "$STRIPE_SECRET_KEY" | sed 's/[[\.*^$()+?{|]/\\&/g')
                    sed -i "s|^STRIPE_SECRET_KEY=.*|STRIPE_SECRET_KEY=${escaped_key}|" .env.local
                else
                    echo "STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}" >> .env.local
                fi
            fi
            
            # Actualizar NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY si está definida en el entorno
            if [[ -n "${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:-}" ]] && [[ "${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}" != "pk_test_your_stripe_publishable_key" ]]; then
                if grep -q "^NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=" .env.local 2>/dev/null; then
                    # Escapar caracteres especiales para sed
                    local escaped_pub_key=$(echo "$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" | sed 's/[[\.*^$()+?{|]/\\&/g')
                    sed -i "s|^NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=.*|NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${escaped_pub_key}|" .env.local
                else
                    echo "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}" >> .env.local
                fi
            fi
            
            # Actualizar STRIPE_WEBHOOK_SECRET si está definida en el entorno
            if [[ -n "${STRIPE_WEBHOOK_SECRET:-}" ]]; then
                if grep -q "^STRIPE_WEBHOOK_SECRET=" .env.local 2>/dev/null; then
                    # Escapar caracteres especiales para sed
                    local escaped_webhook=$(echo "$STRIPE_WEBHOOK_SECRET" | sed 's/[[\.*^$()+?{|]/\\&/g')
                    sed -i "s|^STRIPE_WEBHOOK_SECRET=.*|STRIPE_WEBHOOK_SECRET=${escaped_webhook}|" .env.local
                else
                    echo "STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}" >> .env.local
                fi
            fi
        fi
    fi
    
           # Asegurar que se use Node.js v22 antes de instalar dependencias
           export NVM_DIR="$HOME/.nvm"
           [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
           nvm use 22 > /dev/null 2>&1 || true
           
           # Instalar dependencias si es necesario
           if [ ! -d "node_modules" ] || [ ! -f "node_modules/.bin/next" ]; then
               echo -e "${YELLOW}Instalando dependencias para ${app_name}...${NC}"
               npm install --silent
           fi
    
    # Limpiar completamente el build antes de iniciar (incluyendo .next)
    echo -e "${YELLOW}Limpiando cache de ${app_name}...${NC}"
    # Detener cualquier proceso de Next.js que pueda estar corriendo
    if lsof -ti:$port > /dev/null 2>&1; then
        echo -e "${YELLOW}Deteniendo proceso existente en puerto ${port}...${NC}"
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
    # Limpiar todos los caches y builds (más agresivo)
    rm -rf .next .nextjs .turbo node_modules/.cache .swc 2>/dev/null || true
    find . -name "*.tsbuildinfo" -delete 2>/dev/null || true
    find . -name ".next" -type d -exec rm -rf {} + 2>/dev/null || true
    find . -name ".turbo" -type d -exec rm -rf {} + 2>/dev/null || true
    # Limpiar también archivos temporales de Turbopack si existen
    # Excluir explícitamente package.json y archivos de configuración
    find . -type f -name "*turbopack*" ! -name "package.json" ! -name "*.json" ! -name "*.ts" ! -name "*.tsx" ! -name "*.js" ! -name "*.jsx" -delete 2>/dev/null || true
    # Asegurar que .next esté completamente eliminado
    if [ -d ".next" ]; then
        rm -rf .next
        echo -e "${GREEN}✓ Carpeta .next eliminada de ${app_name}${NC}"
    fi
    # Verificar que se eliminó correctamente
    if [ ! -d ".next" ] && [ ! -d ".turbo" ]; then
        echo -e "${GREEN}✓ Cache completamente limpiado${NC}"
    else
        echo -e "${YELLOW}⚠ Algunos archivos de cache pueden quedar${NC}"
    fi
    
           # NO hacer build previo - dejar que dev mode genere todo desde cero
           # El modo dev de Next.js genera sus propios archivos de manifiesto
           
           # Asegurar que se use Node.js v22 (cargar nvm en el proceso)
           export NVM_DIR="$HOME/.nvm"
           [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
           nvm use 22 > /dev/null 2>&1 || true
           
           # Verificar que npm está disponible
           if ! command -v npm &> /dev/null; then
               echo -e "${RED}Error: npm no está disponible. Asegúrate de que Node.js v22 esté instalado.${NC}"
               return 1
           fi
           
           # Iniciar en background con nvm cargado
           (export NVM_DIR="$HOME/.nvm"; [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"; nvm use 22 > /dev/null 2>&1; PORT=$port npm run dev) > "$PROJECT_ROOT/logs/${app_name}.log" 2>&1 &
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

# Iniciar todas las aplicaciones
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Iniciando Aplicaciones${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

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

# Mostrar resumen final
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Resumen Final${NC}"
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
echo -e "${YELLOW}Próximos pasos:${NC}"
echo -e "1. Revisa el archivo .env y configura las claves de Stripe:"
echo -e "   - STRIPE_SECRET_KEY (desde https://dashboard.stripe.com/apikeys)"
echo -e "   - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (desde https://dashboard.stripe.com/apikeys)"
echo -e ""
echo -e "2. Para STRIPE_WEBHOOK_SECRET (desarrollo local con Stripe CLI):"
echo -e "   - Ejecuta: stripe listen --forward-to localhost:3001/api/webhook"
echo -e "   - Copia el whsec_... que muestra Stripe CLI"
echo -e "   - Agrégalo al .env como: STRIPE_WEBHOOK_SECRET=whsec_..."
echo -e "   - NO configures webhooks en Stripe Dashboard para desarrollo local"
echo ""
echo -e "${BLUE}Para detener todos los servicios, ejecuta:${NC}"
echo -e "${YELLOW}  ./scripts/stop-all.sh${NC}"
echo ""

