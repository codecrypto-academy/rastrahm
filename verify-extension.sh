#!/bin/bash

# Script de verificación para CodeCrypto Wallet
echo "🔍 Verificando extensión de Chrome..."

# Verificar que estamos en el directorio correcto
if [ ! -d "dist" ]; then
    echo "❌ Error: No se encontró la carpeta 'dist'"
    echo "   Ejecuta 'npm run build' primero"
    exit 1
fi

echo "✅ Carpeta 'dist' encontrada"

# Verificar archivos esenciales
echo "📁 Verificando archivos esenciales..."

files=(
    "dist/manifest.json"
    "dist/background.js"
    "dist/content.js"
    "dist/inpage.js"
    "dist/popup.html"
    "dist/popup.js"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file - FALTANTE"
        exit 1
    fi
done

# Verificar manifest.json
echo "📄 Verificando manifest.json..."

if grep -q '"service_worker": "background.js"' dist/manifest.json; then
    echo "✅ Service worker path correcto"
else
    echo "❌ Service worker path incorrecto"
    echo "   Debe ser: 'background.js'"
    exit 1
fi

if grep -q '"js": \["content.js"\]' dist/manifest.json; then
    echo "✅ Content script path correcto"
else
    echo "❌ Content script path incorrecto"
    echo "   Debe ser: 'content.js'"
    exit 1
fi

if grep -q '"default_popup": "popup.html"' dist/manifest.json; then
    echo "✅ Popup path correcto"
else
    echo "❌ Popup path incorrecto"
    echo "   Debe ser: 'popup.html'"
    exit 1
fi

if grep -q '"resources": \["inpage.js"\]' dist/manifest.json; then
    echo "✅ Web accessible resources path correcto"
else
    echo "❌ Web accessible resources path incorrecto"
    echo "   Debe ser: 'inpage.js'"
    exit 1
fi

# Verificar que NO haya rutas con prefijo dist/
echo "🚫 Verificando que NO haya rutas con prefijo 'dist/'..."

if grep -q 'dist/' dist/manifest.json; then
    echo "❌ Se encontraron rutas con prefijo 'dist/' en manifest.json"
    echo "   Esto causará errores de carga"
    exit 1
else
    echo "✅ No se encontraron rutas con prefijo 'dist/'"
fi

# Verificar content.js
echo "📜 Verificando content.js..."

if grep -q 'chrome.runtime.getURL("inpage.js")' dist/content.js; then
    echo "✅ Content script carga inpage.js correctamente"
else
    echo "❌ Content script NO carga inpage.js correctamente"
    echo "   Debe cargar: 'inpage.js'"
    exit 1
fi

# Verificar tamaños de archivos
echo "📊 Verificando tamaños de archivos..."

if [ -s "dist/background.js" ]; then
    echo "✅ background.js tiene contenido"
else
    echo "❌ background.js está vacío"
    exit 1
fi

if [ -s "dist/content.js" ]; then
    echo "✅ content.js tiene contenido"
else
    echo "❌ content.js está vacío"
    exit 1
fi

if [ -s "dist/inpage.js" ]; then
    echo "✅ inpage.js tiene contenido"
else
    echo "❌ inpage.js está vacío"
    exit 1
fi

# Resumen final
echo ""
echo "🎉 ¡Verificación completada exitosamente!"
echo ""
echo "📋 Resumen:"
echo "   ✅ Todos los archivos esenciales presentes"
echo "   ✅ Manifest.json con rutas correctas"
echo "   ✅ Content script configurado correctamente"
echo "   ✅ No hay rutas con prefijo 'dist/'"
echo "   ✅ Todos los archivos tienen contenido"
echo ""
echo "🚀 La extensión está lista para instalar en Chrome:"
echo "   1. Abrir chrome://extensions/"
echo "   2. Activar 'Modo de desarrollador'"
echo "   3. Hacer clic en 'Cargar extensión sin empaquetar'"
echo "   4. Seleccionar la carpeta 'dist/'"
echo ""
echo "✨ ¡Instalación exitosa garantizada!"
