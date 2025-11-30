#!/bin/bash

# Script para desplegar contratos individuales o todos los contratos

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Directorio raíz del proyecto
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Función para mostrar ayuda
show_help() {
    echo "Uso: $0 [CONTRATO]"
    echo ""
    echo "Despliega contratos en Anvil (localhost:8545)"
    echo ""
    echo "Contratos disponibles:"
    echo "  eurotoken       - Desplegar EuroToken"
    echo "  purchase        - Desplegar StablecoinPurchase"
    echo "  gateway         - Desplegar PaymentGateway"
    echo "  ecommerce       - Desplegar Ecommerce"
    echo "  all             - Desplegar todos los contratos (requiere .env con direcciones)"
    echo ""
    echo "Ejemplos:"
    echo "  $0 eurotoken"
    echo "  $0 all"
    echo ""
}

# Verificar que Anvil esté corriendo
check_anvil() {
    if ! curl -s http://localhost:8545 > /dev/null 2>&1; then
        echo -e "${RED}Error: Anvil no está corriendo en localhost:8545${NC}"
        echo -e "${YELLOW}Por favor, inicia Anvil con: anvil${NC}"
        exit 1
    fi
}

# Cargar variables de entorno
if [ -f "$PROJECT_ROOT/.env" ]; then
    export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs)
fi

# Verificar PRIVATE_KEY
if [ -z "$PRIVATE_KEY" ]; then
    echo -e "${YELLOW}PRIVATE_KEY no está configurada. Usando clave por defecto de Anvil...${NC}"
    export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
fi

# Función para desplegar un contrato
deploy_contract() {
    local contract_name=$1
    local script_path=$2
    
    echo -e "${BLUE}Desplegando ${contract_name}...${NC}"
    
    cd "$script_path/.."
    
    # Compilar
    echo -e "${YELLOW}Compilando...${NC}"
    forge build --silent > /dev/null 2>&1 || forge build
    
    # Desplegar
    echo -e "${YELLOW}Desplegando...${NC}"
    forge script "$script_path" \
        --rpc-url http://localhost:8545 \
        --broadcast \
        --private-key "$PRIVATE_KEY" \
        -vvv
    
    cd "$PROJECT_ROOT"
    echo -e "${GREEN}✓ ${contract_name} desplegado${NC}"
    echo ""
}

# Verificar argumentos
if [ $# -eq 0 ]; then
    show_help
    exit 1
fi

CONTRACT=$1

# Verificar Anvil
check_anvil

case $CONTRACT in
    eurotoken)
        deploy_contract "EuroToken" "stablecoin/sc/script/Deploy.s.sol:DeployEuroToken"
        ;;
    purchase)
        if [ -z "$EURO_TOKEN_ADDRESS" ]; then
            echo -e "${RED}Error: EURO_TOKEN_ADDRESS no está configurada${NC}"
            echo -e "${YELLOW}Por favor, configura .env o despliega EuroToken primero${NC}"
            exit 1
        fi
        export PURCHASER_ADDRESS=${PURCHASER_ADDRESS:-$(cast wallet address $PRIVATE_KEY 2>/dev/null || echo "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266")}
        deploy_contract "StablecoinPurchase" "stablecoin/compra-stablecoin/sc/script/Deploy.s.sol:DeployStablecoinPurchase"
        ;;
    gateway)
        if [ -z "$EURO_TOKEN_ADDRESS" ]; then
            echo -e "${RED}Error: EURO_TOKEN_ADDRESS no está configurada${NC}"
            exit 1
        fi
        export PAYMENT_PROCESSOR_ADDRESS=${PAYMENT_PROCESSOR_ADDRESS:-$(cast wallet address $PRIVATE_KEY 2>/dev/null || echo "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266")}
        deploy_contract "PaymentGateway" "stablecoin/pasarela-de-pago/sc/script/Deploy.s.sol:DeployPaymentGateway"
        ;;
    ecommerce)
        if [ -z "$EURO_TOKEN_ADDRESS" ] || [ -z "$PAYMENT_GATEWAY_ADDRESS" ]; then
            echo -e "${RED}Error: EURO_TOKEN_ADDRESS y PAYMENT_GATEWAY_ADDRESS deben estar configuradas${NC}"
            exit 1
        fi
        deploy_contract "Ecommerce" "sc-ecommerce/script/Deploy.s.sol:DeployEcommerce"
        ;;
    all)
        echo -e "${BLUE}Desplegando todos los contratos...${NC}"
        echo ""
        $0 eurotoken
        $0 purchase
        $0 gateway
        $0 ecommerce
        echo -e "${GREEN}✓ Todos los contratos desplegados${NC}"
        ;;
    *)
        echo -e "${RED}Error: Contrato desconocido: $CONTRACT${NC}"
        show_help
        exit 1
        ;;
esac

