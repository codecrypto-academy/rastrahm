#!/bin/bash
# Script para verificar pagos en el contrato PaymentGateway

echo "🔍 Verificando pagos en PaymentGateway..."
echo ""

# Obtener dirección del contrato
GATEWAY_ADDRESS=$(grep "^NEXT_PUBLIC_PAYMENT_GATEWAY_ADDRESS=" stablecoin/pasarela-de-pago/app/.env.local 2>/dev/null | cut -d'=' -f2)

if [ -z "$GATEWAY_ADDRESS" ]; then
    echo "❌ No se encontró NEXT_PUBLIC_PAYMENT_GATEWAY_ADDRESS en .env.local"
    exit 1
fi

echo "📍 PaymentGateway Address: $GATEWAY_ADDRESS"
echo ""

# Si se proporciona una dirección, verificar pagos de esa dirección
if [ -n "$1" ]; then
    ADDRESS="$1"
    echo "🔍 Verificando pagos para: $ADDRESS"
    echo ""
    
    # Normalizar dirección a checksummed
    NORMALIZED=$(cast --to-checksum-address "$ADDRESS" 2>/dev/null || echo "$ADDRESS")
    echo "📍 Dirección normalizada: $NORMALIZED"
    echo ""
    
    echo "📤 Pagos enviados (getPayerPayments):"
    cast call "$GATEWAY_ADDRESS" "getPayerPayments(address)" "$NORMALIZED" --rpc-url http://localhost:8545 2>&1 | head -20
    
    echo ""
    echo "📥 Pagos recibidos (getPayeePayments):"
    cast call "$GATEWAY_ADDRESS" "getPayeePayments(address)" "$NORMALIZED" --rpc-url http://localhost:8545 2>&1 | head -20
else
    echo "💡 Uso: $0 <dirección_ethereum>"
    echo "   Ejemplo: $0 0x1234567890123456789012345678901234567890"
    echo ""
    echo "📊 Total de pagos en el contrato:"
    cast call "$GATEWAY_ADDRESS" "getTotalPayments()" --rpc-url http://localhost:8545 2>&1
fi
