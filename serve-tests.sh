#!/bin/bash

echo "🌐 Servidor de Pruebas para CodeCrypto Wallet"
echo "=============================================="
echo ""
echo "Iniciando servidor HTTP en http://localhost:8000"
echo ""
echo "📋 Para probar:"
echo "1. Abre http://localhost:8000/test.html en tu navegador"
echo "2. Asegúrate de que la extensión esté instalada y activa"
echo "3. El provider se inyectará automáticamente en la página"
echo ""
echo "🛑 Para detener el servidor: Presiona Ctrl+C"
echo ""
echo "=============================================="
echo ""

# Verificar si Python 3 está disponible
if command -v python3 &> /dev/null; then
    python3 -m http.server 8000
elif command -v python &> /dev/null; then
    python -m http.server 8000
else
    echo "❌ Error: Python no está instalado"
    echo "Instala Python para usar este servidor de pruebas"
    exit 1
fi
