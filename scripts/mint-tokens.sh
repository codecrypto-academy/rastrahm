#!/bin/bash
# Script para hacer mint de tokens EURT a las cuentas de Anvil

echo "🪙 Minting EURT tokens to Anvil accounts..."
echo ""

# Obtener direcciones
EURO_TOKEN=$(grep "^EURO_TOKEN_ADDRESS=" .env 2>/dev/null | cut -d'=' -f2)
PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
ACCOUNT="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"

if [ -z "$EURO_TOKEN" ]; then
    echo "❌ No se encontró EURO_TOKEN_ADDRESS en .env"
    exit 1
fi

echo "📍 EuroToken: $EURO_TOKEN"
echo "📍 Account: $ACCOUNT"
echo ""

# Cantidad a mintear: 10000 EURT (10000 * 10^6 = 10000000000)
AMOUNT="10000000000"  # 10000 EURT con 6 decimales

echo "💰 Minting $AMOUNT units (10000 EURT) to $ACCOUNT..."
echo ""

# Hacer mint usando cast
cast send "$EURO_TOKEN" \
    "mint(address,uint256)" \
    "$ACCOUNT" \
    "$AMOUNT" \
    --private-key "$PRIVATE_KEY" \
    --rpc-url http://localhost:8545 \
    --json 2>&1 | jq -r '.transactionHash // .error // .' || echo "Error al hacer mint"

echo ""
echo "🔍 Verificando balance..."
BALANCE=$(cast call "$EURO_TOKEN" "balanceOf(address)" "$ACCOUNT" --rpc-url http://localhost:8545 2>&1 | grep -oP '0x[a-fA-F0-9]+' | head -1)

if [ -n "$BALANCE" ] && [ "$BALANCE" != "0x0" ] && [ "$BALANCE" != "0x" ]; then
    # Convertir de hex a decimal y dividir por 10^6
    BALANCE_DEC=$(printf "%d" "$BALANCE" 2>/dev/null || echo "0")
    BALANCE_EURT=$(echo "scale=2; $BALANCE_DEC / 1000000" | bc 2>/dev/null || echo "0")
    echo "✅ Balance actual: $BALANCE_EURT EURT"
else
    echo "❌ Error: Balance sigue siendo 0"
fi

echo ""
echo "💡 Para agregar el token en MetaMask:"
echo "   1. Abre MetaMask"
echo "   2. Ve a 'Import tokens'"
echo "   3. Pega esta dirección: $EURO_TOKEN"
echo "   4. Symbol: EURT"
echo "   5. Decimals: 6"
echo ""

