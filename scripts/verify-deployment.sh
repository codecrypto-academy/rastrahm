#!/bin/bash
# Script para verificar que todos los contratos estén desplegados y funcionando correctamente

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Verificación de Despliegue${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Cargar variables de entorno
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
else
    echo -e "${RED}❌ No se encontró el archivo .env${NC}"
    exit 1
fi

# Verificar que Anvil esté corriendo
echo -e "${YELLOW}1. Verificando Anvil...${NC}"
if curl -s http://localhost:8545 > /dev/null 2>&1; then
    echo -e "${GREEN}   ✅ Anvil está corriendo${NC}"
else
    echo -e "${RED}   ❌ Anvil NO está corriendo${NC}"
    exit 1
fi
echo ""

# Verificar contratos desplegados
echo -e "${YELLOW}2. Verificando contratos desplegados...${NC}"

check_contract() {
    local name=$1
    local address=$2
    
    if [ -z "$address" ]; then
        echo -e "${RED}   ❌ ${name}: No configurado${NC}"
        return 1
    fi
    
    CODE=$(cast code "$address" --rpc-url http://localhost:8545 2>&1)
    if [ "$CODE" != "0x" ] && [ -n "$CODE" ] && ! echo "$CODE" | grep -q "execution reverted"; then
        echo -e "${GREEN}   ✅ ${name}: ${address}${NC}"
        return 0
    else
        echo -e "${RED}   ❌ ${name}: No desplegado o sin código${NC}"
        return 1
    fi
}

check_contract "EuroToken" "$EURO_TOKEN_ADDRESS"
check_contract "StablecoinPurchase" "$STABLECOIN_PURCHASE_ADDRESS"
check_contract "PaymentGateway" "$PAYMENT_GATEWAY_ADDRESS"
check_contract "Ecommerce" "$ECOMMERCE_ADDRESS"
echo ""

# Verificar balance de tokens
echo -e "${YELLOW}3. Verificando balance de tokens...${NC}"
ANVIL_ACCOUNT="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"

if [ -n "$EURO_TOKEN_ADDRESS" ]; then
    BALANCE=$(cast call "$EURO_TOKEN_ADDRESS" "balanceOf(address)" "$ANVIL_ACCOUNT" --rpc-url http://localhost:8545 2>&1 | grep -oP '0x[a-fA-F0-9]+' | head -1)
    if [ -n "$BALANCE" ]; then
        BALANCE_DEC=$(printf "%d" "$BALANCE" 2>/dev/null || echo "0")
        BALANCE_EURT=$(echo "scale=2; $BALANCE_DEC / 1000000" | bc 2>/dev/null || echo "0")
        if [ "$BALANCE_DEC" -gt 0 ]; then
            echo -e "${GREEN}   ✅ Balance EURT: ${BALANCE_EURT} EURT${NC}"
        else
            echo -e "${YELLOW}   ⚠️  Balance EURT: 0 EURT (ejecuta ./scripts/mint-tokens.sh)${NC}"
        fi
    else
        echo -e "${RED}   ❌ No se pudo obtener el balance${NC}"
    fi
else
    echo -e "${RED}   ❌ EURO_TOKEN_ADDRESS no configurado${NC}"
fi
echo ""

# Verificar allowance al PaymentGateway
echo -e "${YELLOW}4. Verificando allowance al PaymentGateway...${NC}"
if [ -n "$EURO_TOKEN_ADDRESS" ] && [ -n "$PAYMENT_GATEWAY_ADDRESS" ]; then
    ALLOWANCE=$(cast call "$EURO_TOKEN_ADDRESS" "allowance(address,address)" "$ANVIL_ACCOUNT" "$PAYMENT_GATEWAY_ADDRESS" --rpc-url http://localhost:8545 2>&1 | grep -oP '0x[a-fA-F0-9]+' | head -1)
    if [ -n "$ALLOWANCE" ] && [ "$ALLOWANCE" != "0x0" ] && [ "$ALLOWANCE" != "0x" ]; then
        echo -e "${GREEN}   ✅ Allowance configurado (máximo)${NC}"
    else
        echo -e "${YELLOW}   ⚠️  Allowance no configurado (ejecuta ./scripts/approve-tokens.sh)${NC}"
    fi
else
    echo -e "${RED}   ❌ Direcciones no configuradas${NC}"
fi
echo ""

# Verificar roles en PaymentGateway
echo -e "${YELLOW}5. Verificando roles en PaymentGateway...${NC}"
if [ -n "$PAYMENT_GATEWAY_ADDRESS" ]; then
    # Verificar PAYMENT_PROCESSOR_ROLE
    PROCESSOR_ROLE=$(cast call "$PAYMENT_GATEWAY_ADDRESS" "PAYMENT_PROCESSOR_ROLE()" --rpc-url http://localhost:8545 2>&1 | grep -oP '0x[a-fA-F0-9]+' | head -1)
    if [ -n "$PROCESSOR_ROLE" ]; then
        HAS_ROLE=$(cast call "$PAYMENT_GATEWAY_ADDRESS" "hasRole(bytes32,address)" "$PROCESSOR_ROLE" "$ANVIL_ACCOUNT" --rpc-url http://localhost:8545 2>&1 | grep -oP '0x[a-fA-F0-9]+' | head -1)
        if [ "$HAS_ROLE" = "0x0000000000000000000000000000000000000000000000000000000000000001" ]; then
            echo -e "${GREEN}   ✅ PAYMENT_PROCESSOR_ROLE otorgado a ${ANVIL_ACCOUNT}${NC}"
        else
            echo -e "${YELLOW}   ⚠️  PAYMENT_PROCESSOR_ROLE no otorgado${NC}"
        fi
    fi
else
    echo -e "${RED}   ❌ PAYMENT_GATEWAY_ADDRESS no configurado${NC}"
fi
echo ""

# Verificar pagos en PaymentGateway
echo -e "${YELLOW}6. Verificando pagos en PaymentGateway...${NC}"
if [ -n "$PAYMENT_GATEWAY_ADDRESS" ]; then
    TOTAL_PAYMENTS=$(cast call "$PAYMENT_GATEWAY_ADDRESS" "getTotalPayments()" --rpc-url http://localhost:8545 2>&1 | grep -oP '0x[a-fA-F0-9]+' | head -1)
    if [ -n "$TOTAL_PAYMENTS" ]; then
        TOTAL_DEC=$(printf "%d" "$TOTAL_PAYMENTS" 2>/dev/null || echo "0")
        echo -e "${BLUE}   📊 Total de pagos: ${TOTAL_DEC}${NC}"
        
        # Verificar pagos de la cuenta de Anvil
        PAYER_PAYMENTS=$(cast call "$PAYMENT_GATEWAY_ADDRESS" "getPayerPayments(address)" "$ANVIL_ACCOUNT" --rpc-url http://localhost:8545 2>&1)
        if echo "$PAYER_PAYMENTS" | grep -q "0x0000000000000000000000000000000000000000000000000000000000000020"; then
            echo -e "${BLUE}   📤 Pagos enviados: Disponibles${NC}"
        else
            echo -e "${BLUE}   📤 Pagos enviados: 0${NC}"
        fi
    fi
else
    echo -e "${RED}   ❌ PAYMENT_GATEWAY_ADDRESS no configurado${NC}"
fi
echo ""

# Verificar archivos .env.local
echo -e "${YELLOW}7. Verificando archivos .env.local...${NC}"
APPS=(
    "stablecoin/pasarela-de-pago/app:Pasarela de Pago"
    "stablecoin/compra-stablecoin/app:Compra de EuroToken"
    "abm-ecommerce/app:ABM E-commerce"
    "tienda-online/app:Tienda Online"
)

for app_info in "${APPS[@]}"; do
    IFS=':' read -r app_path app_name <<< "$app_info"
    if [ -f "$app_path/.env.local" ]; then
        if grep -q "NEXT_PUBLIC_PAYMENT_GATEWAY_ADDRESS\|NEXT_PUBLIC_EURO_TOKEN_ADDRESS\|NEXT_PUBLIC_ECOMMERCE_ADDRESS" "$app_path/.env.local" 2>/dev/null; then
            echo -e "${GREEN}   ✅ ${app_name}: .env.local configurado${NC}"
        else
            echo -e "${YELLOW}   ⚠️  ${app_name}: .env.local incompleto${NC}"
        fi
    else
        echo -e "${YELLOW}   ⚠️  ${app_name}: .env.local no existe${NC}"
    fi
done
echo ""

# Resumen final
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Resumen${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}✅ Verificación completada${NC}"
echo ""
echo -e "${YELLOW}Próximos pasos:${NC}"
echo "1. Si falta balance de tokens: ./scripts/mint-tokens.sh"
echo "2. Si falta allowance: ./scripts/approve-tokens.sh"
echo "3. Si falta rol: Verifica el script de despliegue"
echo "4. Para probar un pago: Usa la aplicación Pasarela de Pago"
echo ""

