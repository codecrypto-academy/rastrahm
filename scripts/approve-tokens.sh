#!/bin/bash
# Script para aprobar tokens al PaymentGateway

echo "✅ Approving EURT tokens to PaymentGateway..."
echo ""

# Obtener direcciones
EURO_TOKEN=$(grep "^EURO_TOKEN_ADDRESS=" .env 2>/dev/null | cut -d'=' -f2)
PAYMENT_GATEWAY=$(grep "^PAYMENT_GATEWAY_ADDRESS=" .env 2>/dev/null | cut -d'=' -f2)
PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
ACCOUNT="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"

if [ -z "$EURO_TOKEN" ] || [ -z "$PAYMENT_GATEWAY" ]; then
    echo "❌ No se encontraron las direcciones en .env"
    exit 1
fi

echo "📍 EuroToken: $EURO_TOKEN"
echo "📍 PaymentGateway: $PAYMENT_GATEWAY"
echo "📍 Account: $ACCOUNT"
echo ""

# Aprobar una cantidad grande (max uint256)
APPROVE_AMOUNT="0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"

echo "💰 Approving max amount to PaymentGateway..."
echo ""

# Aprobar usando cast
cast send "$EURO_TOKEN" \
    "approve(address,uint256)" \
    "$PAYMENT_GATEWAY" \
    "$APPROVE_AMOUNT" \
    --private-key "$PRIVATE_KEY" \
    --rpc-url http://localhost:8545 \
    --json 2>&1 | jq -r '.transactionHash // .error // .' || echo "Error al aprobar"

echo ""
echo "🔍 Verificando allowance..."
ALLOWANCE=$(cast call "$EURO_TOKEN" "allowance(address,address)" "$ACCOUNT" "$PAYMENT_GATEWAY" --rpc-url http://localhost:8545 2>&1 | grep -oP '0x[a-fA-F0-9]+' | head -1)

if [ -n "$ALLOWANCE" ] && [ "$ALLOWANCE" != "0x0" ] && [ "$ALLOWANCE" != "0x" ]; then
    echo "✅ Allowance configurado correctamente"
else
    echo "❌ Error: Allowance sigue siendo 0"
fi

echo ""

