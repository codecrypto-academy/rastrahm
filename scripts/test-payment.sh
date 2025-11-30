#!/bin/bash
# Script para probar un pago en el PaymentGateway

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Cargar variables de entorno
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
else
    echo -e "${RED}❌ No se encontró el archivo .env${NC}"
    exit 1
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Prueba de Pago en PaymentGateway${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Verificar que Anvil esté corriendo
if ! curl -s http://localhost:8545 > /dev/null 2>&1; then
    echo -e "${RED}❌ Anvil NO está corriendo${NC}"
    exit 1
fi

# Direcciones
PAYER="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"  # Primera cuenta de Anvil
PAYEE="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"  # Segunda cuenta de Anvil
AMOUNT_EUR="10.00"  # 10 EUR
AMOUNT_TOKENS="10000000"  # 10 EURT con 6 decimales

echo -e "${YELLOW}Configuración del pago:${NC}"
echo "  Payer: $PAYER"
echo "  Payee: $PAYEE"
echo "  Amount: $AMOUNT_EUR EUR ($AMOUNT_TOKENS tokens)"
echo ""

# Generar paymentId
TIMESTAMP=$(date +%s)
RANDOM_STR=$(openssl rand -hex 4)
PAYMENT_ID="payment_${PAYER:2:10}_${PAYEE:2:10}_${AMOUNT_EUR}_${TIMESTAMP}_${RANDOM_STR}"

echo -e "${YELLOW}Payment ID generado: ${PAYMENT_ID}${NC}"
echo ""

# Verificar balance del payer
echo -e "${YELLOW}1. Verificando balance del payer...${NC}"
if [ -z "$EURO_TOKEN_ADDRESS" ]; then
    echo -e "${RED}   ❌ EURO_TOKEN_ADDRESS no configurado${NC}"
    exit 1
fi

BALANCE=$(cast call "$EURO_TOKEN_ADDRESS" "balanceOf(address)" "$PAYER" --rpc-url http://localhost:8545 2>&1 | grep -oP '0x[a-fA-F0-9]+' | head -1)
BALANCE_DEC=$(printf "%d" "$BALANCE" 2>/dev/null || echo "0")
BALANCE_EURT=$(echo "scale=2; $BALANCE_DEC / 1000000" | bc 2>/dev/null || echo "0")

if [ "$BALANCE_DEC" -lt "$AMOUNT_TOKENS" ]; then
    echo -e "${RED}   ❌ Balance insuficiente: ${BALANCE_EURT} EURT (necesita ${AMOUNT_EUR} EURT)${NC}"
    echo -e "${YELLOW}   💡 Ejecuta: ./scripts/mint-tokens.sh${NC}"
    exit 1
else
    echo -e "${GREEN}   ✅ Balance: ${BALANCE_EURT} EURT${NC}"
fi
echo ""

# Verificar allowance
echo -e "${YELLOW}2. Verificando allowance...${NC}"
if [ -z "$PAYMENT_GATEWAY_ADDRESS" ]; then
    echo -e "${RED}   ❌ PAYMENT_GATEWAY_ADDRESS no configurado${NC}"
    exit 1
fi

ALLOWANCE=$(cast call "$EURO_TOKEN_ADDRESS" "allowance(address,address)" "$PAYER" "$PAYMENT_GATEWAY_ADDRESS" --rpc-url http://localhost:8545 2>&1 | grep -oP '0x[a-fA-F0-9]+' | head -1)
ALLOWANCE_DEC=$(printf "%d" "$ALLOWANCE" 2>/dev/null || echo "0")

if [ "$ALLOWANCE_DEC" -lt "$AMOUNT_TOKENS" ]; then
    echo -e "${RED}   ❌ Allowance insuficiente${NC}"
    echo -e "${YELLOW}   💡 Ejecuta: ./scripts/approve-tokens.sh${NC}"
    exit 1
else
    echo -e "${GREEN}   ✅ Allowance configurado${NC}"
fi
echo ""

# Verificar si el pago ya fue procesado
echo -e "${YELLOW}3. Verificando si el pago ya fue procesado...${NC}"
IS_PROCESSED=$(cast call "$PAYMENT_GATEWAY_ADDRESS" "isPaymentProcessed(string)" "$PAYMENT_ID" --rpc-url http://localhost:8545 2>&1 | grep -oP '0x[a-fA-F0-9]+' | head -1)
if [ "$IS_PROCESSED" = "0x0000000000000000000000000000000000000000000000000000000000000001" ]; then
    echo -e "${YELLOW}   ⚠️  Este pago ya fue procesado${NC}"
    exit 0
else
    echo -e "${GREEN}   ✅ Pago no procesado, puede continuar${NC}"
fi
echo ""

# Procesar el pago
echo -e "${YELLOW}4. Procesando pago...${NC}"
PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

TX_HASH=$(cast send "$PAYMENT_GATEWAY_ADDRESS" \
    "processPayment(string,address,address,uint256,string)" \
    "$PAYMENT_ID" \
    "$PAYER" \
    "$PAYEE" \
    "$AMOUNT_TOKENS" \
    "" \
    --private-key "$PRIVATE_KEY" \
    --rpc-url http://localhost:8545 \
    --json 2>&1 | jq -r '.transactionHash // .error // .' || echo "")

if [ -z "$TX_HASH" ] || [[ "$TX_HASH" == *"error"* ]] || [[ "$TX_HASH" == *"Error"* ]]; then
    echo -e "${RED}   ❌ Error al procesar el pago: ${TX_HASH}${NC}"
    exit 1
else
    echo -e "${GREEN}   ✅ Transacción enviada: ${TX_HASH}${NC}"
fi
echo ""

# Esperar confirmación
echo -e "${YELLOW}5. Esperando confirmación...${NC}"
sleep 2

# Verificar que el pago fue procesado
IS_PROCESSED_AFTER=$(cast call "$PAYMENT_GATEWAY_ADDRESS" "isPaymentProcessed(string)" "$PAYMENT_ID" --rpc-url http://localhost:8545 2>&1 | grep -oP '0x[a-fA-F0-9]+' | head -1)
if [ "$IS_PROCESSED_AFTER" = "0x0000000000000000000000000000000000000000000000000000000000000001" ]; then
    echo -e "${GREEN}   ✅ Pago procesado correctamente${NC}"
else
    echo -e "${RED}   ❌ El pago no fue procesado${NC}"
    exit 1
fi
echo ""

# Verificar balances después del pago
echo -e "${YELLOW}6. Verificando balances después del pago...${NC}"
PAYER_BALANCE_AFTER=$(cast call "$EURO_TOKEN_ADDRESS" "balanceOf(address)" "$PAYER" --rpc-url http://localhost:8545 2>&1 | grep -oP '0x[a-fA-F0-9]+' | head -1)
PAYEE_BALANCE_AFTER=$(cast call "$EURO_TOKEN_ADDRESS" "balanceOf(address)" "$PAYEE" --rpc-url http://localhost:8545 2>&1 | grep -oP '0x[a-fA-F0-9]+' | head -1)

PAYER_BALANCE_DEC=$(printf "%d" "$PAYER_BALANCE_AFTER" 2>/dev/null || echo "0")
PAYEE_BALANCE_DEC=$(printf "%d" "$PAYEE_BALANCE_AFTER" 2>/dev/null || echo "0")

PAYER_BALANCE_EURT=$(echo "scale=2; $PAYER_BALANCE_DEC / 1000000" | bc 2>/dev/null || echo "0")
PAYEE_BALANCE_EURT=$(echo "scale=2; $PAYEE_BALANCE_DEC / 1000000" | bc 2>/dev/null || echo "0")

echo -e "${BLUE}   Payer balance: ${PAYER_BALANCE_EURT} EURT${NC}"
echo -e "${BLUE}   Payee balance: ${PAYEE_BALANCE_EURT} EURT${NC}"
echo ""

# Verificar pagos en el contrato
echo -e "${YELLOW}7. Verificando pagos en el contrato...${NC}"
TOTAL_PAYMENTS=$(cast call "$PAYMENT_GATEWAY_ADDRESS" "getTotalPayments()" --rpc-url http://localhost:8545 2>&1 | grep -oP '0x[a-fA-F0-9]+' | head -1)
TOTAL_DEC=$(printf "%d" "$TOTAL_PAYMENTS" 2>/dev/null || echo "0")
echo -e "${BLUE}   Total de pagos: ${TOTAL_DEC}${NC}"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ✅ Prueba de pago completada${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Resumen:${NC}"
echo "  Payment ID: $PAYMENT_ID"
echo "  Transaction: $TX_HASH"
echo "  Amount: $AMOUNT_EUR EURT"
echo "  Payer: $PAYER"
echo "  Payee: $PAYEE"
echo ""

