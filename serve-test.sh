#!/bin/bash

# Script para servir el archivo de prueba desde un servidor HTTP local
echo "🚀 Iniciando servidor HTTP local para pruebas del wallet..."
echo ""
echo "📁 Directorio: $(pwd)"
echo "🌐 URL: http://localhost:8000"
echo ""
echo "📋 Archivos disponibles:"
echo "  - test.html (suite completa de pruebas)"
echo "  - test-provider.html (pruebas básicas del provider)"
echo "  - debug-logs.html (visor de logs)"
echo ""
echo "⚠️  IMPORTANTE: Asegúrate de que la extensión esté instalada y activa"
echo "   antes de abrir las URLs en el navegador."
echo ""
echo "🔧 Para detener el servidor, presiona Ctrl+C"
echo ""

# Verificar si Python está disponible
if command -v python3 &> /dev/null; then
    echo "🐍 Usando Python 3..."
    python3 -m http.server 8000
elif command -v python &> /dev/null; then
    echo "🐍 Usando Python 2..."
    python -m SimpleHTTPServer 8000
else
    echo "❌ Error: Python no está instalado"
    echo "   Instala Python para usar este script o usa otro servidor HTTP"
    exit 1
fi
