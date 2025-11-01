#!/bin/bash

echo "🔍 Verificando background script..."

# Verificar que el archivo existe
if [ ! -f "dist/background.js" ]; then
    echo "❌ Error: dist/background.js no existe"
    exit 1
fi

# Verificar que contiene los métodos necesarios
echo "📋 Verificando métodos del background script..."

if grep -q "IMPORT_ACCOUNT" dist/background.js; then
    echo "✅ IMPORT_ACCOUNT encontrado"
else
    echo "❌ IMPORT_ACCOUNT no encontrado"
fi

if grep -q "SEND_TRANSACTION" dist/background.js; then
    echo "✅ SEND_TRANSACTION encontrado"
else
    echo "❌ SEND_TRANSACTION no encontrado"
fi

if grep -q "GET_LOGS" dist/background.js; then
    echo "✅ GET_LOGS encontrado"
else
    echo "❌ GET_LOGS no encontrado"
fi

if grep -q "anvil_impersonateAccount" dist/background.js; then
    echo "✅ anvil_impersonateAccount encontrado"
else
    echo "❌ anvil_impersonateAccount no encontrado"
fi

if grep -q "updateAccountBalances" dist/background.js; then
    echo "✅ updateAccountBalances encontrado"
else
    echo "❌ updateAccountBalances no encontrado"
fi

echo ""
echo "🎯 Background script verificado correctamente"
echo "📝 Instrucciones:"
echo "1. Recarga la extensión en Chrome"
echo "2. Abre la consola del background script"
echo "3. Deberías ver: 'Background script iniciado'"
echo "4. Prueba las funcionalidades"
