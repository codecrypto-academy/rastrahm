#!/bin/bash

# Script para mantener el background script correcto
echo "🔧 Aplicando background script completo..."

# Copiar el background script completo
cp background-simple.js dist/background.js

# Verificar que se copió correctamente
if grep -q "IMPORT_WALLET" dist/background.js; then
    echo "✅ Background script actualizado correctamente"
    echo "📋 Métodos disponibles:"
    echo "   - PING"
    echo "   - GET_WALLET_STATE"
    echo "   - GENERATE_WALLET"
    echo "   - IMPORT_WALLET"
    echo "   - SWITCH_ACCOUNT"
    echo "   - SEND_TRANSACTION"
else
    echo "❌ Error: Background script no se actualizó correctamente"
    exit 1
fi

echo "🚀 Listo para probar la extensión"
